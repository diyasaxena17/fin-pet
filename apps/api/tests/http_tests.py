"""Real HTTP/process restart tests. Python stdlib only; never use real user data."""
import concurrent.futures
import json
import os
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


if __name__ == '__main__':
    unittest.main(verbosity=2)
