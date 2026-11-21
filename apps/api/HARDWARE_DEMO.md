# Phone → NFC → backend → Raspberry Pi demo

This procedure uses the existing C++ backend and React UI. It changes neither
AppState nor the frozen request/response contract. The demo launcher explicitly
enables the existing opt-in device API. The hardware controller itself is deferred
until the hardware owner supplies it; no GPIO pins or servo implementation are assumed.

## 1. Laptop setup

Use the repository's Node 22.23.5 / pnpm 10.34.9 for the frontend and workspace
checks. The backend requires CMake, a C++20 compiler and SQLite development headers.
Python 3 runs the Pi poller; it has no third-party Python dependencies.

From the workspace root, in terminal 1:

```sh
apps/api/scripts/start-demo.sh
```

The script builds the native executable, checks the port, enables
`ENABLE_DEVICE_API=true` and `DEMO_MODE=true`, binds **0.0.0.0:3000**, and preserves
`apps/api/data/demo.sqlite3`. Repeated starts do not seed or erase progress.
After building, `--no-build` skips compilation. Override `DB_PATH` for a separate
rehearsal database; an explicit relative path resolves from the workspace root,
even if the script was invoked from another directory.

```sh
DB_PATH="$PWD/apps/api/data/rehearsal.sqlite3" apps/api/scripts/start-demo.sh
```

In terminal 2:

```sh
VITE_USE_MOCK=false pnpm dev:web
```

Vite already binds **0.0.0.0:5173** and proxies `/api` to backend port **3000**.
Keep `PORT=3000` for this unmodified frontend proxy. Do not put `0.0.0.0` or
`localhost` into the NFC tag or Pi command: those are a bind address and the
viewing device's own loopback address, respectively.

The launcher prints (example IP; use the actual output):

```text
Mochi LAN demo: 0.0.0.0:3000 (ENABLE_DEVICE_API=true, DEMO_MODE=true)
Health: http://192.168.1.23:3000/health
Pi state: http://192.168.1.23:3000/api/device/state
Phone app: http://192.168.1.23:5173/
NFC / QR: http://192.168.1.23:5173/tap?petId=mochi-01
```

`LAN_IP=192.168.1.23 apps/api/scripts/start-demo.sh` overrides IP detection when
a VPN, Ethernet interface, or multiple network adapters select the wrong route.
Find the Wi-Fi address with `ipconfig getifaddr en0` on macOS (adjust interface),
or `hostname -I` on Linux. Check the router's device list if needed.
The script does not change firewall or router settings. Ctrl-C stops the backend;
its database remains available for the next start.

## 2. Network and firewall preflight

Connect the laptop, Pi and phone to the **same reachable Wi-Fi/router**. A guest
network may isolate clients even when all three devices show the same SSID.
Use a trusted network without client isolation; no public tunnel or port
forwarding is needed for this unauthenticated local demo.

| Connection | Required access |
| --- | --- |
| Phone → laptop | TCP 5173 for frontend and proxied API |
| Pi → laptop | TCP 3000 for device polling |
| Phone → laptop, optional diagnostic | TCP 3000 for `/health` |
| Laptop → Pi | Not required by polling; SSH only if used to copy/start files |

