# BE-09 verification

Flow: existing explicit gated forest demo command plus legacy seed/reset flow.
The native --seed-forest-demo command already creates six source=demo records.
This ticket fixes stale unreviewed examples: if one falls outside the seven-day
lookback (or ahead of a moved demo clock), re-anchor unreviewed examples together
while retaining IDs and amounts. Reviewed purchases/timestamps and all manual
records are preserved. No public route or frozen HTTP seed input was added.

Changed paths:
- apps/api/src/demo.cpp
- apps/api/include/demo.hpp
- apps/api/tests/core_tests.cpp
- apps/api/FOREST_DEMO.md
- apps/api/README.md
- apps/api/verification/be-09-results.md

Observed commands/results:
- `cmake -S apps/api -B apps/api/build && cmake --build apps/api/build -j 2 && apps/api/build/mochi-tests`:
  build passed; initial new test picked the overdue manual row rather than a demo
  row for its review fixture and failed. Fixed fixture selection; subsequent
  `cmake --build apps/api/build -j 2 && apps/api/build/mochi-tests` passed.
- `python3 apps/api/tests/http_tests.py apps/api/build/mochi-api` selecting
  `test_explicit_demo_examples_are_gated_atomic_and_retry_stable`,
  `test_forest_scenario_and_replays_persist_with_existing_device_contract`, and
  `test_quests_demo_reset_and_disabled_routes`: all three passed using localhost.
- `PATH=/private/tmp/mochi-toolchain/bin:$PATH pnpm check`: passed with Node
  22.23.5/pnpm 10.34.9, including native suites, both parity suites, all workspace
  tests/typechecks/builds, restart tests and the old storyline.
- `git diff --check`: passed.

New tests use a fixed 2026-11-21T12:00:00Z clock, advance eight days, and move the
clock back. They verify six rows produce two demo insights and three due reviews;
reseed adds zero; nearby-clock repeats preserve exact state; refresh restores
identical insight IDs/evidence; manual records, successful request IDs, rewards,
progress and reactions stay intact. Saved reviews retain purchase timestamps.
A late demo-ID collision rolls back earlier candidate inserts. Existing HTTP
coverage verifies DEMO_MODE gating, injected storage failure, source provenance,
saved reviews, restart persistence and skip-$60/save-$50/letter/feed behavior.

Reset semantics: existing explicit demo reset clears the whole account, including
manual/demo transactions and request history, while retaining device sequence.
Reseeding alone preserves manual data. HTTP seed remains the frozen balance/XP
operation; synthetic activity uses the existing native command. Reviewed examples
can age out of insights; use a fresh throwaway DB for a complete unreviewed demo.

Manual checks: none. No browser/mobile/physical phone/NFC checks claimed.
Automated process restarts used temporary SQLite files; no live user DB was edited.
No remaining BE-09 blocker under the existing native demo workflow.
