# Shared API addendum — November 21, 2026

This is the additive FE/BE contract for the next implementation. V1 endpoints,
fields, request bodies and rewards remain compatible. `AddendumMochiApi` extends
`MochiApi`; `AddendumInitializedAppState` extends the V1 initialized state. The
legacy interfaces remain available during owner rebases. Runtime completion is
recorded separately in the verification record, not implied by this specification.
`wallet.coins` remains the wire field; the product label is **acorns**. Internal
`pet.id` remains `mochi-01`. Onboarding is unchanged.

## Routes

All successes are 200 with `Cache-Control: no-store`. Existing mutations retain
their direct AppState response. New endpoints use the exact shapes below.
All account routes return `NOT_INITIALIZED`/404 before onboarding. Objects are
strict: unknown properties, duplicate query parameters and malformed dates fail
with `INVALID_REQUEST`/400. Month query parameters are required.

| Method | Route | Input | Response / canonical FE method |
| --- | --- | --- | --- |
| PUT | `/api/preferences` | `{voice: "cute" or "calm"}` | additive state / `updatePreferences` |
| GET | `/api/budgets?month=YYYY-MM` | month query | `BudgetSummary` / `getBudgets` |
| PUT | `/api/budgets` | `{month, monthlyLimit, dailyLimit?, categoryLimits?}` | `BudgetSummary` / `updateBudgets` |
| GET | `/api/transactions?month=YYYY-MM` | month query | `{transactions: Transaction[]}` / `getTransactions` |
| POST | `/api/transactions` | `{requestId, name, amount, category, occurredAt, planned?}` | `{transaction, budget}` / `recordTransaction` |
| GET | `/api/insights` | none | `{insights: Insight[]}` / `getInsights` |
| GET | `/api/reflections/due` | none | `{transactions: Transaction[]}` / `getDueReflections` |
| POST | `/api/reflections` | `{requestId, transactionId, verdict}` | `{transaction, state}` / `reflect` |
| GET | `/api/lessons` | none | `{lessons: LessonSummary[]}` / `getLessons` |
| POST | `/api/lessons/answer` | `{requestId, lessonId, selectedOptionId}` | `{correct, feedback, reward, state}` / `answerLesson` |
| GET | `/api/reports/today` | none | `DailyReport` / `getDailyReport` |
| POST | `/api/check-ins` | `{requestId}` | `{completedToday, reward, state}` / `checkIn` |

Use `checkIn` for new FE work. `/api/quests/complete` remains the V1 alias with
its original body/response and level-2 gate. Both routes share `lastQuestDate`,
10-acorn/20-XP reward and local-day streak. Different UUIDs, concurrent requests,
route switching and restarts cannot earn twice. Level 1 gets
`QUEST_UNAVAILABLE`/409 through either route. GETs and NFC scans grant nothing.

Preferences default to `cute`; PUT replaces the voice without reward. Budget
PUT replaces one month's settings; omitted daily/category limits clear them.
Limits are positive CAD values with the V1 amount validation; categories are
`food`, `shopping`, `transport`, `entertainment`, `bills`, `other`. Categories in
summaries always include all six in that order. Missing limits and remaining
budget are `null`; observed spending is still numeric, including actual zero.
Remaining budget may be negative. `spentToday` uses the configured local day
and is zero when querying a different month. No limit means no under-budget
claim. A report's `achievement` is null without a limit or when over it.

Transaction POST accepts only manual records (`planned` defaults to false).
`source` is server-owned and only `manual|demo`, never `bank-connected`.
`occurredAt` is a real ISO date-time with seconds and Z or a numeric offset;
future instants are rejected. Preserve the original timestamp but group by its
instant in `DEMO_TIME_ZONE`, not the caller's written date. ID is
`txn-<requestId>`. Records are returned in insertion order. Logging changes only
spending totals, never savings, pet fullness or rewards. Legacy buy decisions
remain independent and do not create transactions or double-count spending.

