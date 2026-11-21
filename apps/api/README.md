# Mochi C++20 API

A native C++20 backend using cpp-httplib, nlohmann/json, and SQLite3. The existing
React app consumes the frozen standalone JSON contract without frontend changes.

For the complete phone/NFC/Pi rehearsal, use [HARDWARE_DEMO.md](HARDWARE_DEMO.md):
startup, LAN/firewall checks, controller hookup, live steps, and troubleshooting.

## Squirrel & Tree v2 backend branch

The native v2 work is documented in [FOREST_DEMO.md](FOREST_DEMO.md), with
[contract/FE/hardware gaps](FOREST_CONTRACT_NOTES.md) and
[observed verification](verification/forest-be-results.md). It adds 48-hour
reflection eligibility, deterministic shopping/entertainment clustering using
the existing insight shape, an explicit gated `--seed-forest-demo` command, and
stronger SQLite/date-boundary checks. Old HTTP seed inputs and ledger behavior
remain compatible. New daily_checkin/goal_milestone device emissions require
hardware/shared-contract agreement and remain deferred; the strict poller is
unchanged. The optional squirrel-name preference also awaits a frozen field.

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
and 115 V1 differential transitions and 50 addendum requests against the actual
frontend mock, using the shared TypeScript schemas/domain.
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

The [shared addendum](../../docs/API_ADDENDUM.md) specifies the twelve additive
routes now implemented: preferences, budgets, manual transactions, observed
insights, reflections, lessons, daily reports and check-ins. Its response wrappers
are intentional; V1 response shapes remain direct states. All initialized states
now include preferences, current-month budgetSummary, forest and today.
The primary NFC/QR URL is `/check-in`: opening the daily report is read-only;
only explicit confirmation calls `/api/check-ins`. `/tap?petId=mochi-01` retains
legacy feeding. Both check-in routes share the level-2 gate and one daily reward.


All successful routes return HTTP 200, V1 mutations return AppState directly, and
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

## Budgets and manual transactions (BE-02)

After onboarding, these requests configure targets and record spending:

```sh
curl -s 'http://localhost:3000/api/budgets?month=2026-11'
curl -s -X PUT http://localhost:3000/api/budgets -H 'Content-Type: application/json' -d '{"month":"2026-11","monthlyLimit":500,"dailyLimit":25,"categoryLimits":{"food":100}}'
curl -s http://localhost:3000/api/transactions -H 'Content-Type: application/json' -d '{"requestId":"44444444-4444-4444-8444-444444444444","name":"Lunch","amount":18,"category":"food","occurredAt":"2026-11-19T12:00:00-05:00"}'
curl -s 'http://localhost:3000/api/transactions?month=2026-11'
```

With no other November records, the transaction response has `spentThisMonth:18`,
`remainingThisMonth:482`, and food spending of 18 against a limit of 100. Savings,
XP, acorns, pet and letter state stay unchanged. Inputs/outputs use CAD dollars;
storage and totals use integer cents. Manual submissions always return
`source:"manual"`; seeded records retain `source:"demo"`. Clients cannot set source
or submit computed totals.

Both GET routes require exactly one `month=YYYY-MM` parameter. Writes accept JSON
bodies without query parameters. PUT replaces that month's targets; omitted daily
and category limits become unconfigured. Missing limits and remaining balance are
`null`, while actual spending starts at zero. The daily report's `underDailyLimit`
is also `null` without a daily target; the frozen BudgetSummary has no status field.

Calendar grouping uses `DEMO_TIME_ZONE` (default `America/Toronto`), independent of
the host zone and the offset written in the timestamp. For example,
`2026-11-01T03:59:59.999Z` belongs to October, while `04:00:00Z` belongs to November.
`spentToday` counts only records on the app's current local day within the queried
month. ISO timestamps require a date, time with seconds, and `Z` or an explicit
offset; malformed dates and future purchases fail. Original valid timestamp text
is preserved in responses. Use the same configured timezone across restarts.

Retry a successful transaction with the same UUID and validated payload to avoid
another row. Conflicting reuse returns 409. Invalid inputs return 400 without
changing state or recording the UUID; correcting the input may reuse that ID.

## Spending insights (BE-03)

`GET /api/insights` takes no query parameters and returns `{ "insights": [] }`
when an initialized account has insufficient evidence. It only reads saved
transactions; it never changes rewards, request IDs or stored state.

The frozen rules use an inclusive trailing seven-day lookback ending at the
request's evaluation time, excluding future transactions:

- At least three shopping/entertainment purchases spanning at most four hours
  produce a clustering card. Planned purchases also count. Timestamps are sorted
  with transaction IDs breaking ties; contained windows are omitted. Distinct
  overlapping maximal windows can produce distinct cards.