On macOS, if Firewall is enabled, open **System Settings → Network → Firewall →
Options** and allow incoming connections for the compiled `mochi-api` executable
and the Node executable running Vite. A rebuild can prompt for permission again.
Do not disable the firewall as a demo setup step. See
[Apple's firewall guide](https://support.apple.com/en-ie/guide/mac-help/mh34041/mac).

On an Ubuntu laptop already using UFW, inspect `sudo ufw status` and, if needed,
add rules limited to your actual demo LAN CIDR. Example only, after replacing the
CIDR with your network:

```sh
DEMO_LAN_CIDR=192.168.1.0/24
sudo ufw allow from "$DEMO_LAN_CIDR" to any port 3000 proto tcp
sudo ufw allow from "$DEMO_LAN_CIDR" to any port 5173 proto tcp
# Remove those two demo rules when finished:
# sudo ufw delete allow from "$DEMO_LAN_CIDR" to any port 3000 proto tcp
# sudo ufw delete allow from "$DEMO_LAN_CIDR" to any port 5173 proto tcp
```

No firewall changes are made automatically. See the
[Ubuntu UFW documentation](https://ubuntu.com/server/docs/how-to/security/firewalls/).
The Pi needs outbound access to the laptop's port 3000, not an inbound web port.

On the **Pi**, substitute the laptop IP and run:

```sh
curl --connect-timeout 3 http://192.168.1.23:3000/health
curl --connect-timeout 3 http://192.168.1.23:3000/api/device/state
```

Health should return `{"ok":true}`. Before onboarding, device state returns
404/`NOT_INITIALIZED`; this means the route is reachable. A `NOT_FOUND` response
instead means device routes are disabled or the wrong server is running.
On the **phone**, open both the health URL and `http://192.168.1.23:5173/`.
Perform these external-device checks even if the laptop can reach its own LAN IP.

## 3. Raspberry Pi poller and controller

Copy `apps/api/examples/poll_device.py` to the Pi or use a checkout there. Start
with dry-run mode, which prints events without moving hardware:

If using SSH to copy just the poller, substitute your configured Pi user/host
(SSH must already be enabled by the hardware owner):

```sh
MOCHI_PI_TARGET=your-user@your-pi-host
ssh "$MOCHI_PI_TARGET" 'mkdir -p ~/mochi'
scp apps/api/examples/poll_device.py "${MOCHI_PI_TARGET}:mochi/poll_device.py"
ssh "$MOCHI_PI_TARGET"
# On the Pi, for the copied file:
python3 ~/mochi/poll_device.py http://192.168.1.23:3000 --dry-run
```

With a repository checkout on the Pi instead:

```sh
python3 apps/api/examples/poll_device.py http://192.168.1.23:3000 --dry-run
```

Once the hardware owner's existing controller is available, it must expose:

```python
def wag_tail():
    # Existing hardware controller moves the tail and returns.
    ...

# Optional; required only when --sound is supplied.
def play_happy_sound():
    ...
```

The functions are synchronous, take no required arguments, and should return
promptly. Hardware initialization, safe GPIO/PWM handling, pin assignments,
power and audio configuration belong to that controller. A blocking/hung driver
will pause this single poller; rehearse the controller independently first.

Load the actual file or an importable module; **replace** the example path:

```sh
python3 apps/api/examples/poll_device.py http://192.168.1.23:3000 \
  --controller /home/pi/mochi/controller.py
# Enable sound only after that function is implemented and tested:
python3 apps/api/examples/poll_device.py http://192.168.1.23:3000 \
  --controller /home/pi/mochi/controller.py --sound
```

The second command replaces the first process; do not run both. Module-name form
is `--controller hardware_controller`, using the Pi's existing Python import
path. The loader adds a controller file's parent directory for sibling imports.
No controller was supplied during this integration task; these calls were verified
against a temporary fake module, not a physical motor or speaker.

Expected diagnostics on stderr:

```text
Controller loaded; waiting for baseline
Initial baseline: 0; no animation
Feed 1: wag_tail() completed
```

A dry run reports `DRY RUN: no hardware controller` instead. New observed events
are JSON lines on stdout, for example:

```json
{"petId":"mochi-01","mood":"happy","hunger":80,"reactionSeq":1,"reactionType":"feed"}
```

The exact sequence may be higher in an existing database. Only a **new feed**
calls `wag_tail()`; `level_up`, `greeting`, and null never do. Sound runs after a
successful wag and only with `--sound`.

Every poller boot takes the first valid state as a baseline and **does not play
its old reaction**. Repeated GETs and retried feed UUIDs do not replay hardware.
Temporary timeouts, refusals, invalid JSON and truncated HTTP responses reconnect
automatically, using delays 1, 2, 4, then at most 8 seconds by default. A successful
read resets that delay; the in-memory sequence survives outages. Requests time out
after 3 seconds. Use `--interval`, `--timeout`, `--max-retry` to adjust timings.

One poller per Pi/controller is enforced by a per-user lock at
`~/.local/state/mochi/poller.lock` (or under `XDG_STATE_HOME`). Do not start the
same controller as multiple users or configure separate lock files for it.
A crash releases the lock automatically; a leftover lock file is harmless.
Ctrl-C/SIGTERM stop the loop. Use `--lock-file` for isolated test instances only.

Each sequence is consumed **before** dispatch: if a motor or sound call fails,
it is logged without repeating the same wag. This prevents duplicate motion but
does not promise delivery across crashes. The frozen API exposes the latest
reaction, not an event queue: several reactions between reads can coalesce, and
a later gesture/level event can supersede a feed. Keep the poller connected before
confirming, and do not trigger other reaction actions simultaneously during the
rehearsal. A replaced database with a decreased sequence takes a new baseline.

## 4. Live demo, in order

1. Start backend and frontend. Open the phone app. For a fresh rehearsal, use a
   separate database path. If intentionally restarting the existing demo, use
   the UI's confirmed reset and onboard again; the launcher never resets for you.
2. Onboard with pet Mochi, a $200 goal, and three original letter parts. Confirm
   the dashboard shows 0 coins, 0 XP, $0 confirmed savings and fullness 50.
3. Start the Pi poller and **wait for `Initial baseline: N; no animation`**.
   If it started before onboarding, its initial 404s are retried automatically.
4. Skip a $60 hoodie. Expect 60 coins, 20 XP, $60 potential savings, $0 confirmed.
5. Record $50 actually saved. Expect 50 XP total, 25% goal progress, and the
   first original letter section revealed. Fullness remains 50.
6. Write an NFC **URL record** containing the exact printed frontend URL, e.g.
   `http://192.168.1.23:5173/tap?petId=mochi-01`. Put the same URL in a QR fallback.
   Tag programming and real scanning require the phone/tag; neither is simulated
   by a backend request.
7. Scan with the phone. The confirmation page should show **60 coins** and
   **50/100 fullness**. Wait, refresh, or return to the dashboard: no coins should
   be spent and the Pi should not wag. Open the NFC URL again.
8. Tap **Confirm feed · 20 coins** once. Expect **40 coins, 50 XP, fullness 80,
   happy pet**, and the meal success message. Device sequence increases from N
   to N+1 with `reactionType:"feed"`. A fresh database has N=0, then sequence 1.
   The physical controller should wag once and optionally play its happy sound.
9. Leave polling for several seconds: no repeated wag. Refreshing the phone does
   not feed again. Software tests retry the same feed UUID and verify no extra
   spend or reaction; a second intentional confirmation is a new, paid feed.
10. For a reconnect rehearsal, stop/restart only the backend with the same DB.
    The Pi logs a retry followed by `Reconnected to Mochi; retained reaction sequence`.
    No stale wag should occur. If rebooting the Pi instead, its first state is
    always a silent baseline. Do not confirm a new feed until that baseline appears.

## 5. Repeatable verification

Default suite (no physical hardware):

```sh
cmake -S apps/api -B apps/api/build
cmake --build apps/api/build
ctest --test-dir apps/api/build --output-on-failure
pnpm check
```

This covers backend transactions and feed deduplication, six poller tests,
actual controller-module calls with a fake driver, live backend reconnects,
and launcher restart/port-conflict behavior. CTest does not need Playwright.

The optional **real browser integration test** starts/stops isolated servers on
3000/5173 and creates/removes a temporary database/controller. Stop other demo
servers first; occupied ports cause failure before any existing account is used.
It loads the unchanged React app at 390 × 844, opens/refreshes/cancels the NFC URL,
asserts zero feed POSTs and unchanged coins, explicitly confirms once, then
asserts one feed POST, one wag/sound call, and unchanged state on UUID replay.
It tests URL navigation, not a physical NFC reader.

Use an existing external Playwright installation without changing workspace
packages or the root lockfile:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  PLAYWRIGHT_BROWSER_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  pnpm --filter @mochi/api test:hardware
```

On Linux, omit `PLAYWRIGHT_BROWSER_EXECUTABLE` if Playwright's Chromium is already
installed, or provide its executable path. If Playwright is available through
normal Node module resolution, `PLAYWRIGHT_MODULE` can be omitted. A standalone
installation can live outside the repo, e.g. `/tmp/mochi-browser-tools`; point the
variable at that installation's `node_modules/playwright/index.mjs`.

The pure page test is `tests/nfc_flow.playwright.js`; it can also be executed by
an existing Playwright page harness. The standalone runner automatically cleans
up its processes and temporary data on success or failure. See
[verification/hardware-results.md](verification/hardware-results.md) for actual
software checks and the remaining physical checks.

## Troubleshooting

| Symptom | Check / recovery |
| --- | --- |
| Launcher says port occupied | Stop the other process; inspect `lsof -nP -iTCP:3000 -sTCP:LISTEN` on macOS or `ss -ltnp` on Linux. Do not run two backends on the same demo port. |
| Health works on laptop, not phone/Pi | Use laptop LAN IP, binding 0.0.0.0, same reachable network, firewall rules, VPN routing and guest/client isolation. Test from the actual device. |
| Frontend opens but API fails | Keep backend port 3000 for the frozen Vite proxy; confirm `VITE_USE_MOCK=false` and restart Vite after changing environment. |
| Device route returns NOT_FOUND | Start via the launcher or export `ENABLE_DEVICE_API=true` before starting the C++ binary. |
| Device route returns NOT_INITIALIZED | Complete onboarding, then wait for the poller's first baseline. |
| Poller prints DRY RUN but tail does not move | Supply `--controller` pointing to the actual Pi module. Dry run intentionally has no hardware calls. |
| Cannot import controller / missing function | Check the module path and dependencies on the Pi; expose no-argument `wag_tail()`, and `play_happy_sound()` only when using `--sound`. |
| Another poller holds the lock | Stop the earlier process. Do not work around it with another user/lock path for the same hardware. |
| Network failure / reconnect messages | Restore Wi-Fi/backend at the same IP and DB. The poller reconnects without restarting or clearing its sequence. |
| Feed succeeded but no wag | Check baseline appeared before feed, controller mode, driver error logs, and no later event superseded the feed. Repeated identical state is intentionally ignored. |
| Wag/sound failed | Fix/test the hardware controller first. That sequence is consumed and is not automatically replayed. A new feed needs a new confirmation and sufficient coins. |
| No feed button available | Earn at least 20 coins; check phone URL uses `petId=mochi-01`. |
| Tag/QR opens wrong device or address | Reprogram it with the current laptop IP, frontend port 5173 and `/tap?petId=mochi-01`. |
| Backend restart lost progress | Use the same `DB_PATH` and restart from the launcher; do not replace/delete the SQLite file or sidecars. |
| Backend refuses corrupt/incompatible DB | Preserve the file for diagnosis; use a separate fresh rehearsal DB rather than overwriting it. |
