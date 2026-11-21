"""Real HTTP/process restart tests. Python stdlib only; never use real user data."""
import concurrent.futures
import json
import os
import select
from pathlib import Path
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request
import uuid

BINARY = str(Path(sys.argv.pop(1)).resolve())
ONBOARD = {'petName': 'Mochi', 'goalTitle': 'Emergency fund', 'goalTarget': 200,
           'letter': {'vision': '  A secure future.\n', 'why': 'More choices.', 'reminder': 'Small steps count.'}}


def request_id():
    return str(uuid.uuid4())


class Server:
    def __init__(self, db_path, demo=True, device=False):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            self.port = sock.getsockname()[1]
        self.base = f'http://127.0.0.1:{self.port}'
        self.log = tempfile.TemporaryFile()
        self.process = subprocess.Popen([BINARY], stdout=self.log, stderr=self.log, env={
            **os.environ, 'DB_PATH': str(db_path), 'API_HOST': '127.0.0.1', 'PORT': str(self.port),
            'DEMO_MODE': str(demo).lower(), 'ENABLE_DEVICE_API': str(device).lower(),
            'DEMO_TIME_ZONE': 'America/Toronto'})
        for _ in range(100):
            if self.process.poll() is not None:
                self.log.seek(0)
                raise RuntimeError(self.log.read().decode())
            try:
                self.call('GET', '/health')
                return
            except OSError:
                time.sleep(.03)
        self.close()
        raise RuntimeError('API startup timed out')

    def call(self, method, path, payload=None, status=200, raw=None, content_type='application/json'):
        data = raw if raw is not None else (json.dumps(payload).encode() if payload is not None else None)
        req = urllib.request.Request(self.base + path, data=data, method=method,
                                     headers={'Content-Type': content_type})
        try:
            response = urllib.request.urlopen(req, timeout=5)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            body = json.loads(response.read())
            assert response.status == status, (method, path, response.status, body)
            assert response.headers['Cache-Control'] == 'no-store', response.headers
            assert response.headers.get_content_type() == 'application/json'
            return body

    def close(self):
        if self.process.poll() is None:
            self.process.terminate()
            self.process.wait(timeout=5)
        self.log.close()


class HttpTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix='mochi-http-')
        self.db = Path(self.directory.name) / 'nested/state.sqlite3'
        self.server = Server(self.db)

    def tearDown(self):
        self.server.close()
        self.directory.cleanup()

    def restart(self, demo=True, device=False):
        self.server.close()
        self.server = Server(self.db, demo, device)

    def test_economy_and_restart(self):
        api = self.server.call
        self.assertEqual(api('GET', '/health'), {'ok': True})
        self.assertEqual(api('GET', '/api/state'), {'initialized': False})
        api('POST', '/api/savings', {'requestId': request_id(), 'amount': 50}, 404)
        state = api('POST', '/api/onboarding', ONBOARD)
        self.assertEqual(set(state), {'initialized', 'pet', 'wallet', 'goal', 'letter', 'unlockedFeatures', 'quest', 'demoSeeded'})
        api('POST', '/api/onboarding', ONBOARD, 409)
        decision = {'requestId': request_id(), 'itemName': 'Hoodie', 'amount': 60, 'decision': 'skip'}
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            list(pool.map(lambda _: api('POST', '/api/decisions', decision), range(5)))
        savings = {'requestId': request_id(), 'amount': 50}
        state = api('POST', '/api/savings', savings)
        self.assertEqual(state['wallet'], {'coins': 60, 'xp': 50, 'level': 1, 'nextLevelXp': 100})
        self.assertEqual(state['goal']['potentialSavings'], 60)
        self.assertEqual(state['goal']['confirmedSaved'], 50)
        self.assertEqual(state['goal']['progressPercent'], 25)
        self.assertEqual(state['letter'], {**ONBOARD['letter'], 'revealedSections': 1})
        self.assertEqual(api('POST', '/api/decisions', decision), state)
        self.restart()
        api = self.server.call
        self.assertEqual(api('GET', '/api/state'), state)
        self.assertEqual(api('POST', '/api/savings', savings), state)
        self.assertEqual(api('POST', '/api/decisions', decision), state)
        with sqlite3.connect(self.db) as db:
            stored = json.loads(db.execute('SELECT payload FROM app_state').fetchone()[0])
            self.assertEqual(stored['account']['savedCents'], 5000)
            self.assertEqual(db.execute('SELECT count(*) FROM processed_requests').fetchone()[0], 2)
            decision_row = json.loads(db.execute('SELECT payload FROM decisions').fetchone()[0])
            self.assertEqual(decision_row['amountCents'], 6000)
            self.assertNotIn('amount', decision_row)

    def test_validation_is_atomic(self):
        api = self.server.call
        api('POST', '/api/onboarding', ONBOARD)
        before = api('GET', '/api/state')
        for amount in [None, True, '50', -1, 0, .001, 10.999, 1000000000.01]:
            body = api('POST', '/api/savings', {'requestId': request_id(), 'amount': amount}, 400)
            self.assertEqual(body['error']['code'], 'INVALID_REQUEST')
        for payload in [{}, [], None, {'requestId': 'bad', 'amount': 50},
                        {'requestId': request_id(), 'amount': 50, 'extra': True}]:
            api('POST', '/api/savings', payload, 400, raw=b'null' if payload is None else None)
        for raw in [b'{', b'{"amount":NaN}', b'[]', b'[' * 200 + b']' * 200, b' ' * 70000]:
            api('POST', '/api/savings', status=400, raw=raw)
        api('POST', '/api/savings', {'requestId': request_id(), 'amount': 50}, 400, content_type='text/plain')
        self.assertEqual(api('GET', '/api/state'), before)
        for route in ['/api/onboard', '/api/pet/feed', '/missing']:
            api('POST', route, {}, 404)
        api('GET', '/api/device/state', status=404)

    def test_concurrent_savings(self):
        api = self.server.call
        api('POST', '/api/onboarding', ONBOARD)
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
            list(pool.map(lambda _: api('POST', '/api/savings', {'requestId': request_id(), 'amount': .1}), range(10)))
        state = api('GET', '/api/state')
        self.assertEqual(state['goal']['confirmedSaved'], 1)
        self.assertEqual(state['wallet']['xp'], 300)
        self.assertEqual(state['wallet']['level'], 3)

    def test_feeding_hardware_and_restart(self):
        self.restart(device=True)
        api = self.server.call
        api('GET', '/api/device/state', status=404)
        api('POST', '/api/onboarding', ONBOARD)
        feed = {'requestId': request_id(), 'petId': 'mochi-01'}
        before = api('GET', '/api/state')
        failure = api('POST', '/api/feed', feed, 409)
        self.assertEqual(failure['error']['code'], 'INSUFFICIENT_COINS')
        self.assertEqual(api('GET', '/api/state'), before)
        decision = {'requestId': request_id(), 'itemName': 'Hoodie', 'amount': 60, 'decision': 'skip'}
        savings = {'requestId': request_id(), 'amount': 50}
        api('POST', '/api/decisions', decision)
        api('POST', '/api/savings', savings)
        baseline = api('GET', '/api/device/state')
        self.assertEqual(baseline['reactionSeq'], 0)
        # Opening/refreshing a tap screen can only GET state; it never spends.
        for _ in range(3):
            api('GET', '/api/state')
            self.assertEqual(api('GET', '/api/device/state'), baseline)
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            results = list(pool.map(lambda _: api('POST', '/api/feed', feed), range(5)))
        state = results[0]
        self.assertEqual(state['wallet']['coins'], 40)
        self.assertEqual(state['wallet']['xp'], 50)
        self.assertEqual(state['pet']['hunger'], 80)
        device = api('GET', '/api/device/state')
        self.assertEqual(device, {'petId': 'mochi-01', 'hunger': 80, 'mood': 'happy', 'reactionSeq': 1, 'reactionType': 'feed'})
        self.assertEqual(set(state['pet']), {'id', 'name', 'hunger', 'mood'})
        self.restart(device=True)
        api = self.server.call
        for path, payload in [('/api/feed', feed), ('/api/decisions', decision), ('/api/savings', savings)]:
            self.assertEqual(api('POST', path, payload), state)
        self.assertEqual(api('GET', '/api/device/state'), device)
        api('POST', '/api/device/gesture', {'gesture': 'open_palm'})
        greeting = api('GET', '/api/device/state')
        self.assertEqual(greeting['reactionSeq'], 2)
        self.assertEqual(greeting['reactionType'], 'greeting')
        self.assertEqual(api('POST', '/api/device/gesture', {'gesture': 'open_palm'}), greeting)
        self.assertEqual(api('GET', '/api/state'), state)
        api('POST', '/api/device/gesture', {'gesture': 'closed_fist'}, 400)

    def test_quests_demo_reset_and_disabled_routes(self):
        api = self.server.call
        api('POST', '/api/onboarding', ONBOARD)
        quest = {'requestId': request_id(), 'questId': 'daily-check-in'}
        api('POST', '/api/quests/complete', quest, 409)
        level2 = api('POST', '/api/demo/seed', {'xp': 100})
        self.assertTrue(level2['demoSeeded'])
        self.assertIn('dailyQuest', level2['unlockedFeatures'])
        self.assertTrue(level2['quest']['available'])
        state = api('POST', '/api/quests/complete', quest)
        self.assertEqual(state['wallet']['xp'], 120)
        self.assertEqual(state['wallet']['coins'], 10)
        self.assertTrue(state['quest']['completedToday'])
        self.assertFalse(state['quest']['available'])
        self.assertEqual(api('POST', '/api/quests/complete', {**quest, 'requestId': request_id()}), state)
        self.restart()
        api = self.server.call
        self.assertEqual(api('POST', '/api/quests/complete', quest), state)
        for amount, sections in [(50, 1), (100, 2), (200, 3), (300, 3)]:
            state = api('POST', '/api/demo/seed', {'xp': 250, 'confirmedSaved': amount})
            self.assertEqual(state['letter']['revealedSections'], sections)
            self.assertIn('expandedProjection', state['unlockedFeatures'])
        api('POST', '/api/demo/seed', {'xp': 300}, 400)
        self.assertEqual(api('POST', '/api/demo/reset', {}), {'initialized': False})
        self.restart(demo=False)
        api = self.server.call
        self.assertEqual(api('GET', '/api/state'), {'initialized': False})
        for path in ['/api/demo/seed', '/api/demo/reset', '/api/device/gesture']:
            api('POST', path, {}, 404)
        api('GET', '/api/device/state', status=404)
        api('POST', '/api/onboarding', ONBOARD)
        # Reset erased the ID history; the previous failed quest ID can earn savings.
        state = api('POST', '/api/savings', {'requestId': quest['requestId'], 'amount': 1})
        self.assertEqual(state['wallet']['xp'], 30)

    def test_sqlite_write_failure_rolls_back_and_id_is_reusable(self):
        api = self.server.call
        api('POST', '/api/onboarding', ONBOARD)
        before = api('GET', '/api/state')
        decision = {'requestId': request_id(), 'itemName': 'Hoodie', 'amount': 60, 'decision': 'skip'}
        with sqlite3.connect(self.db) as db:
            db.execute("CREATE TRIGGER fail_request BEFORE INSERT ON processed_requests BEGIN SELECT RAISE(FAIL, 'injected write failure'); END")
        failed = api('POST', '/api/decisions', decision, 500)
        self.assertEqual(failed['error']['code'], 'INTERNAL_ERROR')
        self.assertEqual(api('GET', '/api/state'), before)
        with sqlite3.connect(self.db) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM processed_requests').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT count(*) FROM decisions').fetchone()[0], 0)
            db.execute('DROP TRIGGER fail_request')
        state = api('POST', '/api/decisions', decision)
        self.assertEqual(state['wallet']['coins'], 60)

    def test_corrupt_state_fails_startup_without_overwriting(self):
        self.server.close()
        with sqlite3.connect(self.db) as db:
            db.execute("UPDATE app_state SET payload='{corrupt'")
        result = subprocess.run([BINARY], env={**os.environ, 'DB_PATH': str(self.db)}, capture_output=True, timeout=5)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(b'Mochi startup failed', result.stderr)
        with sqlite3.connect(self.db) as db:
            self.assertEqual(db.execute('SELECT payload FROM app_state').fetchone()[0], '{corrupt')

    def test_missing_state_and_unknown_database_versions_fail_startup(self):
        self.server.close()
        with sqlite3.connect(self.db) as db:
            db.execute('DELETE FROM app_state')
        for version in [1, 2]:
            with sqlite3.connect(self.db) as db:
                db.execute(f'PRAGMA user_version={version}')
            result = subprocess.run([BINARY], env={**os.environ, 'DB_PATH': str(self.db)}, capture_output=True, timeout=5)
            self.assertNotEqual(result.returncode, 0)
            with sqlite3.connect(self.db) as db:
                self.assertEqual(db.execute('SELECT count(*) FROM app_state').fetchone()[0], 0)

    def test_example_pi_poller_emits_feed_once(self):
        self.restart(device=True)
        api = self.server.call
        api('POST', '/api/onboarding', ONBOARD)
        api('POST', '/api/demo/seed', {'coins': 20})
        poller_path = Path(__file__).resolve().parents[1] / 'examples/poll_device.py'
        poller = subprocess.Popen([sys.executable, str(poller_path), self.server.base],
                                  stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            time.sleep(1.2)  # Let the example take its initial baseline without an event.
            self.assertIsNone(poller.poll())
            self.assertFalse(select.select([poller.stdout], [], [], 0)[0])
            feed = {'requestId': request_id(), 'petId': 'mochi-01'}
            api('POST', '/api/feed', feed)
            self.assertTrue(select.select([poller.stdout], [], [], 3)[0])
            reaction = json.loads(poller.stdout.readline())
            self.assertEqual(reaction['reactionSeq'], 1)
            self.assertEqual(reaction['reactionType'], 'feed')
            api('POST', '/api/feed', feed)
            self.assertFalse(select.select([poller.stdout], [], [], 1.2)[0])
        finally:
            poller.terminate()
            poller.communicate(timeout=5)


if __name__ == '__main__':
    unittest.main(verbosity=2)
