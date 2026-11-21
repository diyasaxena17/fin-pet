"""Exercise the actual demo launcher without modifying user data."""
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/start-demo.sh'
BINARY = Path(sys.argv.pop(1)).resolve()


class StartupTests(unittest.TestCase):
    def test_launcher_enables_device_routes_and_preserves_state(self):
        with tempfile.TemporaryDirectory(prefix='mochi-launcher-') as directory:
            with socket.socket() as sock:
                sock.bind(('127.0.0.1', 0))
                port = sock.getsockname()[1]
            env = {**os.environ, 'PORT': str(port), 'API_HOST': '0.0.0.0',
                   'DB_PATH': str(Path(directory) / 'demo.sqlite3'), 'LAN_IP': '192.0.2.10',
                   'MOCHI_BUILD_DIR': str(BINARY.parent),
                   'ENABLE_DEVICE_API': 'false', 'DEMO_MODE': 'false'}
            base = f'http://127.0.0.1:{port}'

            def call(path, payload=None):
                request = urllib.request.Request(base + path, headers={'Content-Type': 'application/json'},
                                                 data=None if payload is None else json.dumps(payload).encode())
                try:
                    response = urllib.request.urlopen(request, timeout=2)
                except urllib.error.HTTPError as error:
                    response = error
                with response:
                    return response.status, json.load(response)

            # Reuse the same port immediately after real HTTP traffic. On Linux,
            # TIME_WAIT must not be mistaken for another running backend.
            for attempt in range(3):
                process = subprocess.Popen([str(SCRIPT), '--no-build'], cwd=directory,
                                           env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                try:
                    for _ in range(100):
                        if process.poll() is not None:
                            self.fail(f'Launcher attempt {attempt + 1}: {process.communicate()}')
                        try:
                            if call('/health')[0] == 200:
                                break
                        except OSError:
                            time.sleep(.03)
                    else:
                        self.fail('Launcher did not become healthy')
                    if attempt == 0:
                        state = call('/api/onboarding', {'petName': 'Mochi', 'goalTitle': 'Demo', 'goalTarget': 200,
                                                        'letter': {'vision': 'Future', 'why': '', 'reminder': ''}})
                        self.assertEqual(state[0], 200)
                        # The launcher must refuse a duplicate process without deleting state.
                        conflict = subprocess.run([str(SCRIPT), '--no-build'], cwd=directory, env=env,
                                                  capture_output=True, timeout=5)
                        self.assertNotEqual(conflict.returncode, 0)
                        self.assertIn(b'Demo preflight failed', conflict.stderr)
                    self.assertTrue(call('/api/state')[1]['initialized'])
                    self.assertEqual(call('/api/device/state')[0], 200)
                    self.assertEqual(call('/api/demo/seed', {'xp': 100})[0], 200)
                finally:
                    process.terminate()
                    output, _ = process.communicate(timeout=5)
                self.assertIn(b'http://192.0.2.10:5173/tap?petId=mochi-01', output)


if __name__ == '__main__':
    unittest.main(verbosity=2)
