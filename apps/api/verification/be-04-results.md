# BE-04 verification

Flow: persistent 48-hour Worth-It purchase reflections.
Both endpoints and the 48-hour logic already existed. This ticket hardens POST
query validation and adds acceptance coverage/documentation. The user explicitly
confirmed retaining frozen verdict `not_worth_it` rather than adding `regret`.
No frozen shared file or schema was changed.

Changed paths:
- apps/api/src/http_server.cpp
- apps/api/tests/core_tests.cpp
- apps/api/tests/http_tests.py
- apps/api/README.md
- apps/api/verification/be-04-results.md

Observed commands/results:
- `cmake -S apps/api -B apps/api/build && cmake --build apps/api/build -j 2 && apps/api/build/mochi-tests`: passed.
- `python3 apps/api/tests/http_tests.py apps/api/build/mochi-api` selecting
  `test_reflection_validation_atomicity_sources_and_restart`,
  `test_reflections_require_48_hours_and_preserve_existing_reviews`, and
  `test_insights_and_reflections_are_observed_reward_free_and_persistent`:
  all three passed with localhost access.
- `PATH=/private/tmp/mochi-toolchain/bin:$PATH pnpm check`: passed with Node
  22.23.5 and pnpm 10.34.9, including native suites, both parity suites,
  workspace tests/typechecks/builds and old endpoint regressions.
- `git diff --check`: passed.

New fixed-clock tests verify 47h59m is not due and exactly 48h is due; only the
attached reflection changes. All three verdicts preserve account/source state.
Conflicting/missing/early errors leave state unchanged. HTTP tests verify invalid
fields/verdicts/query parameters do not change persisted payload or reserve IDs;
success removes manual/demo entries from the due list; retries preserve verdict
and timestamp; conflicts consume no ID; the saved transaction survives a real
process restart. Existing tests inject a SQLite write failure and verify rollback.
Read snapshots compare both payload and request history. README documents 4xx
codes, exact retry semantics and the user's own judgement without diagnosis.

Manual checks: none. No browser/mobile/physical phone/NFC verification claimed.
Automated persistence checks used temporary databases; no live user DB was edited.
No remaining BE-04 blocker. The verdict wording discrepancy is resolved by the
user's confirmation to preserve the frozen contract.