- At least three exact-name purchases produce a frequency card, including
  `Takeout`. Exact-name grouping is case-sensitive and preserves the existing
  contract behavior for other purchase names too.

Both rules keep manual and demo evidence separate; mixed-source cards are not
supported. Each card uses `kind:"frequency"`, a deterministic ID, count,
`totalAmount` in CAD dollars, `windowDays` (7 or 4/24), provenance and an optional
suggestion expressed with “Consider…”. Totals are summed in integer cents.
Descriptions report recorded purchases without inferring emotions or diagnoses.
Frequency IDs retain the first recorded qualifying transaction ID; cluster IDs
include their first/last sorted transaction IDs. Repeated evaluations of the same
records at the same time yield identical cards. Cards can change as records enter
or leave the trailing lookback; elapsed windows use timestamp instants rather than
calendar days, so DST does not change their duration.

## Worth-It reflections (BE-04)

`GET /api/reflections/due` returns `{ "transactions": [...] }` containing unreviewed
purchases whose timestamp is at least 48 elapsed hours old. The boundary is
inclusive and uses timestamp instants, independent of calendar days and DST.
No records returns an empty array; an account is required.

`POST /api/reflections` accepts exactly `requestId`, `transactionId` and `verdict`
in a JSON body, without query parameters. As confirmed for this ticket, frozen
verdicts remain `worth_it`, `unsure`, and `not_worth_it`; `regret` is not an API
alias. The saved transaction contains `reflection: { verdict, reflectedAt }` and
keeps its original `manual` or `demo` source. The response is `{ transaction,
state }`. These are the user's judgements; the API draws no psychological
conclusions and changes no savings, rewards, goals, pet or letter state.

```sh
curl -s http://localhost:3000/api/reflections/due
# Replace the transactionId with an eligible transaction's actual ID.
curl -s http://localhost:3000/api/reflections -H 'Content-Type: application/json' -d '{"requestId":"55555555-5555-4555-8555-555555555555","transactionId":"txn-44444444-4444-4444-8444-444444444444","verdict":"not_worth_it"}'
```

After saving, the purchase disappears from due results and its reflection remains
visible in transaction reads after restart. Successful UUID retries are idempotent.
A fresh UUID with the same verdict succeeds without changing the saved timestamp;
a different verdict fails. Pre-existing completed reviews remain valid even if
they were saved under the older delay.

| Failure | HTTP / code |
| --- | --- |
| Missing fields, invalid UUID/verdict/JSON, unexpected fields or query parameters | 400 `INVALID_REQUEST` |
| Transaction does not exist | 404 `NOT_FOUND` |
| Account not initialized | 404 `NOT_INITIALIZED` |
| Purchase younger than 48 hours | 409 `REFLECTION_NOT_DUE` |
| Fresh UUID attempts to change a saved verdict | 409 `REFLECTION_EXISTS` |
| Successful UUID reused with conflicting input/operation | 409 `REQUEST_ID_CONFLICT` |

Failed submissions consume no UUID and change no stored state. The reflection and
successful UUID commit atomically, including rollback on storage failures. Reads
are side-effect free.

## Lessons and one-time rewards (BE-05)

`GET /api/lessons` returns `{ "lessons": [...] }` for the two frozen lessons:
`potential-vs-confirmed` (Small steps, real savings) and `budget-target` (Your
spending target). The user confirmed preserving these definitions for BE-05;
needs-vs-wants and emergency-funds topics would require a separate contract change.

Each lesson includes its title, body, question, options, completion flag and
available reward. GET omits `correctOptionId` and feedback; option objects contain
only `id` and `label`. Both lesson routes require an initialized account and reject
query parameters. Answer checking occurs on the server.

```sh
curl -s http://localhost:3000/api/lessons
curl -s http://localhost:3000/api/lessons/answer -H 'Content-Type: application/json' -d '{"requestId":"66666666-6666-4666-8666-666666666666","lessonId":"potential-vs-confirmed","selectedOptionId":"save"}'
```

POST accepts exactly `requestId`, `lessonId`, `selectedOptionId` and returns
`{ correct, feedback, reward, state }`. The first correct answer earns 5 acorns
(`coins`) and 10 XP, atomically with completion and the successful request ID.
Wrong answers return feedback and zero reward without completing the lesson;
they are successful submissions and consume their request ID. Use a fresh ID to
submit a different answer.

Successful retries and fresh IDs for an already completed lesson earn zero and
preserve completion across restarts. Concurrent submissions can earn only once per
lesson. Lessons change no confirmed/potential savings or original letter content.
Existing level thresholds (100/250 XP), unlocks and level-up reactions still apply.

Malformed fields, unknown options and query parameters return 400
`INVALID_REQUEST`; unknown lessons return 404 `NOT_FOUND`; an uninitialized account
returns 404 `NOT_INITIALIZED`. Conflicting reuse of a successful UUID returns 409
`REQUEST_ID_CONFLICT`. Failed requests consume no ID; storage failures roll back
completion, reward, reactions and request history together.

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

