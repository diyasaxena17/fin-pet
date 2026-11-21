"""Real HTTP/process restart tests. Python stdlib only; never use real user data."""
from datetime import datetime, timedelta, timezone
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
    def __init__(self, db_path, demo=True, device=False, port=None):
        if port is None:
            with socket.socket() as sock:
                sock.bind(('127.0.0.1', 0))
                port = sock.getsockname()[1]
        self.port = port
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
        self.assertEqual(set(state), {'initialized', 'pet', 'wallet', 'goal', 'letter', 'unlockedFeatures', 'quest', 'demoSeeded', 'forest', 'preferences', 'budgetSummary', 'today'})
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

    def test_v1_migration_preserves_letter_ids_decisions_and_reactions(self):
        self.restart(device=True)
        api = self.server.call
        api('POST', '/api/onboarding', ONBOARD)
        decision = {'requestId': request_id(), 'itemName': 'Hoodie', 'amount': 60, 'decision': 'skip'}
        api('POST', '/api/decisions', decision)
        api('POST', '/api/savings', {'requestId': request_id(), 'amount': 50})
        feed = {'requestId': request_id(), 'petId': 'mochi-01'}
        before = api('POST', '/api/feed', feed)
        device = api('GET', '/api/device/state')
        self.server.close()
        with sqlite3.connect(self.db) as db:
            stored = json.loads(db.execute('SELECT payload FROM app_state').fetchone()[0])
            del stored['finance']  # Exact original v1 storage keys.
            db.execute('UPDATE app_state SET payload=?', (json.dumps(stored),))
            db.execute('PRAGMA user_version=1')
            history = db.execute('SELECT * FROM processed_requests ORDER BY request_id').fetchall()
            decisions = db.execute('SELECT * FROM decisions').fetchall()
        self.server = Server(self.db, device=True)
        api = self.server.call
        self.assertEqual(api('GET', '/api/state'), before)
        self.assertEqual(api('GET', '/api/device/state'), device)
        self.assertEqual(api('POST', '/api/feed', feed), before)
        self.assertEqual(api('POST', '/api/decisions', decision), before)
        self.assertEqual(api('GET', '/api/state')['letter']['vision'], ONBOARD['letter']['vision'])
        with sqlite3.connect(self.db) as db:
            self.assertEqual(db.execute('PRAGMA user_version').fetchone()[0], 2)
            self.assertEqual(db.execute('SELECT * FROM processed_requests ORDER BY request_id').fetchall(), history)
            self.assertEqual(db.execute('SELECT * FROM decisions').fetchall(), decisions)
        self.restart(device=True)
        self.assertEqual(self.server.call('GET', '/api/state'), before)

    def test_v1_migration_failure_rolls_back_schema_payload_and_history(self):
        api = self.server.call
        api('POST', '/api/onboarding', ONBOARD)
        savings = {'requestId': request_id(), 'amount': 50}
        before = api('POST', '/api/savings', savings)
        self.server.close()
        with sqlite3.connect(self.db) as db:
            legacy = json.loads(db.execute('SELECT payload FROM app_state').fetchone()[0])
            del legacy['finance']
            payload = json.dumps(legacy)
            db.execute('UPDATE app_state SET payload=?', (payload,))
            db.execute('PRAGMA user_version=1')
            history = db.execute('SELECT * FROM processed_requests').fetchall()
            db.execute("CREATE TRIGGER fail_upgrade BEFORE UPDATE ON app_state BEGIN SELECT RAISE(FAIL, 'migration failure'); END")
        result = subprocess.run([BINARY], env={**os.environ, 'DB_PATH': str(self.db)}, capture_output=True, timeout=5)
        self.assertNotEqual(result.returncode, 0)
        with sqlite3.connect(self.db) as db:
            self.assertEqual(db.execute('PRAGMA user_version').fetchone()[0], 1)
            self.assertEqual(db.execute('SELECT payload FROM app_state').fetchone()[0], payload)
            self.assertEqual(db.execute('SELECT * FROM processed_requests').fetchall(), history)
            db.execute('DROP TRIGGER fail_upgrade')
        self.server = Server(self.db)
        self.assertEqual(self.server.call('GET', '/api/state'), before)
        self.assertEqual(self.server.call('POST', '/api/savings', savings), before)

    def test_unknown_schema_preserves_an_existing_account(self):
        self.server.call('POST', '/api/onboarding', ONBOARD)
        self.server.close()
        with sqlite3.connect(self.db) as db:
            payload = db.execute('SELECT payload FROM app_state').fetchone()[0]
            db.execute('PRAGMA user_version=999')
        result = subprocess.run([BINARY], env={**os.environ, 'DB_PATH': str(self.db)}, capture_output=True, timeout=5)
        self.assertNotEqual(result.returncode, 0)
        with sqlite3.connect(self.db) as db:
            self.assertEqual(db.execute('PRAGMA user_version').fetchone()[0], 999)
            self.assertEqual(db.execute('SELECT payload FROM app_state').fetchone()[0], payload)

    def test_preferences_budgets_transactions_and_retry_conflicts(self):
        api = self.server.call
        api('PUT', '/api/preferences', {'voice': 'calm'}, 404)
        before = api('POST', '/api/onboarding', ONBOARD)
        self.assertIsNone(before['budgetSummary']['monthlyLimit'])
        preferences = api('PUT', '/api/preferences', {'voice': 'calm'})
        self.assertEqual(preferences['preferences'], {'voice': 'calm'})
        api('PUT', '/api/preferences', {'voice': 'loud'}, 400)
        budget = api('PUT', '/api/budgets', {'month': '2026-11', 'monthlyLimit': 10, 'dailyLimit': 25, 'categoryLimits': {'food': 5}})
        self.assertEqual(budget['spentThisMonth'], 0)
        transaction = {'requestId': request_id(), 'name': '  Takeout  ', 'amount': 18.29,
                       'category': 'food', 'occurredAt': '2026-11-19T19:30:00-05:00'}
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            results = list(pool.map(lambda _: api('POST', '/api/transactions', transaction), range(5)))
        self.assertTrue(all(result == results[0] for result in results))
        result = results[0]
        self.assertEqual(result['transaction']['source'], 'manual')
        self.assertFalse(result['transaction']['planned'])
        self.assertEqual(result['transaction']['name'], 'Takeout')
        self.assertEqual(result['budget']['remainingThisMonth'], -8.29)
        state = api('GET', '/api/state')
        self.assertEqual(state['goal'], before['goal'])
        self.assertEqual(state['letter'], before['letter'])
        self.assertEqual(state['wallet'], before['wallet'])
        api('POST', '/api/transactions', {**transaction, 'amount': 1}, 409)
        conflict = api('POST', '/api/savings', {'requestId': transaction['requestId'], 'amount': 1}, 409)
        self.assertEqual(conflict['error']['code'], 'REQUEST_ID_CONFLICT')
        offset = {**transaction, 'requestId': request_id(), 'amount': .29, 'occurredAt': '2026-11-01T01:00:00+14:00'}
        result = api('POST', '/api/transactions', offset)
        self.assertEqual(result['budget']['month'], '2026-10')
        self.assertEqual(api('GET', '/api/budgets?month=2026-10')['spentThisMonth'], .29)
        self.assertEqual(len(api('GET', '/api/transactions?month=2026-11')['transactions']), 1)
        for query in ['', '?month=2026-13', '?month=2026-11&month=2026-10', '?month=2026-11&extra=1']:
            api('GET', '/api/budgets' + query, status=400)
        for changed in [{'amount': .001}, {'source': 'bank-connected'}, {'occurredAt': '2026-02-30T12:00:00Z'},
                        {'occurredAt': '2099-01-01T00:00:00Z'}, {'category': 'unknown'}, {'planned': 'false'}]:
            api('POST', '/api/transactions', {**transaction, 'requestId': request_id(), **changed}, 400)
        api('PUT', '/api/budgets', {'month': '2026-11', 'monthlyLimit': 0}, 400)
        cleared = api('PUT', '/api/budgets', {'month': '2026-11', 'monthlyLimit': 500})
        self.assertIsNone(cleared['dailyLimit'])
        self.assertTrue(all(category['limit'] is None for category in cleared['categories']))
        with sqlite3.connect(self.db) as db:
            stored = json.loads(db.execute('SELECT payload FROM app_state').fetchone()[0])
            self.assertEqual(stored['finance']['transactions'][0]['amountCents'], 1829)
            self.assertNotIn('amount', stored['finance']['transactions'][0])
        self.restart()
        api = self.server.call
        self.assertEqual(api('GET', '/api/state')['preferences'], {'voice': 'calm'})
        self.assertEqual(api('POST', '/api/transactions', transaction)['transaction'], results[0]['transaction'])
        self.assertEqual(len(api('GET', '/api/transactions?month=2026-11')['transactions']), 1)

    def test_insights_and_reflections_are_observed_reward_free_and_persistent(self):
        self.restart(device=True)
        api = self.server.call
        api('GET', '/api/insights', status=404)
        api('POST', '/api/onboarding', ONBOARD)
        self.assertEqual(api('GET', '/api/insights'), {'insights': []})
        old = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(timespec='milliseconds')
        rows = []
        for _ in range(3):
            rows.append(api('POST', '/api/transactions', {'requestId': request_id(), 'name': 'Takeout', 'amount': 18,
                            'category': 'food', 'occurredAt': old})['transaction'])
        recent = api('POST', '/api/transactions', {'requestId': request_id(), 'name': 'Book', 'amount': 1,
                     'category': 'other', 'occurredAt': datetime.now(timezone.utc).isoformat(timespec='milliseconds')})['transaction']
        before = api('GET', '/api/state')
        device = api('GET', '/api/device/state')
        insight = api('GET', '/api/insights')['insights'][0]
        self.assertEqual(insight['evidence'], {'count': 3, 'windowDays': 7, 'totalAmount': 54})
        self.assertEqual(insight['source'], 'manual')
        self.assertEqual(len(api('GET', '/api/reflections/due')['transactions']), 3)
        self.assertEqual(api('GET', '/api/state'), before)
        self.assertEqual(api('GET', '/api/device/state'), device)
        reflection = {'requestId': request_id(), 'transactionId': recent['id'], 'verdict': 'unsure'}
        failure = api('POST', '/api/reflections', reflection, 409)
        self.assertEqual(failure['error']['code'], 'REFLECTION_NOT_DUE')
        reflection['transactionId'] = rows[0]['id']  # Failed ID was not consumed.
        with sqlite3.connect(self.db) as db:
            db.execute("CREATE TRIGGER fail_reflection BEFORE INSERT ON processed_requests BEGIN SELECT RAISE(FAIL, 'write failure'); END")
        api('POST', '/api/reflections', reflection, 500)
        self.assertEqual(len(api('GET', '/api/reflections/due')['transactions']), 3)
        with sqlite3.connect(self.db) as db:
            db.execute('DROP TRIGGER fail_reflection')
        result = api('POST', '/api/reflections', reflection)
        self.assertEqual(result['state'], before)
        self.assertEqual(result['transaction']['reflection']['verdict'], 'unsure')
        self.assertEqual(api('POST', '/api/reflections', reflection), result)
        self.assertEqual(api('POST', '/api/reflections', {**reflection, 'requestId': request_id()}), result)
        self.assertEqual(len(api('GET', '/api/reflections/due')['transactions']), 2)
        api('POST', '/api/reflections', {**reflection, 'requestId': request_id(), 'verdict': 'worth_it'}, 409)
        api('POST', '/api/reflections', {**reflection, 'requestId': request_id(), 'transactionId': 'missing'}, 404)
        api('GET', '/api/insights?extra=1', status=400)
        self.restart(device=True)
        self.assertEqual(self.server.call('POST', '/api/reflections', reflection), result)
        self.assertEqual(self.server.call('GET', '/api/device/state'), device)

    def seed_forest(self, demo=True, status=0):
        result = subprocess.run([BINARY, '--seed-forest-demo'], env={**os.environ, 'DB_PATH': str(self.db),
            'DEMO_MODE': str(demo).lower()}, capture_output=True, timeout=5)
        self.assertEqual(result.returncode, status, result.stderr.decode())
        return json.loads(result.stdout) if status == 0 else result.stderr.decode()

    def test_explicit_demo_examples_are_gated_atomic_and_retry_stable(self):
        api = self.server.call
        self.assertIn('DEMO_MODE=true', self.seed_forest(demo=False, status=1))
        self.assertIn('Onboard', self.seed_forest(status=1))
        before = api('POST', '/api/onboarding', ONBOARD)
        with sqlite3.connect(self.db) as db:
            db.execute("CREATE TRIGGER fail_forest_seed BEFORE UPDATE ON app_state BEGIN SELECT RAISE(FAIL, 'seed failure'); END")
        self.seed_forest(status=1)
        self.assertEqual(api('GET', '/api/state'), before)
        with sqlite3.connect(self.db) as db:
            db.execute('DROP TRIGGER fail_forest_seed')
        self.assertEqual(self.seed_forest(), {'seededTransactions': 6})
        state = api('GET', '/api/state')
        self.assertTrue(state['demoSeeded'])
        self.assertEqual(state['goal'], before['goal'])
        self.assertEqual(state['wallet'], before['wallet'])
        self.assertEqual(state['letter'], before['letter'])
        self.assertEqual(state['pet'], before['pet'])
        insights = api('GET', '/api/insights')['insights']
        self.assertEqual(len(insights), 2)
        self.assertTrue(all(i['source'] == 'demo' for i in insights))
        self.assertEqual(sorted(i['evidence']['totalAmount'] for i in insights), [35, 54])
        due = api('GET', '/api/reflections/due')['transactions']
        self.assertEqual(len(due), 3)
        self.assertTrue(all(t['source'] == 'demo' for t in due))
        review = {'requestId': request_id(), 'transactionId': due[0]['id'], 'verdict': 'unsure'}
        reflected = api('POST', '/api/reflections', review)['transaction']
        self.assertEqual(self.seed_forest(), {'seededTransactions': 0})
        self.assertEqual(api('POST', '/api/reflections', review)['transaction'], reflected)
        with sqlite3.connect(self.db) as db:
            stored = json.loads(db.execute('SELECT payload FROM app_state').fetchone()[0])
            transactions = stored['finance']['transactions']
            self.assertEqual(len(transactions), 6)
            self.assertTrue(all('amountCents' in t and 'amount' not in t for t in transactions))
            self.assertEqual(db.execute('SELECT count(*) FROM processed_requests').fetchone()[0], 1)
        self.restart()
        self.assertEqual(self.seed_forest(), {'seededTransactions': 0})
        self.assertEqual(self.server.call('GET', '/api/insights')['insights'], insights)
        self.assertEqual(self.server.call('POST', '/api/reflections', review)['transaction'], reflected)

    def test_discretionary_clusters_use_existing_evidence_shape_and_survive_restart(self):
        api = self.server.call
        api('POST', '/api/onboarding', ONBOARD)
        base = datetime.now(timezone.utc) - timedelta(hours=3)
        for i, category in enumerate(['shopping', 'entertainment', 'shopping']):
            api('POST', '/api/transactions', {'requestId': request_id(), 'name': f'Purchase {i}', 'amount': i + 1,
                'category': category, 'occurredAt': (base + timedelta(minutes=30*i)).isoformat(timespec='milliseconds')})
        before = api('GET', '/api/state')
        insights = api('GET', '/api/insights')['insights']
        self.assertEqual(len(insights), 1)
        self.assertEqual(insights[0]['kind'], 'frequency')
        self.assertEqual(insights[0]['source'], 'manual')
        self.assertEqual(insights[0]['evidence'], {'count': 3, 'windowDays': 4/24, 'totalAmount': 6})
        self.assertEqual(api('GET', '/api/state'), before)
        self.restart()
        self.assertEqual(self.server.call('GET', '/api/insights')['insights'], insights)

    def test_reflections_require_48_hours_and_preserve_existing_reviews(self):
        api = self.server.call
        api('POST', '/api/onboarding', ONBOARD)
        transaction = api('POST', '/api/transactions', {'requestId': request_id(), 'name': 'Book', 'amount': 12,
            'category': 'shopping', 'occurredAt': (datetime.now(timezone.utc) - timedelta(hours=47)).isoformat(timespec='milliseconds')})['transaction']
        review = {'requestId': request_id(), 'transactionId': transaction['id'], 'verdict': 'worth_it'}
        self.assertEqual(api('GET', '/api/reflections/due'), {'transactions': []})
        error = api('POST', '/api/reflections', review, 409)
        self.assertIn('48 hours', error['error']['message'])
        # Reconstruct a review saved by v1 after 24h; v2 must not hide or rewrite it.
        old_review = {'verdict': 'worth_it', 'reflectedAt': datetime.now(timezone.utc).isoformat(timespec='milliseconds')}
        with sqlite3.connect(self.db) as db:
            stored = json.loads(db.execute('SELECT payload FROM app_state').fetchone()[0])
            stored['finance']['transactions'][0]['reflection'] = old_review
            db.execute('UPDATE app_state SET payload=?', (json.dumps(stored),))
        result = api('POST', '/api/reflections', review)
        self.assertEqual(result['transaction']['reflection'], old_review)
        api('POST', '/api/reflections', {**review, 'requestId': request_id(), 'verdict': 'unsure'}, 409)
        self.restart()
        self.assertEqual(self.server.call('POST', '/api/reflections', review)['transaction']['reflection'], old_review)

    def test_lessons_reward_once_validate_options_and_rollback_reactions(self):
        self.restart(device=True)
        api = self.server.call
        api('GET', '/api/lessons', status=404)
        api('POST', '/api/onboarding', ONBOARD)
        lesson = api('GET', '/api/lessons')['lessons'][0]
        self.assertNotIn('correctOptionId', lesson)
        self.assertNotIn('feedback', lesson)
        answer = {'requestId': request_id(), 'lessonId': lesson['id'], 'selectedOptionId': 'skip'}
        wrong = api('POST', '/api/lessons/answer', answer)
        self.assertFalse(wrong['correct'])
        self.assertEqual(wrong['reward'], {'coins': 0, 'xp': 0})
        api('POST', '/api/lessons/answer', {**answer, 'selectedOptionId': 'save'}, 409)
        answer = {**answer, 'requestId': request_id(), 'selectedOptionId': 'missing'}
        api('POST', '/api/lessons/answer', answer, 400)
        answer['selectedOptionId'] = 'save'
        with sqlite3.connect(self.db) as db:
            stored = json.loads(db.execute('SELECT payload FROM app_state').fetchone()[0])
            stored['account']['xp'] = 95
            db.execute('UPDATE app_state SET payload=?', (json.dumps(stored),))
            db.execute("CREATE TRIGGER fail_lesson BEFORE INSERT ON processed_requests BEGIN SELECT RAISE(FAIL, 'write failure'); END")
        before = api('GET', '/api/state')
        device = api('GET', '/api/device/state')
        api('POST', '/api/lessons/answer', answer, 500)
        self.assertEqual(api('GET', '/api/state'), before)
        self.assertEqual(api('GET', '/api/device/state'), device)
        with sqlite3.connect(self.db) as db:
            db.execute('DROP TRIGGER fail_lesson')
        correct = api('POST', '/api/lessons/answer', answer)
        self.assertTrue(correct['correct'])
        self.assertEqual(correct['reward'], {'coins': 5, 'xp': 10})
        self.assertEqual(correct['state']['wallet']['xp'], 105)
        self.assertEqual(api('GET', '/api/device/state')['reactionSeq'], device['reactionSeq'] + 1)
        for payload in [answer, {**answer, 'requestId': request_id()}]:
            self.assertEqual(api('POST', '/api/lessons/answer', payload)['reward'], {'coins': 0, 'xp': 0})
        self.assertEqual(api('GET', '/api/lessons')['lessons'][0]['availableReward'], {'coins': 0, 'xp': 0})
        self.restart(device=True)
        self.assertEqual(self.server.call('POST', '/api/lessons/answer', answer)['reward'], {'coins': 0, 'xp': 0})
        self.assertEqual(self.server.call('GET', '/api/device/state')['reactionSeq'], device['reactionSeq'] + 1)

    def test_daily_report_is_read_only_and_check_in_aliases_share_one_reward(self):
        self.restart(device=True)
        api = self.server.call
        api('GET', '/api/reports/today', status=404)
        api('POST', '/api/onboarding', ONBOARD)
        report = api('GET', '/api/reports/today')
        self.assertIsNone(report['dailyLimit'])
        self.assertIsNone(report['underDailyLimit'])
        self.assertIsNone(report['achievement'])
        check_in = {'requestId': request_id()}
        api('POST', '/api/check-ins', check_in, 409)
        api('POST', '/api/demo/seed', {'xp': 100})
        api('PUT', '/api/budgets', {'month': report['date'][:7], 'monthlyLimit': 500, 'dailyLimit': 25})
        api('POST', '/api/transactions', {'requestId': request_id(), 'name': 'Lunch', 'amount': 18, 'category': 'food',
            'occurredAt': datetime.now(timezone.utc).isoformat(timespec='milliseconds')})
        before = api('GET', '/api/state')
        device = api('GET', '/api/device/state')
        for _ in range(3):
            report = api('GET', '/api/reports/today')
            self.assertTrue(report['underDailyLimit'])
            self.assertEqual(report['spentToday'], 18)
            self.assertEqual(report['availableReward'], {'coins': 10, 'xp': 20})
            self.assertFalse(report['completedToday'])
        self.assertEqual(api('GET', '/api/state'), before)
        self.assertEqual(api('GET', '/api/device/state'), device)
        with sqlite3.connect(self.db) as db:
            db.execute("CREATE TRIGGER fail_checkin BEFORE INSERT ON processed_requests BEGIN SELECT RAISE(FAIL, 'write failure'); END")
        api('POST', '/api/check-ins', check_in, 500)
        self.assertFalse(api('GET', '/api/reports/today')['completedToday'])
        with sqlite3.connect(self.db) as db:
            db.execute('DROP TRIGGER fail_checkin')
        first = api('POST', '/api/check-ins', check_in)
        self.assertEqual(first['reward'], {'coins': 10, 'xp': 20})
        self.assertTrue(first['completedToday'])
        self.assertTrue(first['state']['today']['checkInCompleted'])
        self.assertEqual(api('POST', '/api/quests/complete', {**check_in, 'questId': 'daily-check-in'}), first['state'])
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            def complete(i):
                return api('POST', '/api/check-ins', {'requestId': request_id()}) if i % 2 else api('POST', '/api/quests/complete', {'requestId': request_id(), 'questId': 'daily-check-in'})
            list(pool.map(complete, range(8)))
        self.assertEqual(api('GET', '/api/state')['wallet'], first['state']['wallet'])
        self.assertEqual(api('GET', '/api/device/state'), device)
        self.restart(device=True)
        self.assertEqual(self.server.call('POST', '/api/check-ins', check_in)['reward'], {'coins': 0, 'xp': 0})
        self.assertEqual(self.server.call('GET', '/api/reports/today')['availableReward'], {'coins': 0, 'xp': 0})

    def test_forest_scenario_and_replays_persist_with_existing_device_contract(self):
        self.restart(device=True)
        api = self.server.call
        api('POST', '/api/onboarding', ONBOARD)
        api('POST', '/api/demo/seed', {'xp': 100})  # Existing level-2 user; V1 gate is preserved.
        self.restart(device=True)
        api = self.server.call
        before = api('GET', '/api/state')
        report = api('GET', '/api/reports/today')
        month = report['date'][:7]
        api('PUT', '/api/preferences', {'voice': 'calm'})
        api('PUT', '/api/budgets', {'month': month, 'monthlyLimit': 500, 'dailyLimit': 25})
        purchase = {'requestId': request_id(), 'name': 'Takeout', 'amount': 18, 'category': 'food',
                    'occurredAt': datetime.now(timezone.utc).isoformat(timespec='milliseconds')}
        result = api('POST', '/api/transactions', purchase)
        self.assertEqual(result['budget']['spentThisMonth'], 18)
        self.assertEqual(api('GET', '/api/reports/today')['spentToday'], 18)
        api('POST', '/api/transactions', purchase)
        self.assertEqual(api('GET', '/api/state')['wallet'], before['wallet'])
        self.assertEqual(api('GET', '/api/state')['goal'], before['goal'])
        self.assertEqual(self.seed_forest(), {'seededTransactions': 6})
        insights = api('GET', '/api/insights')['insights']
        frequency = next(i for i in insights if i['id'].startswith('frequency-'))
        self.assertEqual(frequency['source'], 'demo')
        self.assertEqual(frequency['evidence'], {'count': 3, 'windowDays': 7, 'totalAmount': 54})
        due = api('GET', '/api/reflections/due')['transactions']
        review = {'requestId': request_id(), 'transactionId': due[0]['id'], 'verdict': 'worth_it'}
        reviewed = api('POST', '/api/reflections', review)['transaction']
        self.assertEqual(api('POST', '/api/reflections', review)['transaction'], reviewed)
        # Race fresh IDs for each of the two lessons: exactly one award per lesson.
        lesson_ids = [lesson['id'] for lesson in api('GET', '/api/lessons')['lessons']]
        self.assertEqual(lesson_ids, ['potential-vs-confirmed', 'budget-target'])
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            for lesson_id, option in zip(lesson_ids, ['save', 'limit']):
                answers = list(pool.map(lambda _: api('POST', '/api/lessons/answer', {
                    'requestId': request_id(), 'lessonId': lesson_id, 'selectedOptionId': option}), range(6)))
                self.assertEqual(sum(answer['reward']['coins'] for answer in answers), 5)
                self.assertEqual(sum(answer['reward']['xp'] for answer in answers), 10)
        device_before = api('GET', '/api/device/state')
        # Race the first completion through BOTH routes using the same UUID.
        check_in = {'requestId': request_id()}
        def complete(i):
            if i % 2:
                return api('POST', '/api/check-ins', check_in)['state']
            return api('POST', '/api/quests/complete', {**check_in, 'questId': 'daily-check-in'})
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            states = list(pool.map(complete, range(8)))
        self.assertTrue(all(s['wallet']['coins'] == 20 and s['wallet']['xp'] == 140 for s in states))
        self.assertEqual(api('POST', '/api/check-ins', {'requestId': request_id()})['reward'], {'coins': 0, 'xp': 0})
        # New device reaction names are blocked by the existing strict poller.
        self.assertEqual(api('GET', '/api/device/state'), device_before)
        savings = {'requestId': request_id(), 'amount': 50}
        saved = api('POST', '/api/savings', savings)
        self.assertEqual(saved['forest'], {'treeStage': 'sapling', 'growthPercent': 25})
        self.assertEqual(saved['letter'], {**ONBOARD['letter'], 'revealedSections': 1})
        feed = {'requestId': request_id(), 'petId': 'mochi-01'}
        final = api('POST', '/api/feed', feed)
        device = api('GET', '/api/device/state')
        self.assertEqual(device['reactionSeq'], device_before['reactionSeq'] + 1)
        self.assertEqual(device['reactionType'], 'feed')
        self.assertEqual(set(device), {'petId', 'mood', 'hunger', 'reactionSeq', 'reactionType'})
        final_report = api('GET', '/api/reports/today')
        self.assertTrue(final_report['completedToday'])
        with sqlite3.connect(self.db) as db:
            snapshot = db.execute('SELECT payload FROM app_state').fetchone()[0]
            history = db.execute('SELECT * FROM processed_requests ORDER BY request_id').fetchall()
            self.assertEqual(len(json.loads(snapshot)['finance']['transactions']), 7)
        for _ in range(3):
            api('GET', '/api/reports/today')
            api('GET', '/api/state')
        with sqlite3.connect(self.db) as db:
            self.assertEqual(db.execute('SELECT payload FROM app_state').fetchone()[0], snapshot)
            self.assertEqual(db.execute('SELECT * FROM processed_requests ORDER BY request_id').fetchall(), history)
        self.restart(device=True)
        api = self.server.call
        self.assertEqual(api('GET', '/api/state'), final)
        self.assertEqual(api('GET', '/api/reports/today'), final_report)
        self.assertEqual(api('GET', '/api/insights')['insights'], insights)
        self.assertEqual(api('POST', '/api/transactions', purchase)['transaction']['id'], result['transaction']['id'])
        self.assertEqual(api('POST', '/api/reflections', review)['transaction'], reviewed)
        self.assertEqual(api('POST', '/api/check-ins', check_in)['reward'], {'coins': 0, 'xp': 0})
        for lesson_id, option in zip(lesson_ids, ['save', 'limit']):
            self.assertEqual(api('POST', '/api/lessons/answer', {'requestId': request_id(),
                'lessonId': lesson_id, 'selectedOptionId': option})['reward'], {'coins': 0, 'xp': 0})
        self.assertEqual(api('POST', '/api/feed', feed), final)
        self.assertEqual(api('POST', '/api/savings', savings), final)
        self.assertEqual(api('GET', '/api/device/state'), device)
        self.assertEqual(self.seed_forest(), {'seededTransactions': 0})

    def test_over_budget_spending_does_not_shrink_existing_tree_or_rewards(self):
        api = self.server.call
        api('POST', '/api/onboarding', ONBOARD)
        before = api('POST', '/api/savings', {'requestId': request_id(), 'amount': 50})
        report = api('GET', '/api/reports/today')
        api('PUT', '/api/budgets', {'month': report['date'][:7], 'monthlyLimit': 500, 'dailyLimit': 25})
        api('POST', '/api/transactions', {'requestId': request_id(), 'name': 'Groceries', 'amount': 26,
            'category': 'food', 'occurredAt': datetime.now(timezone.utc).isoformat(timespec='milliseconds')})
        after = api('GET', '/api/state')
        for field in ['forest', 'goal', 'wallet', 'letter', 'pet']:
            self.assertEqual(after[field], before[field])
        report = api('GET', '/api/reports/today')
        self.assertFalse(report['underDailyLimit'])
        self.assertIsNone(report['achievement'])
        skipped = api('POST', '/api/decisions', {'requestId': request_id(), 'itemName': 'Hoodie', 'amount': 10, 'decision': 'skip'})
        self.assertEqual(skipped['goal']['potentialSavings'], 10)
        self.assertEqual(skipped['goal']['confirmedSaved'], 50)
        self.assertEqual(skipped['forest'], before['forest'])
        self.restart()
        self.assertEqual(self.server.call('GET', '/api/state'), skipped)

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

    def test_missing_finance_during_runtime_cannot_commit_a_partial_action(self):
        api = self.server.call
        api('POST', '/api/onboarding', ONBOARD)
        with sqlite3.connect(self.db) as db:
            valid = db.execute('SELECT payload FROM app_state').fetchone()[0]
            corrupt = json.loads(valid)
            del corrupt['finance']
            corrupt_payload = json.dumps(corrupt)
            db.execute('UPDATE app_state SET payload=?', (corrupt_payload,))
        savings = {'requestId': request_id(), 'amount': 50}
        api('POST', '/api/savings', savings, 500)
        with sqlite3.connect(self.db) as db:
            self.assertEqual(db.execute('SELECT payload FROM app_state').fetchone()[0], corrupt_payload)
            self.assertEqual(db.execute('SELECT count(*) FROM processed_requests').fetchone()[0], 0)
            db.execute('UPDATE app_state SET payload=?', (valid,))
        state = api('POST', '/api/savings', savings)
        self.assertEqual(state['goal']['confirmedSaved'], 50)
        self.assertEqual(state['wallet']['xp'], 30)
        self.assertEqual(state['letter']['vision'], ONBOARD['letter']['vision'])

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
        poller = subprocess.Popen([sys.executable, str(poller_path), self.server.base,
                                   '--lock-file', str(Path(self.directory.name) / 'poller.lock')],
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

    def test_controller_calls_once_and_reconnects_after_backend_restart(self):
        self.restart(device=True)
        api = self.server.call
        api('POST', '/api/onboarding', ONBOARD)
        api('POST', '/api/demo/seed', {'coins': 60})
        api('POST', '/api/feed', {'requestId': request_id(), 'petId': 'mochi-01'})
        directory = Path(self.directory.name)
        calls = directory / 'calls.txt'
        controller = directory / 'fake_controller.py'
        controller.write_text('import os\n'
                              'def record(name):\n'
                              '    with open(os.environ["MOCHI_TEST_CALLS"], "a") as f: f.write(name + "\\n")\n'
                              'def wag_tail(): record("wag")\n'
                              'def play_happy_sound(): record("sound")\n')
        log_path = directory / 'poller.log'
        poller_path = Path(__file__).resolve().parents[1] / 'examples/poll_device.py'

        def wait_for(predicate, message):
            for _ in range(150):
                if predicate():
                    return
                time.sleep(.02)
            self.fail(message + '\n' + log_path.read_text())

        def recorded():
            return calls.read_text().splitlines() if calls.exists() else []

        with log_path.open('w') as log:
            process = subprocess.Popen([sys.executable, str(poller_path), self.server.base,
                                        '--controller', str(controller), '--sound', '--interval', '.05',
                                        '--timeout', '.1', '--max-retry', '.2',
                                        '--lock-file', str(directory / 'controller.lock')],
                                       env={**os.environ, 'MOCHI_TEST_CALLS': str(calls)},
                                       stdout=log, stderr=log)
            try:
                wait_for(lambda: 'Initial baseline: 1' in log_path.read_text(), 'No boot baseline')
                self.assertEqual(recorded(), [])
                feed = {'requestId': request_id(), 'petId': 'mochi-01'}
                api('POST', '/api/feed', feed)
                wait_for(lambda: recorded() == ['wag', 'sound'], 'Controller was not called')
                api('POST', '/api/feed', feed)
                port = self.server.port
                self.server.close()
                wait_for(lambda: 'reconnecting' in log_path.read_text(), 'No reconnect attempt')
                self.assertIsNone(process.poll())
                self.server = Server(self.db, device=True, port=port)
                api = self.server.call
                wait_for(lambda: 'Reconnected to Mochi' in log_path.read_text(), 'Did not reconnect')
                self.assertEqual(recorded(), ['wag', 'sound'])
                api('POST', '/api/feed', feed)  # Persisted request ID still cannot repeat a wag.
                api('POST', '/api/feed', {'requestId': request_id(), 'petId': 'mochi-01'})
                wait_for(lambda: recorded() == ['wag', 'sound', 'wag', 'sound'], 'No post-reconnect reaction')
                self.assertEqual(api('GET', '/api/state')['wallet']['coins'], 0)
            finally:
                process.terminate()
                process.wait(timeout=5)


if __name__ == '__main__':
    unittest.main(verbosity=2)
