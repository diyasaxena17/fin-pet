"""Real HTTP/SQLite sandbox clock and isolation checks; temporary data only."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile
import unittest
from datetime import datetime
from http_tests import BINARY, Server, ONBOARD, request_id


class SandboxTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix='mochi-sandbox-')
        self.base = Path(self.directory.name) / 'real.sqlite3'
        self.sidecar = Path(str(self.base) + '.sandbox14.sqlite3')
        self.env = {**os.environ, 'DEMO_MODE': 'true', 'DB_PATH': str(self.base),
                    'DEMO_TIME_ZONE': 'America/Toronto', 'DEMO_SANDBOX_START': '2026-11-08'}
        self.server = None

    def tearDown(self):
        if self.server:
            self.server.close()
        self.directory.cleanup()

    def command(self, *args, overrides=None, ok=True):
        result = subprocess.run([BINARY, *args], env={**self.env, **(overrides or {})},
                                capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode == 0, ok, result.stderr)
        return json.loads(result.stdout) if ok else result.stderr

    def launch(self):
        self.server = Server(self.base, device=True, extra_env={
            'DEMO_SANDBOX': 'true', 'DEMO_SANDBOX_START': '2026-11-08'})
        return self.server.call

    def test_clock_restart_no_future_data_and_real_user_isolation(self):
        real = Server(self.base, demo=False)
        try:
            real.call('POST', '/api/onboarding', ONBOARD)
            real.call('POST', '/api/savings', {'requestId': request_id(), 'amount': 10})
        finally:
            real.close()
        with sqlite3.connect(self.base) as db:
            real_state = db.execute('SELECT * FROM app_state').fetchall()
            real_ids = db.execute('SELECT * FROM processed_requests').fetchall()
        full = self.command('--seed-sandbox')
        self.assertEqual(full['selectedDay'], 14)
        self.assertEqual(full['balances']['cash'], 1166.51)
        self.assertEqual(full['balances']['savingsContributions'], 200)
        self.assertEqual(full['balances']['investmentContributions'], 120)
        self.assertEqual(full['balances']['simulatedInvestmentReturn'], .19)
        self.assertIn('simulated', full['notice'])
        self.assertEqual(self.command('--seed-sandbox'), full)
        self.assertEqual(self.command('--seed-forest-demo', overrides={'DEMO_SANDBOX': 'true'}), full)
        early = self.command('--sandbox-day', '3')
        self.assertEqual(early['balances']['income'], 1250)
        self.assertTrue(all(e['date'] <= '2026-11-10' for e in early['entries']))
        self.assertNotIn('schedule', early)
        api = self.launch()
        state = api('GET', '/api/state')
        self.assertEqual(state['goal']['confirmedSaved'], 5)
        self.assertEqual(state['wallet']['xp'], 30)
        self.assertEqual(state['forest']['treeStage'], 'seedling')
        report = api('GET', '/api/reports/today')
        self.assertEqual(report['date'], '2026-11-10')
        self.assertEqual(report['dailyLimit'], 75)
        self.assertEqual(report['spentToday'], sum(e['amount'] for e in early['entries']
            if e['type'] == 'expense' and e['date'] == report['date']))
        transactions = api('GET', '/api/transactions?month=2026-11')['transactions']
        cutoff = datetime.fromisoformat('2026-11-11T04:59:59.999+00:00')
        self.assertTrue(all(datetime.fromisoformat(t['occurredAt'].replace('Z', '+00:00')) <= cutoff for t in transactions))
        self.assertTrue(all(t['source'] == 'demo' for t in transactions))
        insights = api('GET', '/api/insights')['insights']
        self.assertTrue(any(i['title'].startswith('Takeout') for i in insights))
        self.assertTrue(any(i['id'].startswith('cluster-') for i in insights))
        due = api('GET', '/api/reflections/due')['transactions']
        self.assertTrue(due)
        self.assertTrue(all((cutoff - datetime.fromisoformat(t['occurredAt'].replace('Z', '+00:00'))).total_seconds() >= 48*3600 for t in due))
        api('GET', '/api/device/state', status=404)  # Replay mode never drives hardware.
        self.assertIn('Stop the sandbox server', self.command('--sandbox-day', '1', ok=False))
        self.server.close()
        self.command('--sandbox-day', '9')
        api = self.launch()
        day9 = api('GET', '/api/state')
        report9 = api('GET', '/api/reports/today')
        self.assertEqual(day9['goal']['confirmedSaved'], 50)
        self.assertEqual(day9['forest']['treeStage'], 'sapling')
        self.assertEqual(day9['letter']['revealedSections'], 1)
        self.assertEqual(report9['date'], '2026-11-16')
        self.assertTrue(report9['completedToday'])
        self.assertEqual(report9['streakDays'], 2)
        self.server.close()
        api = self.launch()
        self.assertEqual(api('GET', '/api/state'), day9)
        self.assertEqual(api('GET', '/api/reports/today'), report9)
        with sqlite3.connect(self.sidecar) as db:
            readonly = db.execute('SELECT * FROM processed_requests ORDER BY request_id').fetchall()
        for method, route, body in [('POST', '/api/check-ins', {'requestId': request_id()}),
                                    ('POST', '/api/savings', {'requestId': request_id(), 'amount': 50}),
                                    ('PUT', '/api/preferences', {'voice': 'calm'}),
                                    ('POST', '/api/demo/reset', {})]:
            api(method, route, body, 409)
        self.assertEqual(api('GET', '/api/state'), day9)
        with sqlite3.connect(self.sidecar) as db:
            self.assertEqual(db.execute('SELECT * FROM processed_requests ORDER BY request_id').fetchall(), readonly)
        self.server.close()
        self.command('--sandbox-day', '3')
        api = self.launch()
        self.assertEqual(api('GET', '/api/state'), state)
        self.assertEqual(api('GET', '/api/reports/today'), report)
        self.server.close()
        with sqlite3.connect(self.base) as db:
            self.assertEqual(db.execute('SELECT * FROM app_state').fetchall(), real_state)
            self.assertEqual(db.execute('SELECT * FROM processed_requests').fetchall(), real_ids)
            self.assertEqual(db.execute("SELECT count(*) FROM sqlite_master WHERE name='sandbox_replay'").fetchone()[0], 0)

    def test_gate_invalid_clock_timezone_and_unowned_sidecar(self):
        self.command('--seed-sandbox', overrides={'DEMO_MODE': 'false'}, ok=False)
        self.command('--seed-sandbox', overrides={'DB_PATH': ''}, ok=False)
        self.assertFalse(self.sidecar.exists())
        full = self.command('--seed-sandbox')
        for value in ['0', '15', '1x', '99999999999999999999']:
            self.command('--sandbox-day', value, ok=False)
            self.assertEqual(self.command('--sandbox-ledger'), full)
        self.command('--sandbox-day', '3', overrides={'DEMO_TIME_ZONE': 'UTC'}, ok=False)
        self.command('--sandbox-day', '3', overrides={'DEMO_SANDBOX_START': '2026-12-01'}, ok=False)
        # An ordinary initialized DB at the sidecar location is not ours to replace.
        collision_base = Path(self.directory.name) / 'collision.sqlite3'
        collision = Path(str(collision_base) + '.sandbox14.sqlite3')
        real = Server(collision)
        try:
            before = real.call('POST', '/api/onboarding', ONBOARD)
            with sqlite3.connect(collision) as db:
                payload = db.execute('SELECT payload FROM app_state').fetchone()[0]
            self.command('--seed-sandbox', overrides={'DB_PATH': str(collision_base)}, ok=False)
            self.assertEqual(real.call('GET', '/api/state'), before)
            with sqlite3.connect(collision) as db:
                self.assertEqual(db.execute('SELECT payload FROM app_state').fetchone()[0], payload)
        finally:
            real.close()
        # Rejection must happen before the ordinary v1->v2 startup migration.
        with sqlite3.connect(collision) as db:
            legacy = json.loads(db.execute('SELECT payload FROM app_state').fetchone()[0])
            del legacy['finance']
            payload = json.dumps(legacy)
            db.execute('UPDATE app_state SET payload=?', (payload,))
            db.execute('PRAGMA user_version=1')
        self.command('--seed-sandbox', overrides={'DB_PATH': str(collision_base)}, ok=False)
        with sqlite3.connect(collision) as db:
            self.assertEqual(db.execute('PRAGMA user_version').fetchone()[0], 1)
            self.assertEqual(db.execute('SELECT payload FROM app_state').fetchone()[0], payload)

    def test_replay_failure_rolls_back_clock_state_and_request_history(self):
        self.command('--seed-sandbox')
        def rows():
            with sqlite3.connect(self.sidecar) as db:
                return (db.execute('SELECT * FROM app_state').fetchall(),
                        db.execute('SELECT * FROM sandbox_replay').fetchall(),
                        db.execute('SELECT * FROM processed_requests ORDER BY request_id').fetchall(),
                        db.execute('SELECT * FROM decisions ORDER BY request_id').fetchall())
        before = rows()
        with sqlite3.connect(self.sidecar) as db:
            db.execute("CREATE TRIGGER fail_replay BEFORE INSERT ON processed_requests BEGIN SELECT RAISE(FAIL, 'injected replay failure'); END")
        self.command('--sandbox-day', '3', ok=False)
        self.assertEqual(rows(), before)


if __name__ == '__main__':
    unittest.main(verbosity=2)
