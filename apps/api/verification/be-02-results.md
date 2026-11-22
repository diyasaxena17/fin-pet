# BE-02 verification

Flow: monthly budgets and manual spending through the real C++ HTTP API.
The four endpoints already existed; this ticket adds strict write query validation,
deterministic transaction GET query validation, focused acceptance coverage and
curl/timezone documentation. No schema or frozen route/JSON changes were needed.

Changed paths:
- apps/api/src/http_server.cpp
- apps/api/tests/http_tests.py
- apps/api/README.md
- apps/api/verification/be-02-results.md

Observed commands/results:
- `cmake -S apps/api -B apps/api/build && cmake --build apps/api/build -j 2`: passed.
- `python3 apps/api/tests/http_tests.py apps/api/build/mochi-api` with the four
  selected tests (`test_budget_transaction_acceptance_and_restart`,
  `test_budget_transaction_invalid_requests_leave_storage_unchanged`,
  `test_transaction_month_boundaries_use_toronto`, and
  `test_preferences_budgets_transactions_and_retry_conflicts`): all passed.
- `PATH=/private/tmp/mochi-toolchain/bin:$PATH pnpm check`: passed with Node
  22.23.5 and pnpm 10.34.9, including all native suites, both parity suites,
  workspace tests, typechecks and builds. HTTP tests required localhost access.
- `git diff --check`: passed.

Automated observations: null unconfigured limits/status, $500/$25 targets and
$18 spending yielding $482 remaining, category totals, cents storage, exact manual
response fields, reward/savings isolation, successful replay and conflicting reuse,
restart persistence, Toronto EST/EDT month boundaries, invalid inputs (including
NaN/Infinity/overflow JSON), and unchanged persisted payload/request history after
rejections. Existing demo-source and old endpoint regressions also passed.

Manual checks: none. No browser/mobile/physical phone/NFC checks performed.
Persistence was observed through real automated backend restarts with temporary
SQLite files. No live user database was touched. No remaining BE-02 blocker;
BE-01's historical check-in ledger limitation remains outside this ticket.