Reflections become due after 24 elapsed hours, exclude reflected records and
are read-only on GET. Verdicts are `worth_it|unsure|not_worth_it`. Reflection
rewards are zero. A repeated identical verdict is a success; a changed verdict
returns `REFLECTION_EXISTS`/409. Earlier submissions return
`REFLECTION_NOT_DUE`/409. Missing records return `NOT_FOUND`/404.

Insights group exact transaction names (trimmed, case-sensitive) separately by
source in the trailing seven elapsed days, excluding future instants. At least
three occurrences produce a frequency insight with count and total CAD amount.
Stable ID is `frequency-<source>-<first transaction id>`. Text describes only
recorded purchases, with no inferred mood, anxiety, stress or impulsivity.
Empty data returns an empty list, not invented observations.

Lessons are an always-available fixed catalogue. A correct answer earns 5
acorns/10 XP once per lesson; wrong answers give feedback and zero reward and
can be retried with a new UUID. A successful UUID (including a wrong answer) is
consumed; invalid lessons/options consume no ID. Completed lessons remain
readable. `availableReward` is zero after completion. Answer responses return
feedback and correctness for the selected option, with zero reward on replay.

## State, fixtures, device privacy and retry rules

The shared types and schemas are exported by `@mochi/contracts`. See
[response examples](../packages/contracts/fixtures/addendum.json); examples are
independent shapes rather than a ledger. The full unconfigured account is
[addendum-app-state.json](../packages/contracts/fixtures/addendum-app-state.json),
exported as frozen `addendumAppStateFixture` and isolated `createAddendumAppState()`.
The V1 fixture stays unchanged. The report text must agree with its
`completedToday` flag. Additive initialized state includes required `preferences`,
full current-month `budgetSummary`, `today.checkInCompleted` and `forest`.
`today` and report completion derive from the existing quest date.

`forest.growthPercent` equals `goal.progressPercent`, capped at 100. It is a
projection of confirmed cents divided by target cents, never independently
persisted. `treeStages` in the shared contract is the single definition:
seedling [0,25), sapling [25,50), young [50,75), mature [75,100), thriving [100,+).
Savings still reveal the original letter at 25%, 50%, 100% only. New transaction,
budget, reflection and preference actions cannot advance the forest or letter.
The C++ projection consumes a generated header from that same shared definition.

The device API remains registered only with `ENABLE_DEVICE_API=true`. Preserve
`GET /api/device/state`, opt-in gesture behavior, and the exact legacy keys:
`petId`, `mood`, `hunger`, `reactionSeq`, `reactionType`. Never send transactions,
letter text, names or goal metadata. `voice` is allowed but omitted initially
for compatibility with the existing poller. `daily_checkin` and `goal_milestone`
are reserved pending hardware-owner agreement, not emitted by this change.
Existing `feed`, `level_up`, `greeting` behavior remains deduplicated.
Legacy in-app feed remains supported; it is independent of the daily report.

UUIDs remain global to the account. Successful IDs and state are committed
atomically; failures consume no ID. Reusing an ID across different operations
or changing a structured operation's payload returns `REQUEST_ID_CONFLICT`/409
rather than fabricating a transaction/reward response. V1-to-V1 retries retain
current-state semantics. Same-operation structured retries return current
transaction/state and zero newly granted reward. Check-in aliases count as the
same operation. Failed writes roll back state, IDs and device reactions.

SQLite schema migration must preserve all V1 account fields, original letter
whitespace, decision records, successful UUIDs and reaction cursor. New account
fields default to cute voice and empty budgets/transactions/completed lessons.
Do not rewrite a user's database as demo fixtures or seed synthetic spending
implicitly. New storage uses integer cents throughout; CAD conversion occurs at
HTTP/domain projections. Reject aggregate safe-integer overflow. Corrupt or
incompatible storage fails startup without overwriting the database.
