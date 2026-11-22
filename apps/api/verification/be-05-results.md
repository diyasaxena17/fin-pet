# BE-05 verification

Flow: fixed lessons, server-checked answers and once-per-lesson rewards.
Existing endpoints, stored completions and gamification already implement this
flow. This ticket rejects unexpected answer query parameters, adds focused
acceptance tests and documents the behavior. The user confirmed preserving the
frozen potential-vs-confirmed and budget-target catalogue instead of introducing
needs-vs-wants/emergency-funds topics. No shared contract/schema change was made.

Changed paths:
- apps/api/src/http_server.cpp
- apps/api/tests/http_tests.py
- apps/api/README.md
- apps/api/verification/be-05-results.md

Observed commands/results:
- `cmake -S apps/api -B apps/api/build && cmake --build apps/api/build -j 2`: passed.
- Focused `python3 apps/api/tests/http_tests.py apps/api/build/mochi-api` invocation
  selecting `test_lesson_catalogue_privacy_validation_and_level_thresholds`,
  `test_lesson_concurrent_ids_reward_each_lesson_once_after_restart`, and
  `test_lessons_reward_once_validate_options_and_rollback_reactions`:
  initially failed because the test attempted unsupported demo seed XP values.
  Corrected setup uses normal savings/decision actions; all three then passed.
- `PATH=/private/tmp/mochi-toolchain/bin:$PATH pnpm check`: passed with Node
  22.23.5/pnpm 10.34.9, including native suites, both parity suites, all workspace
  tests/typechecks/builds and onboarding/quests/Future Me regressions.
- `git diff --check`: passed.

New tests verify both public lesson shapes omit correctOptionId and feedback,
options expose only id/label, GET leaves storage unchanged, unknown/malformed
answers consume no ID, wrong answers preserve state with useful feedback and
zero reward, and wrong answers require a new ID to change the answer. Real savings
and decision actions set up 90/240 XP; lesson rewards reach the unchanged 100/250
XP thresholds while preserving savings and letter state. Eight concurrent
same/fresh-ID submissions per lesson award 5 coins/10 XP exactly once; persisted
completion and restart/fresh-ID replays prevent further rewards. Existing tests
inject a failed SQLite request insert and verify reward/reaction rollback.

Manual checks: none. No browser/mobile/physical phone/NFC verification claimed.
Real backend restarts were observed through automated tests with temporary SQLite
files. No live user database was edited. No remaining BE-05 blocker under the
user-confirmed frozen catalogue; different lesson topics require a contract PR.
