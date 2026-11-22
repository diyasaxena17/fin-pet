# BE-06 verification

Flow: read-only daily forest report, scoped to the configured local calendar day.
The existing endpoint already returns the frozen DailyReport shape and uses the
shared quest projection. This ticket adds missing controlled-clock acceptance
coverage and documentation; production logic, response format and storage are
unchanged.

Changed paths:
- apps/api/tests/core_tests.cpp
- apps/api/tests/http_tests.py
- apps/api/README.md
- apps/api/verification/be-06-results.md

Observed commands/results:
- `cmake -S apps/api -B apps/api/build && cmake --build apps/api/build -j 2 && apps/api/build/mochi-tests`: passed.
- `PATH=/private/tmp/mochi-toolchain/bin:$PATH pnpm check`: passed with Node
  22.23.5/pnpm 10.34.9, including native suites, both parity suites, workspace
  tests/typechecks/builds and old endpoint regressions. HTTP tests used localhost.
- `git diff --check`: passed.

New synthetic C++ tests pass fixed instants through local_day/daily_report using
America/Toronto. They verify the exact nine-field empty report, zero spending and
no fabricated completion/savings, $18 against $25, inclusive exact-limit status,
one cent over, and null target/status/achievement even with recorded spending.
November/December midnight changes day and month, excludes adjacent-day records,
rolls check-in availability forward, and projects streak expiry without writing.
Spring-forward and following midnight use local dates rather than 24-hour windows.
Repeated evaluations compare full stored state, and completion/streak fields are
checked against the authoritative app_state quest projection.

The existing real HTTP report/check-in test now also compares SQLite payload and
request-history snapshots around repeated successful GETs and rejected query
parameters. It verifies unchanged wallet, XP, quest state and private device
reaction sequence. Existing check-in concurrency/restart tests also passed.

Manual checks: none. No browser/mobile/physical phone/NFC checks claimed.
Automated process restart checks use temporary databases; no live user DB was
edited. No remaining BE-06 blocker.
