# Fourteen-day financial sandbox

This is a synthetic, read-only replay with one complete local-day snapshot for
each of 14 consecutive days. It runs in `<DB_PATH>.sandbox14.sqlite3` and never
opens or changes the real account at `DB_PATH`. The persisted schedule, selected
day, fixed clock, ledger, application state and request history survive restart.
An ownership marker prevents replacing an unrelated initialized sidecar database.

## Seed, select a day and serve it

Build with the repository's pinned toolchain, then from the repository root:

```sh
pnpm --filter @mochi/api build
export DEMO_MODE=true
export DEMO_SANDBOX=true
export DB_PATH=/tmp/mochi-replay.sqlite3
export DEMO_TIME_ZONE=America/Toronto
export DEMO_SANDBOX_START=2026-11-08

# Existing seed flow enters 14-day mode when DEMO_SANDBOX=true.
apps/api/build/mochi-api --seed-forest-demo > /tmp/mochi-day14.json
# Equivalent explicit command: apps/api/build/mochi-api --seed-sandbox

# Select day 3 (end of November 10 for this start date).
apps/api/build/mochi-api --sandbox-day 3 > /tmp/mochi-day3.json
API_HOST=127.0.0.1 PORT=3000 apps/api/build/mochi-api
```

Point the existing frontend at this API using its established configuration.
Dashboard, budget, transactions, insights, reflections, lessons and daily report
use the selected clock and snapshot through their unchanged JSON shapes. The
snapshot is read-only, as confirmed for this task: writes return 409 with the
existing `INVALID_REQUEST` error shape, without changing state or consuming IDs.
Scripted lessons, decisions, savings and check-ins have already run through the
existing backend reward rules up to the selected time.

To change day, stop the server, select another day, then restart it:

```sh
apps/api/build/mochi-api --sandbox-day 9 > /tmp/mochi-day9.json
API_HOST=127.0.0.1 PORT=3000 apps/api/build/mochi-api
```

A process lease rejects selection/export while this sandbox server is running,
preventing a new snapshot from being served with an old clock. Rewinding rebuilds
all progress and successful IDs from the persisted schedule; it does not carry
future spending, rewards, contributions, reviews or milestones backwards.
Selection is atomic: a failed replay leaves the old state, clock and history intact.

`--sandbox-ledger` exports the current day's typed financial ledger while the
server is stopped. `--seed-sandbox` replays day 14, without multiplying records or
rewards. Day selection accepts 1–14. The start date and timezone become immutable
for that sidecar; choose a new DB_PATH for a different period. If start date is
omitted on first initialization, the period ends on the current local date;
subsequent restarts retain that original period. Start years 1971–9998 are supported.
All sandbox commands require DEMO_MODE=true and explicit persistent DB_PATH.

## The two-week story

All amounts below are CAD. Events have stable IDs, actual timestamp instants,
merchant names, categories, types and `source: demo`. Recurring rent, transit,
phone/subscription bills and small household purchases keep the scenario grounded.

| Metric | Week 1 | Week 2 |
| --- | ---: | ---: |
| Simulated payroll income | $1,250 | $1,250 |
| Spending | $791.74 | $471.75 |
| Takeout purchases | 6 | 1 |
| Savings contributions | $10 | $190 |
| Simulated investment contributions | $5 | $115 |
| Daily spending target | $75 | $25 |
| Monthly spending target | $2,000 | $1,750 |

Week 1 includes repeated takeout, coffee, impulse shopping and a three-purchase
shopping/entertainment cluster within 75 minutes on day 3. A wrong lesson answer
is followed by a correct one; an aged takeout purchase is marked not_worth_it on
day 4. Week 2 uses meal preparation, planned treats, skipped impulse purchases,
daily savings/investment contributions and explicit check-ins after level 2 unlocks.
Scheduled rent and grocery days can honestly exceed the daily target; no spending
is hidden to manufacture an under-budget result. Existing exact-name frequency
rules can still report recurring household purchases in Week 2; the earlier
Takeout/impulse-cluster evidence ages out naturally.

| Replay day | Confirmed goal savings | Tree | Original letter sections |
| --- | ---: | --- | ---: |
| 7 | $10 | seedling | 0 |
| 9 | $50 | sapling | 1 |
| 11 | $100 | young | 2 |
| 13 | $160 | mature | 2 |
| 14 | $200 | thriving | 3 |

Day 14 has 590 XP and 355 acorns, earned by the unchanged savings, decision,
lesson and check-in rules. Replay does not repeatedly award them. Skipping a
purchase increases potential savings only; it is not a cash transfer.

## Accounting and the frozen API

The API transaction type is an expense-only purchase shape. It remains unchanged:
only expense events enter `/api/transactions`, budgets, reports and purchase-based
insights/reflections. Takeout expenses use the existing `Takeout` purchase label
for the frozen frequency rule; their actual merchant names remain in the ledger.

The native typed ledger separately records `income`, `expense`,
`savings_contribution`, `investment_contribution`, `investment_return`, `budget`,
`decision`, `lesson`, `reflection` and `check_in`. Income and investment types are
not invented as public purchase categories. Exported amounts and balances are CAD
dollars; persistence/calculations use integer cents. The existing dashboard sees
expenses and goal progress; income/portfolio balances are available in the native
ledger because the frozen API has no fields for them.

Opening cash is $250. At day 14: income $2,500, expenses $1,263.49, savings $200,
investment principal $120, remaining cash $1,166.51. Investment value is $120.19:
$120 contributed plus **$0.19 in explicitly simulated illustrative gains**. Those
gains never increase cash, income, goal savings or XP. They are deterministic
fiction, not market data, actual investment performance or forecasts. No bank or
brokerage connection is claimed.

## Isolation and verification

The real DB, old onboarding/seed/reset flow and shared contracts remain intact.
Unset DEMO_SANDBOX and omit sandbox commands to use ordinary interactive mode.
Without DEMO_SANDBOX, --seed-forest-demo retains its original six-example behavior.
Replay mode always disables device routes, even if ENABLE_DEVICE_API=true: a
rewinding simulation must not send real hardware events.

Focused tests cover all 14 days, exact balances/rewards/milestones, expenses-only
accounting, future exclusion, month boundaries, Toronto DST, historical reports,
read-only writes, actual process restarts, real-account/sidecar ownership isolation,
invalid clock configuration, lease conflicts, reproducibility and injected SQLite
rollback. Run `ctest --test-dir apps/api/build -R sandbox --output-on-failure` and
`pnpm check`. No physical phone/NFC/speaker/Raspberry Pi verification is implied.
