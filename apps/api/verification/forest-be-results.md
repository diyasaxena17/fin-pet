# Squirrel & Tree v2 backend verification — November 21, 2026

Branch: `feat/forest-be`, based on main `8afa0a7`. Changes are limited to
`apps/api/**`. The C++20/CMake/cpp-httplib/nlohmann-json/SQLite service remains
intact. No frontend, shared-contract/domain, root lockfile or hardware code was
edited. No merge, push or deployment was performed.

The separate DEVELOPMENT_PLAN.md and API_CONTRACT_ADDENDUM.md files are absent
from this checkout and fetched main. The user confirmed the pasted prompt is the
v2 requirement. Existing source, API README, old API contract/addendum and prior
verification records were inspected before edits. Differences are recorded in
[FOREST_CONTRACT_NOTES.md](../FOREST_CONTRACT_NOTES.md).

## Application change / milestone status

| Milestone | Backend result |
| --- | --- |
| SQLite migration | Existing v1→v2 migration retained; finance fields already store these features, so no extra schema bump/reset was needed. Live and post-action validation now require complete v2 state. Injected migration failure leaves version, payload and UUID history unchanged. |
| Budgets / transactions | Existing endpoints retained and exercised. Server totals use cents; actual spend and retries never add savings/XP. Over-target spending preserves the existing tree, letter, rewards and pet. |
| Insights | Added deterministic ≥3 shopping/entertainment purchases within ≤4 hours, with exact boundaries, sorted timestamps and stable IDs. Existing seven-day exact-name frequency, including Takeout, remains. Manual/demo evidence is separate. No inferred emotional state. |
| Reflections | Native v2 eligibility is 48 elapsed hours for both due and submit. Exactly-48h accepted; earlier rejected. Existing 24h-era reviews retain verdict/timestamp and stay stable on retries/restart. |
| Lessons | Existing two static lessons and server answer checking retained. Concurrent fresh-ID correct answers award once per lesson; both lesson completions survive restart. |
| Reports / check-ins | GETs are read-only. First completion raced through both routes with the same UUID awards once; fresh IDs and restarts do not repeat it. Local day is now captured after acquiring the mutation transaction, rather than before waiting for the lock. Existing Toronto midnight/streak tests remain passing. |
| Preferences / tree | Voice cute/calm and old onboarding remain. Tree uses the frozen shared stages and confirmed savings only. Optional name preference needs an agreed wire field. |
| New device reactions | **Blocked**: the strict existing hardware poller and shared DeviceState type do not accept daily_checkin/goal_milestone. Their emission is deferred; existing gated private state, cursor, feed/level/greeting events and replay remain compatible. |
| Demo data | Added explicit native --seed-forest-demo, requiring DEMO_MODE=true and explicit DB_PATH. Six source=demo records, including aged Takeout records and a recent cluster, persist atomically. Reruns preserve IDs, times and reviews; no wallet/goal/letter/device reward changes. Old HTTP seed behavior is unchanged. |
| Scenario / docs | Native process/restart scenario and curl runbook added. The new device-event assertion and physical end-to-end integration are not claimed as passed. |

## Validation

- [x] `pnpm check` passed using Node **22.23.5**, pnpm **10.34.9**, with the normal
  pre-commit hooks. No hook bypass or dependency/lockfile changes.
- [x] Native CMake configure/build passed and **all four CTest targets passed**:
  core, HTTP, launcher startup, and the unchanged poller tests.
- [x] The HTTP target now has **23 real HTTP/process tests**, including temporary
  SQLite files, real process restarts and injected failures.
- [x] Existing **115 V1 reference transitions** and **50 legacy-compatible
  API/mock fixture requests** still pass.
- [x] New native tests cover the 48h and 4h boundaries, seven-day cutoff, source
  separation, ordering, cents, stable reviews, first-award races and full stored
  state/ID replay across restart.
- [x] Frozen response fields are preserved. Clustering uses kind=frequency and
  windowDays=4/24, with no new evidence keys. Shared v2 behavior still needs
  reconciliation by the contract/FE owner; this is not full v2 API/mock parity.
- [ ] A fresh `pnpm install --frozen-lockfile` was not rerun; existing installed
  dependencies and the unchanged lockfile were used.

The pre-existing nonfatal Zod/Rollup annotation warnings remain during the web
build, which is run by the root check without changing frontend sources.

## Observed native scenario

The scenario uses an existing level-2 account after a process restart:

1. Preserve the author's whitespace/newline letter and $200 goal.
2. Save $500 monthly / $25 daily limits and calm voice. Record $18 manual
   Takeout: budget $18, report $18, no reward/savings change. UUID retry stays one
   transaction.
3. Seed three additional demo takeouts aged 70–72h and three demo cluster
   records. Frequency evidence is count=3 / $54 / source=demo; manual spending is
   not represented as synthetic or bank-connected evidence.
4. Reflect on one aged demo record. Repeat the UUID: identical verdict/time.
5. Race six correct answers per static lesson with fresh IDs: exactly 5 acorns /
   10 XP per lesson.
6. Race the first daily completion across check-ins and quests/complete with a
   shared UUID: one 10-acorn/20-XP award. A fresh-ID retry awards zero. Repeated
   report/state reads leave the persisted payload and request rows unchanged.
7. Record real $50: confirmedSaved=50, sapling/25%, first exact original letter
   section revealed. Repeat after restart: no doubled contribution or XP.
8. Exercise the existing paid feed and poll its five-key device state: one new
   feed sequence, no duplicate on replay. **This is the compatible legacy event,
   not the blocked new check-in or goal-milestone event.**
9. Restart the C++ process against the same DB: state, preference, budgets,
   transactions, insights, review, two completed lessons, check-in and device
   cursor match. Replays consume no additional reward or reaction; re-seeding
   adds zero records.

A separate over-budget scenario starts with an already-grown sapling, records
$26 against a $25 daily target, and observes underDailyLimit=false without any
loss of confirmed/potential savings, tree progress, XP, letter or pet state.
A skipped shopping decision adds only its original potential savings/reward.

## Manual checks, blockers and limits

- [x] Real local C++ HTTP, native CLI, SQLite migration/failure and process restart
  behavior were observed through the executable test harnesses.
- [ ] New desktop/mobile UI journeys were not exercised on this backend-only
  branch; the unchanged frontend still maps /tap to feeding and /check-in to its
  existing daily report. FE owns the requested /tap route change.
- [ ] No physical phone, NFC/QR scan, Pi, motor or speaker test was performed.
  Existing software poller tests do not establish physical integration.
- [ ] Hardware/shared owners must accept new reaction names and precedence before
  new daily-check-in/goal-milestone emissions can be enabled compatibly.
- [ ] FE/shared owner must reconcile 48h reviews and clustering with the old
  shared mock/docs, freeze the discretionary categories/evidence convention, and
  choose the optional name-preference field. HTTP-driven transaction demo seed
  inputs also need agreement if desired; the native command is ready now.

Startup commands, ports, curl inputs, expected evidence and retry steps:
[FOREST_DEMO.md](../FOREST_DEMO.md).
