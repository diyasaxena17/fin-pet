# Squirrel & Tree v2 — native API rehearsal

This runbook exercises the C++ service only. The FE route change and new device
reaction names have the blockers recorded in [FOREST_CONTRACT_NOTES.md](FOREST_CONTRACT_NOTES.md).
A successful HTTP rehearsal does not establish physical phone/NFC/Pi integration.

## Build, test, start

Use CMake 3.20+, a C++20 compiler, SQLite3 development headers and Python 3.
Node 22.23.5 / pnpm 10.34.9 are only needed for workspace checks/reference tests.
From the repository root:

```sh
cmake -S apps/api -B apps/api/build
cmake --build apps/api/build
ctest --test-dir apps/api/build --output-on-failure
```

In terminal 1, create an isolated persistent demo database and start the server:

```sh
FOREST_DEMO_DIR="$(mktemp -d "${TMPDIR:-/tmp}/forest-be.XXXXXX")"
export DB_PATH="$FOREST_DEMO_DIR/state.sqlite3"
export API_HOST=0.0.0.0 PORT=3000
export DEMO_TIME_ZONE=America/Toronto
export DEMO_MODE=true ENABLE_DEVICE_API=true
printf 'DB_PATH=%s\n' "$DB_PATH"
apps/api/build/mochi-api
```

The API listens on port 3000; the unchanged frontend's Vite proxy uses 5173.
Restart the process with the same DB_PATH to retain state. Only one API server
uses a given database; the explicit seeding command below takes its own SQLite
write transaction without starting another HTTP server. Set API_HOST=127.0.0.1
for laptop-only use. `GET /health` confirms startup.

In terminal 2, export the **same explicit DB_PATH** printed by terminal 1, then:

```sh
export DEMO_MODE=true
export DB_PATH=/replace/with/the/printed/state.sqlite3
FOREST_API=http://127.0.0.1:3000
curl --fail-with-body "$FOREST_API/health"
curl --fail-with-body "$FOREST_API/api/state"
```

For the fresh demo account only, initialize a $200 goal and original letter:

```sh
curl --fail-with-body "$FOREST_API/api/onboarding" -H 'Content-Type: application/json' \
  -d '{"petName":"Maple","goalTitle":"Emergency fund","goalTarget":200,"letter":{"vision":"  A secure future.\n","why":"More choices.","reminder":"Small steps count."}}'
```

For an existing initialized user, continue with their existing account and letter.
Daily check-ins retain the existing level-2 gate (100 XP). This preview command
sets an isolated demo user to that level without an earned reward/reaction:

```sh
curl --fail-with-body "$FOREST_API/api/demo/seed" -H 'Content-Type: application/json' -d '{"xp":100}'
```

## Budget, recorded spend and read-only report

```sh
FOREST_MONTH="$(curl --fail-with-body "$FOREST_API/api/reports/today" | python3 -c 'import json,sys; print(json.load(sys.stdin)["date"][:7])')"
FOREST_OCCURRED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
curl --fail-with-body -X PUT "$FOREST_API/api/budgets" -H 'Content-Type: application/json' \
  -d "{\"month\":\"$FOREST_MONTH\",\"monthlyLimit\":500,\"dailyLimit\":25}"
curl --fail-with-body "$FOREST_API/api/transactions" -H 'Content-Type: application/json' \
  -d "{\"requestId\":\"11111111-1111-4111-8111-111111111101\",\"name\":\"Takeout\",\"amount\":18,\"category\":\"food\",\"occurredAt\":\"$FOREST_OCCURRED_AT\"}"
curl --fail-with-body "$FOREST_API/api/budgets?month=$FOREST_MONTH"
curl --fail-with-body "$FOREST_API/api/transactions?month=$FOREST_MONTH"
curl --fail-with-body "$FOREST_API/api/reports/today"
```

For the fresh demo account before adding examples, spending is $18 this month
and $18 today, daily target
$25 and remaining monthly budget $482. XP, acorns and goal savings are unchanged.
Retain both UUID and identical request body for transaction retries. Changing
its timestamp or amount with that UUID returns REQUEST_ID_CONFLICT.
Report GETs and device polls never claim rewards. Missing limits are null.

