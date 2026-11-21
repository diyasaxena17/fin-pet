# Forest backend and preference integration — November 21, 2026

PR #6 supplies the squirrel-name/voice shared contract on top of PR #5's 48-hour
mock and clustering rules. PR #7 combines that accepted contract with the
preference API/UI and **all six original feat/forest-be commits**, preserved as
ancestors via a merge rather than replacing their history:

- 1c78337 — reject incomplete live state; preserve failed migrations.
- a72d507 — 48-hour native reviews and stable saved reflections.
- dfdb00e — deterministic discretionary clustering with evidence.
- 94c1fca — explicit, gated, persistent native demo seeding.
- d137eb0 — capture the local check-in date inside the transaction.
- 1fd2e37 — backend verification/runbook and documented hardware limits.

The only source conflict when combining implementation branches was adjacent
additions in the HTTP test file; both test groups were retained. The shared test
rebase likewise retained both preference and v2 reflection/clustering tests.

## Observed combined checks

- `pnpm check` passed with Node 22.23.5 and pnpm 10.34.9 using normal hooks.
- All four native CTest targets passed, including **24 HTTP/process scenarios**,
  migration failures, demo CLI, concurrent rewards and actual SQLite restart.
- **115 V1 transitions** and **66 native API/actual frontend mock comparisons**
  passed. New comparison cases assert identical four-hour cluster responses and
  identical rejection/due behavior for a 36-hour purchase under the 48-hour rule.
- 10 contract tests, 19 domain tests and 18 frontend tests passed; builds passed.
- The real Chrome/Vite/native API preferences rehearsal passed at 390×844 and
  1280×900: loading, failed save/retry, Clover/calm selection, unchanged original
  letter/ledger/private device state, and persistence through C++ restart.
- No dependency, root lockfile or hardware code changes were introduced.

The original backend-only verification and contract notes are historical records.
In this integration, shared mock 48-hour/clustering behavior is now present and
petName editing is implemented. Remaining limits still apply: the strict poller
has not accepted daily_checkin/goal_milestone, so those events remain deferred;
physical phone/NFC/Pi/audio behavior is unverified. FE /tap route changes are not
part of this merge. HTTP seed inputs stay compatible; the explicit native CLI
provides transaction examples.

Target: **chore/forest-v2-contract** only. Promotion to main is a separate action.
