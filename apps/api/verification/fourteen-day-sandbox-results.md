# Fourteen-day financial sandbox verification

Implemented a deterministic, timestamped two-week replay entirely in apps/api.
The user confirmed read-only day snapshots. Ordinary API/demo contracts and shared
packages remain unchanged; no dependencies were added.

## Delivered behavior

- Stable typed events cover 14 consecutive local dates, payroll, recurring bills,
  household purchases, takeout, impulse shopping, savings/investment transfers,
  illustrative investment gains, lessons, reflection and positive decisions.
- Week 1 spends $791.74, saves $10 and invests $5; Week 2 spends $471.75,
  saves $190 and invests $115. Payroll is $1,250 per week.
- Final balances: $1,166.51 cash, $200 confirmed savings, $120 investment principal,
  $0.19 simulated gain and $120.19 simulated portfolio value. No transfer/return
  is counted as expense, cash income, or extra goal savings.
- Existing reward rules produce 590 XP/355 acorns. Goal milestones appear on days
  9/11/13/14: sapling/young/mature/thriving; the original scripted letter reveals
  1/2/2/3 sections. No future progress leaks backwards.
- Existing API reads use the persisted selected day at local end-of-day. Writes
  in replay mode return 409 INVALID_REQUEST without changing state or IDs.
- Native --sandbox-day selects days 1..14; --sandbox-ledger exports only the
  selected prefix. --seed-sandbox and DEMO_SANDBOX=true --seed-forest-demo replay
  day 14 reproducibly. A lease requires stopping the server before selection.
- Income/investment types live in the private typed ledger. The frozen purchase
  API exposes expenses only. No fabricated public category/response field was added.
- DB_PATH is never opened in replay mode: the separate .sandbox14.sqlite3 sidecar
  persists the schedule, clock, state, ledger and successful request history.
  Unowned initialized v1/v2 sidecars are rejected before startup migration.
- Replay device routes stay disabled even when ENABLE_DEVICE_API=true, so rewind
  cannot send hardware effects. Ordinary interactive mode is unchanged.

## Commands actually run

| Command | Result |
| --- | --- |
| `cmake -S apps/api -B apps/api/build && cmake --build apps/api/build -j 2` | Passed after correcting an initial new JSON/string comparison compile error |
| `apps/api/build/mochi-sandbox-tests` | Passed |
| `ctest --test-dir apps/api/build -R sandbox --output-on-failure` | 2/2 passed |
| `ctest --test-dir apps/api/build --output-on-failure` | 6/6 passed, 9.75 seconds |
| `PATH=/private/tmp/mochi-toolchain/bin:$PATH pnpm check` | Passed, repeated after the final pre-migration ownership guard |
| `git diff --check` | Passed |

Node 22.23.5 and pnpm 10.34.9 match repository pins. HTTP suites used localhost
access. The final full check includes all six native suites, 115 C++/reference
transitions, 66 mock parity requests, workspace tests/typechecks/builds and hook
tests. All existing migration, old demo, feeding, quest, letter and restart
regressions passed.

## Focused evidence

C++ tests replay every day for a standard period, month-crossing period and
Toronto spring DST period. They independently reconcile each cash delta, expense
counts/report totals, future exclusion, target history, streaks, exact savings,
portfolio separation, fixed reward totals and milestone dates. Same schedule/day
produces identical state. Rewinds remove future transactions and achievements.

Real-process HTTP tests verify day 3 insights/reflection age against the fixed
clock, day 9 goal/letter/streak, restart persistence and exact rewind equality.
Rejected writes preserve state/request history. Tests preserve a real account's
payload/IDs and reject unrelated initialized sidecars, including a v1 fixture
without changing its version/payload. An injected request-insert failure rolls
back state, clock, decisions and request history together. Invalid days, start
configuration, timezone changes, production gating and concurrent selection fail
without altering the selected dataset.

## Use and limits

See ../SANDBOX.md for startup/day-selection commands and accounting details.
Day selection is native and requires server restart; no frontend files or public
control routes were changed. Ledger income/portfolio balances are exported natively
because the frozen API has no such fields. Day snapshots are historical end-of-day
views; they do not support interactive edits or intraday selection. Exact-name
frequency cards may still honestly describe recurring essentials in Week 2.
All investment gains are explicitly labeled deterministic simulation, not real
performance or a forecast; no bank/brokerage connection is claimed.

No manual browser, physical phone/NFC, speaker or Raspberry Pi/actuator checks
were performed. Automated tests observed real local backend/SQLite restarts using
temporary files. No live user DB or runtime data was added to Git.
