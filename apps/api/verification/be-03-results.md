# BE-03 verification

Flow: read-only spending insights derived from BE-02 transactions.
The existing implementation already supports the ticket's two MVP rules. This
commit adds missing acceptance coverage and rule documentation; production logic,
response fields and frozen shared contracts are unchanged.

Changed paths:
- apps/api/tests/core_tests.cpp
- apps/api/tests/http_tests.py
- apps/api/README.md
- apps/api/verification/be-03-results.md

Observed commands:
- `cmake -S apps/api -B apps/api/build && cmake --build apps/api/build -j 2 && apps/api/build/mochi-tests`: passed.
- `PATH=/private/tmp/mochi-toolchain/bin:$PATH pnpm check`: passed with Node
  22.23.5/pnpm 10.34.9; includes four native suites, both contract parity suites,
  workspace tests, typechecks and builds. HTTP suites used localhost access.
- `git diff --check`: passed.

New synthetic rule tests fix evaluation time at 2026-11-21T12:00:00Z. They cover
empty/two/three records, inclusive four-hour and seven-day boundaries, old/future
exclusion, equivalent offset timestamps, tied timestamp ID ordering, contained
window suppression, distinct overlapping windows, exact cents evidence, repeated
calls, manual/demo isolation and suggestions. Existing boundary tests also verify
four hours plus one millisecond fails. New HTTP assertions compare persisted
payload and request IDs before/after repeated empty and populated insight reads.

Contract compatibility: discretionary means shopping/entertainment, planned or
unplanned; clustering looks back seven days. Existing exact-name frequency rules
(including Takeout and other names) are retained. Sources are separated, not mixed.
Cluster evidence uses kind=frequency and windowDays=4/24; frequency uses 7.
No emotion/diagnosis inference or additional rule/field was introduced.

Manual checks: none. No browser, physical phone or NFC verification claimed.
Automated HTTP restart/regression suites passed using temporary databases.
No remaining BE-03 blocker. Frequency IDs intentionally retain the first recorded
qualifying transaction ID under the frozen contract; arbitrary reordering of
stored frequency history is not a supported operation.