## Explicit synthetic examples and 48-hour review

```sh
apps/api/build/mochi-api --seed-forest-demo
curl --fail-with-body "$FOREST_API/api/insights"
curl --fail-with-body "$FOREST_API/api/reflections/due"
curl --fail-with-body "$FOREST_API/api/reflections" -H 'Content-Type: application/json' \
  -d '{"requestId":"11111111-1111-4111-8111-111111111102","transactionId":"txn-demo-forest-takeout-1","verdict":"worth_it"}'
```

The command requires DEMO_MODE=true and explicit DB_PATH. It adds three $18
Takeout records aged 70–72 hours and three shopping/entertainment records totaling
$35 in a one-hour window. All six have source=demo; the manually logged $18 keeps
source=manual. Frequency evidence reports **three demo takeouts totaling $54**;
manual and demo provenance are separate. Clustering reports three demo records
with windowDays=4/24. No bank connection or emotional state is inferred.

All three aged purchases are eligible for review. Worth-It verdicts are
worth_it, unsure, not_worth_it; reviews grant zero reward. Repeating this seed
command adds zero records and preserves timestamps and saved reviews. Its output
is a count, not an HTTP response. The old HTTP seed body remains unchanged.
Demo examples count toward spending in their actual local months/days, including
previous months at a month boundary. They never add goal savings or wallet XP.

## Lessons, check-in aliases and confirmed saving

```sh
curl --fail-with-body "$FOREST_API/api/lessons"
curl --fail-with-body "$FOREST_API/api/lessons/answer" -H 'Content-Type: application/json' \
  -d '{"requestId":"11111111-1111-4111-8111-111111111103","lessonId":"potential-vs-confirmed","selectedOptionId":"save"}'
curl --fail-with-body "$FOREST_API/api/device/state"
curl --fail-with-body "$FOREST_API/api/check-ins" -H 'Content-Type: application/json' \
  -d '{"requestId":"11111111-1111-4111-8111-111111111104"}'
curl --fail-with-body "$FOREST_API/api/quests/complete" -H 'Content-Type: application/json' \
  -d '{"requestId":"11111111-1111-4111-8111-111111111104","questId":"daily-check-in"}'
curl --fail-with-body "$FOREST_API/api/savings" -H 'Content-Type: application/json' \
  -d '{"requestId":"11111111-1111-4111-8111-111111111105","amount":50}'
curl --fail-with-body "$FOREST_API/api/state"
```

Correct lessons give 5 acorns/10 XP once per lesson; repeats return zero new
reward. Wrong answers give feedback and zero reward; a different answer uses a
new UUID. The second static lesson is budget-target with option limit.
Check-in gives 10 acorns/20 XP once per configured local day, across BOTH routes,
UUIDs and restarts. At this XP, a check-in currently emits no new device reaction:
the strict legacy poller cannot accept daily_checkin yet. Existing earned level
crossings may still emit level_up. GETs and seed commands emit no reaction.

A real $50 contribution toward $200 yields confirmedSaved=50, sapling at 25%,
and the first original letter section. Spending and skipped decisions alone do
not grow or shrink that tree. An over-target day cannot subtract XP or savings.

Restart terminal 1 with the same environment/DB_PATH, then replay the exact
requests: transactions and reviews remain single records, lesson/check-in
rewards remain claimed, and the $50 contribution remains $50. Device state still
exposes exactly petId, mood, hunger, reactionSeq and reactionType. Feed remains
supported with its original 20-acorn cost and deduplicated feed reaction.

## Native scenario test

`ctest` runs the real HTTP scenario as part of the HTTP target. To run only the
new process/restart scenario with an existing build:

```sh
python3 apps/api/tests/http_tests.py apps/api/build/mochi-api \
  HttpTests.test_forest_scenario_and_replays_persist_with_existing_device_contract
```

This test also races awards for both lessons, races the first check-in through
both entrypoints, checks read-only snapshots, verifies exact letter retention,
and tests the existing feed event/replay. It deliberately does not claim the
blocked new check-in/goal event assertions or physical phone/Pi behavior passed.
