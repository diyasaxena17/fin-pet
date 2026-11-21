# Mochi C++20 API

A native C++20 backend using cpp-httplib, nlohmann/json, and SQLite3. The existing
React app consumes the frozen standalone JSON contract without frontend changes.

## Build, test, run

Requires CMake 3.20+, a C++20 compiler with calendar support (Apple Clang 21 tested;
GCC 11+ is suitable on Linux), and SQLite3 development headers. Tests also require
Python 3. cpp-httplib v0.18.3 and nlohmann/json v3.11.3 are vendored with licenses
and checksums in `vendor/`; configuring/building needs no network downloads.
On Debian/Ubuntu, install `build-essential cmake libsqlite3-dev python3`.
On macOS, install Xcode Command Line Tools and CMake; the SDK supplies SQLite.

From the workspace root:

```sh
cmake -S apps/api -B apps/api/build
cmake --build apps/api/build
ctest --test-dir apps/api/build --output-on-failure
apps/api/build/mochi-api
```

For a LAN demo with optional Raspberry Pi integration:

```sh
apps/api/scripts/start-demo.sh
```

The launcher builds the native API, binds `0.0.0.0:3000`, enables device/demo
routes, preserves `apps/api/data/demo.sqlite3`, and prints phone/NFC/Pi URLs.
`LAN_IP` can override automatic IPv4 detection. Use `--no-build` for a subsequent
run after building. `DB_PATH`, `API_HOST`, `PORT`, `DEMO_TIME_ZONE`, and
`MOCHI_BUILD_DIR` can be overridden through the environment. The launcher fails
early if the port is occupied and never resets or seeds an existing account.

Run the existing frontend separately with `pnpm dev:web` and
`VITE_USE_MOCK=false`. Its existing Vite proxy forwards `/api` to port 3000.
`pnpm dev:api` also builds and starts the native executable. There is no hot
reload for C++: stop, rebuild, restart with the same `DB_PATH`.

The C++ executable requires neither Node.js nor Express. Node 22.23.5 and
pnpm 10.34.9 are used only for the existing workspace/frontend checks and the
TypeScript reference test. Existing JS dependency declarations are retained to
keep the root lockfile unchanged; they are not backend runtime dependencies.
After workspace dependencies are installed, `pnpm check` runs the native tests
and 115 differential transitions against the frozen TypeScript schemas/domain.
Standalone CTest has no Node dependency. `-DBUILD_TESTING=OFF` builds without Python.

## Configuration

| Environment | Default | Meaning |
| --- | --- | --- |
| `API_HOST` | `0.0.0.0` | Bind interface; use `127.0.0.1` for laptop-only use |
| `PORT` | `3000` | Integer port, 1–65535 |
| `DB_PATH` | absolute `apps/api/data/mochi.sqlite3` under the configured source tree | SQLite database; explicit relative paths resolve from process working directory |
| `DEMO_MODE` | `false` | Exact `true` registers demo seed/reset |
| `ENABLE_DEVICE_API` | `false` | Exact `true` registers the separate hardware extension |
| `DEMO_TIME_ZONE` | `America/Toronto` | Installed IANA zone used for calendar-day quests, independently of host timezone |

The executable reads **process environment**. It does not automatically load
root `.env` or consume the historical `DATA_FILE` setting. Export variables or
prefix the run command as above. Invalid flags, timezone, port, empty database
path, incompatible storage, and bind failures stop startup with a nonzero exit.
The source-relative default DB path is fixed at CMake configuration time; use
an explicit `DB_PATH` when moving the executable elsewhere.

## Frozen API

All successful routes return HTTP 200, mutations return AppState directly, and
responses carry `Cache-Control: no-store`. Before onboarding, `/api/state`
returns only `{"initialized":false}`. Other account actions return 404 until
onboarded. Repeated onboarding returns 409.

| Method | Route | Request |
| --- | --- | --- |
| GET | `/health` | none; returns `{"ok":true}` |
| GET | `/api/state` | none |
| POST | `/api/onboarding` | `petName`, `goalTitle`, `goalTarget`, optional `goalDate`, three-part `letter` |
| PUT | `/api/letter` | `{letter:{vision,why,reminder}}` |
| POST | `/api/decisions` | UUID `requestId`, `itemName`, CAD `amount`, `decision: "skip"` or `"buy"` |
| POST | `/api/savings` | UUID `requestId`, CAD `amount` |
| POST | `/api/feed` | UUID `requestId`, `petId: "mochi-01"` |
| POST | `/api/quests/complete` | UUID `requestId`, `questId: "daily-check-in"` |
| POST | `/api/demo/seed` | optional `xp: 0/100/250`, CAD `confirmedSaved`, integer `coins`; demo only |
| POST | `/api/demo/reset` | `{}`; demo only |