SQLite `user_version=2` adds finance defaults in a transaction when opening an
existing v1 database. It retains every original account value and letter byte,
request and decision row, and private reaction/cooldown field. New databases use
the same schema. Budget and transaction amounts remain cents; forest and daily
reports are projections. Successful IDs still commit with mutations. Structured
new endpoints reject conflicting ID/payload reuse; legacy-to-legacy replay keeps
V1 current-state behavior. The original payload's `version:1` remains intact.

### BE-01 schema inspection and migration choice

No additional feature tables or schema version are necessary for this ticket.
Before and after the upgrade, the tables are:

| Table | Columns and constraints |
| --- | --- |
| `app_state` | `id INTEGER PRIMARY KEY CHECK(id=1)`, `payload TEXT NOT NULL` |
| `processed_requests` | `request_id TEXT PRIMARY KEY`, `endpoint TEXT NOT NULL`, `payload TEXT NOT NULL` |
| `decisions` | `request_id TEXT PRIMARY KEY`, `payload TEXT NOT NULL` |

The v1→v2 change adds only `finance` to the singleton JSON payload: budgets keyed
by month, transactions with integer cents and nullable purchase reflections,
unique completed lesson IDs, and cute/calm voice preferences. Squirrel name and
local-day check-in cursor/streak already live in the account. Insights and report
totals remain derived. This is a single local account per database, not a
multi-user relational schema. Lesson and transaction uniqueness is enforced by
stored-state validation; same-day check-in rewards are guarded by the account's
`lastQuestDate`. These are application invariants, not additional SQL constraints;
there is no historical check-in table to protect against a system clock moving
back to a previously rewarded day.

Startup creates v1 tables for a new install, then applies the same ordered upgrade
used for existing databases. `BEGIN IMMEDIATE` covers creation, payload changes,
`user_version`, current-state validation, and table/primary-key compatibility
checks. Any failure rolls back before startup can listen. Version 2 startup only
reads/validates state; it does not rewrite the payload or create duplicate records.
Missing primary keys now fail startup instead of silently weakening deduplication.

Focused tests in `tests/http_tests.py` upgrade a SQLite backup of a representative
v1 account, verify preserved records and repeated startup, forbid v2 payload
rewrites with a trigger, and inject both an update failure and a late schema-check
failure. Each failure retains the original version, payload, and schema/history.

Corrupt JSON, missing state rows, and incompatible database versions fail startup
instead of resetting progress. There is no automatic migration from the retired
Node JSON `DATA_FILE`; use a fresh SQLite path for the C++ demo. Runtime SQLite
files (including WAL/SHM sidecars) and build output are ignored by Git.

## Optional Linux/Python Raspberry Pi extension

The addendum preserves the existing opt-in device extension without adding
`AppState.device`. `ENABLE_DEVICE_API=false` keeps these routes disabled.
Explicitly enabling it adds only:

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
Primary NFC tag / QR: `http://<LAPTOP_LAN_IP>:5173/check-in`.
Optional legacy feed link: `http://<LAPTOP_LAN_IP>:5173/tap?petId=mochi-01`.
Pi polling: `http://<LAPTOP_LAN_IP>:3000/api/device/state`.
Phone health check: `http://<LAPTOP_LAN_IP>:3000/health`.

Find the laptop's Wi-Fi IP with `ipconfig getifaddr en0` on macOS (adjust the
interface), or `hostname -I` on Linux. Phone/Pi and laptop must share a reachable
network. NFC is passive: the primary URL opens the daily report; only the check-in
button posts `/api/check-ins`. The optional legacy feed link requires its separate
confirmation before `/api/feed`. Opening or refreshing either page grants no
reward or spend. Device reactions `daily_checkin` and `goal_milestone` remain
reserved pending hardware-owner agreement; the existing private device shape
and poller reactions are unchanged. The backend implements no NFC reader or GPIO behavior.

See [verification/results.md](verification/results.md) for observed results,
manual checks, contract decisions, and hardware checks still requiring devices.

Addendum verification, including migration/restart and browser screenshots, is
recorded in [verification/addendum-results.md](verification/addendum-results.md).

## Squirrel name and voice settings

`PUT /api/preferences` accepts `petName`, `voice`, or both. At least one field is
required; omitted values stay unchanged. Names use onboarding's trimmed,
nonempty 200-UTF-16-unit limit; voices are cute/calm. The response keeps the name
in `pet.name` and voice in `preferences.voice`. Voice-only clients remain valid.
Both values use existing SQLite account fields and update atomically without a
schema reset, reward or device reaction. No name is added to device state.
See [verification and examples](../../docs/PREFERENCES_VERIFICATION.md).
