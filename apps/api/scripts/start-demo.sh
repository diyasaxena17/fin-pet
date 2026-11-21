#!/usr/bin/env bash
# Local LAN demo only. Preserve the database across starts; never reset implicitly.
set -euo pipefail
api_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_dir="$(cd "$api_dir/../.." && pwd)"
no_build=false
case "${1:-}" in
  --no-build) no_build=true; shift ;;
  --help|-h)
    printf '%s\n' 'Usage: apps/api/scripts/start-demo.sh [--no-build]' \
      'Builds and starts the native API with device/demo routes enabled.' \
      'Optional env: API_HOST, PORT, DB_PATH, DEMO_TIME_ZONE, LAN_IP.' \
      'Defaults: 0.0.0.0:3000, apps/api/data/demo.sqlite3, America/Toronto.'
    exit 0 ;;
esac
if [ "$#" -ne 0 ]; then printf '%s\n' 'Unexpected argument. Use --help.' >&2; exit 2; fi
command -v python3 >/dev/null || { printf '%s\n' 'Python 3 is required for demo preflight.' >&2; exit 1; }
export API_HOST="${API_HOST:-0.0.0.0}"
export PORT="${PORT:-3000}"
export DB_PATH="${DB_PATH:-$api_dir/data/demo.sqlite3}"
export DEMO_TIME_ZONE="${DEMO_TIME_ZONE:-America/Toronto}"
export ENABLE_DEVICE_API=true
export DEMO_MODE=true
cd "$repo_dir"
build_dir="${MOCHI_BUILD_DIR:-$api_dir/build}"
# Reject a live listener, not a recently closed socket in TIME_WAIT. cpp-httplib
# uses SO_REUSEPORT; a SO_REUSEADDR-only bind probe falsely fails on Linux restart.
# The API's actual bind remains authoritative (another process can race preflight).
python3 - <<'PY'
import os, socket, sys
try:
    port = int(os.environ['PORT'])
    if not 1 <= port <= 65535:
        raise ValueError('PORT must be 1..65535')
    host = os.environ['API_HOST']
    probe_host = '127.0.0.1' if host == '0.0.0.0' else host
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(1)
        try:
            sock.connect((probe_host, port))
        except ConnectionRefusedError:
            pass  # No live listener; TIME_WAIT must not block a backend restart.
        else:
            raise ValueError(f'A service is already listening on {host}:{port}')
except (OSError, ValueError) as error:
    sys.exit(f'Demo preflight failed: {error}. Stop the existing process or check API_HOST/PORT.')
PY
if [ "$no_build" = false ]; then
  cmake -S "$api_dir" -B "$build_dir"
  cmake --build "$build_dir"
fi
binary="$build_dir/mochi-api"
if [ ! -x "$binary" ]; then printf '%s\n' 'Native API missing; rerun without --no-build.' >&2; exit 1; fi
lan_ip="${LAN_IP:-$(python3 - <<'PY'
import socket
try:
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        # Select the default IPv4 route without sending a packet.
        sock.connect(('192.0.2.1', 9))
        print(sock.getsockname()[0])
except OSError:
    print('<LAPTOP_LAN_IP>')
PY
)}"
printf '%s\n' \
  "Mochi LAN demo: $API_HOST:$PORT (ENABLE_DEVICE_API=true, DEMO_MODE=true)" \
  "Database preserved: $DB_PATH (relative paths resolve from $repo_dir)" \
  "Health: http://$lan_ip:$PORT/health" \
  "Pi state: http://$lan_ip:$PORT/api/device/state" \
  "Phone app: http://$lan_ip:5173/" \
  "NFC / QR: http://$lan_ip:5173/check-in" \
  'Start the frontend separately: VITE_USE_MOCK=false pnpm dev:web' \
  'Stop with Ctrl-C. No progress is reset by this script.'
if [ "$API_HOST" = '127.0.0.1' ] || [ "$API_HOST" = 'localhost' ]; then
  printf '%s\n' 'API_HOST is loopback-only: the Pi and phone cannot connect directly.' >&2
fi
if [ "$PORT" != '3000' ]; then
  printf '%s\n' 'The frozen Vite proxy targets API port 3000. Keep PORT=3000 for the phone demo.' >&2
fi
exec "$binary"