Amounts are CAD numeric dollars, $0.01–$1,000,000,000, at most two decimal
places. Demo savings may be zero. Balance arithmetic and decision history use
integer cents and reject safe-integer overflow. Names are trimmed and limited to
200 UTF-16 units; letter whitespace is preserved, each part up to 4,000 units.
Strict object schemas reject unknown fields, invalid dates/UUIDs/types, malformed
JSON, excessive nesting, and request bodies over 64 KiB with HTTP 400.

Skip awards `min(ceil(amount),100)` coins and 20 XP, and adds only potential
savings. Buy records a decision with no reward or penalty. Self-reported savings
add confirmed savings and 30 XP; no money is transferred. Letter reveal thresholds
are 25%, 50%, 100% confirmed progress; authors always receive/edit their full text.
Levels at 100/250 XP derive the exact frozen unlock list. Feed costs 20 coins,
adds up to 30 fullness (maximum 100), sets a happy mood, and leaves XP unchanged.
A level-2 daily check-in gives 10 coins/20 XP once per configured local calendar
day, even with a fresh ID. Consecutive-day streaks survive restarts; missing a
day resets the consecutive count without subtracting earned progress.

Errors use the frozen envelope and codes, for example:

```json
{"error":{"code":"INSUFFICIENT_COINS","message":"You need 20 Mochi coins to feed your pet."}}
```

Invalid requests return 400, unavailable/uninitialized routes 404, onboarding,
coin, quest, and balance conflicts 409, and storage/internal failures 500.
Disabled demo routes and legacy `/api/onboard` and `/api/pet/feed` return 404.

## Copyable demo

Use a fresh `DB_PATH`, or reset an existing throwaway demo account first.
Keep each operation's UUID when retrying it; use a new UUID for a new action.

```sh
curl -s http://localhost:3000/health
curl -s http://localhost:3000/api/state
curl -s http://localhost:3000/api/onboarding -H 'Content-Type: application/json' -d '{"petName":"Mochi","goalTitle":"Emergency fund","goalTarget":200,"letter":{"vision":"A secure future.","why":"More choices.","reminder":"Small steps count."}}'
curl -s http://localhost:3000/api/decisions -H 'Content-Type: application/json' -d '{"requestId":"11111111-1111-4111-8111-111111111111","itemName":"Hoodie","amount":60,"decision":"skip"}'
curl -s http://localhost:3000/api/savings -H 'Content-Type: application/json' -d '{"requestId":"22222222-2222-4222-8222-222222222222","amount":50}'
curl -s http://localhost:3000/api/feed -H 'Content-Type: application/json' -d '{"requestId":"33333333-3333-4333-8333-333333333333","petId":"mochi-01"}'
```

Expected result: 40 coins, 50 XP, $60 potential savings, $50 confirmed savings,
25% goal progress, one revealed letter section, fullness 80, happy pet.
With `DEMO_MODE=true`, judges can use:

```sh
curl -s http://localhost:3000/api/demo/seed -H 'Content-Type: application/json' -d '{"xp":100}'
curl -s http://localhost:3000/api/demo/seed -H 'Content-Type: application/json' -d '{"xp":250,"confirmedSaved":100}'
curl -s http://localhost:3000/api/demo/reset -H 'Content-Type: application/json' -d '{}'
```

Seeding preserves unspecified values, sets persistent `demoSeeded:true`, and
creates no earned activity. Reset clears the account, decisions and successful
request IDs. Keep this single-user, unauthenticated demo on a trusted local
network; do not enable demo controls on public hosting.

## SQLite and retries

Each mutation holds an application mutex, executes `BEGIN IMMEDIATE`, loads the
persisted state, checks a global account UUID, applies the action, saves state
and decision history, inserts the successful UUID, and commits. Every exception
rolls back. Readers use the same mutex and load SQLite directly. WAL mode,
`FULL` synchronization, a five-second busy timeout, prepared statements, and
RAII statements/connections keep writes and restart behavior predictable.

`app_state` stores versioned JSON with integer-cent account fields and private
hardware metadata. `processed_requests` stores global UUIDs and original request
payloads; `decisions` stores decision history with cents and creation timestamps.
Retries return **current** state across routes, matching the shared domain's
global UUID semantics; a successful ID is not a way to submit another operation.
Failed actions consume no ID. Buy decisions and fresh-ID same-day quest no-ops
are successful requests and do consume their UUIDs.

Corrupt JSON, missing state rows, and incompatible database versions fail startup
instead of resetting progress. There is no automatic migration from the retired
Node JSON `DATA_FILE`; use a fresh SQLite path for the C++ demo. Runtime SQLite
files (including WAL/SHM sidecars) and build output are ignored by Git.

## Optional Linux/Python Raspberry Pi extension

The active frozen contract explicitly removed device endpoints and `AppState.device`.
To resolve the attached prompt's conflict without changing shared contracts,
`ENABLE_DEVICE_API=false` preserves those 404s. Explicitly enabling it adds only:

- `GET /api/device/state`: exactly `petId`, `mood`, `hunger`, `reactionSeq`,
  `reactionType`; never names, purchases, goals, or letter text. Before onboarding,
  returns `NOT_INITIALIZED`/404. Initial reaction type is null.
- `POST /api/device/gesture`: `{"gesture":"open_palm"}`, returns the same
  minimal device shape. Greetings are limited to one event per three seconds,
  with cooldown persisted across restarts. Suppressed greetings return unchanged
  device state, HTTP 200. Gestures grant no coins/XP/savings.

```json
{"petId":"mochi-01","mood":"happy","hunger":80,"reactionSeq":1,"reactionType":"feed"}
```

Successful feeds increment the persisted sequence once, including at full hunger;
UUID retries and GETs never increment it. Earned level crossings emit `level_up`;
demo seed emits no reaction. Gestures emit `greeting`. Account reset retains the
monotonic sequence but clears the reaction type, so connected pollers do not lose
their baseline. Replacing the database requires taking a new baseline.

The hardware developer owns GPIO, servo, audio and camera code. The poller can
load that existing Python module and call its no-argument `wag_tail()` function
only on new feed reactions. Sound is explicitly opt-in via `--sound` and requires
a no-argument `play_happy_sound()`. Module names and `.py` file paths are supported.
Without a controller, it runs in dry-run mode and prints observed events:

```sh
python3 apps/api/examples/poll_device.py http://<LAPTOP_LAN_IP>:3000 --dry-run
# Once the existing hardware controller is available on the Pi:
python3 apps/api/examples/poll_device.py http://<LAPTOP_LAN_IP>:3000 \
  --controller /home/pi/mochi/controller.py --sound
```

The first valid snapshot on every boot is a baseline without animation, even
if it contains an old `feed`. Polls default to once per second. Temporary failures
retry automatically with exponential delay capped at eight seconds; reconnects
retain the cursor. Malformed responses do not advance it. Each observed sequence
is consumed before invoking hardware, so a controller/sound error will not retry
the same motion. SIGINT/SIGTERM stop cleanly. A per-user file lock prevents a
second controller process; override `--lock-file` only for isolated tests.

This is at-most-once dispatch, not guaranteed delivery: a crash during actuation
can omit a wag. The frozen endpoint exposes the latest reaction, not a queue;
multiple events while disconnected or between polls may coalesce or be superseded.
Keep the poller online before feeding and avoid concurrent gesture/quest actions
during the hardware demo. GETs do not consume events. Replacing the database
rebaselines a decreased sequence rather than replaying its old state.

Phone app: `http://<LAPTOP_LAN_IP>:5173/`.
NFC tag / QR contents: `http://<LAPTOP_LAN_IP>:5173/tap?petId=mochi-01`.
Pi polling: `http://<LAPTOP_LAN_IP>:3000/api/device/state`.
Phone health check: `http://<LAPTOP_LAN_IP>:3000/health`.

Find the laptop's Wi-Fi IP with `ipconfig getifaddr en0` on macOS (adjust the
interface), or `hostname -I` on Linux. Phone/Pi and laptop must share a reachable
network. NFC is passive: it opens the frontend confirmation; only confirming on
that page posts `/api/feed`. Scanning, opening, refreshing and cancelling do not
spend coins. The backend implements no NFC reader or GPIO behavior.

See [verification/results.md](verification/results.md) for observed results,
manual checks, contract decisions, and hardware checks still requiring devices.
