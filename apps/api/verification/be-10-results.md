# BE-10 final automated regression gate

Date: 2026-11-21 (America/Toronto).
Scope: integrated BE-01 through BE-09 behavior; no feature or contract changes.
Changed paths: apps/api/tests/http_tests.py, apps/api/README.md,
apps/api/verification/be-10-results.md. No dependencies added.

## Actual commands and results

| Command | Observed result |
| --- | --- |
| `cmake -S apps/api -B apps/api/build && cmake --build apps/api/build -j 2` | Passed, C++20 API/core tests built |
| `python3 apps/api/tests/http_tests.py apps/api/build/mochi-api HttpTests.test_forest_scenario_and_replays_persist_with_existing_device_contract HttpTests.test_migrated_v1_full_forest_concurrency_and_restart HttpTests.test_v1_migration_preserves_letter_ids_decisions_and_reactions` | All three passed |
| `ctest --test-dir apps/api/build --output-on-failure` | 4/4 suites passed: core, http, demo_startup, pi_poller; 8.20 seconds |
| `PATH=/private/tmp/mochi-toolchain/bin:$PATH pnpm check` | Passed with Node 22.23.5 and pnpm 10.34.9 |
| `git diff --check` | Passed |

The full check includes 7 hook tests, 10 contracts tests, 19 domain tests, 18 web
tests, all four native suites, 115 C++/TypeScript reference transitions and 66
C++/FE mock addendum requests, plus workspace typechecks and builds. It reran
CTest after the final name/voice and cluster-evidence assertions were added.
HTTP tests required localhost access. No new regression failure was found.

## Coverage and observations

| Acceptance area | Evidence observed automatically |
| --- | --- |
| Representative v1 upgrade | SQLite backup fixture retains complete app/device state, original letter whitespace, goal, coins/XP, request rows and decisions; upgrade/restart/replays pass |
| Fresh v2 and repeat startup | Version/table/key checks, no payload rewrite on v2 reopen, and upgrade rollback tests pass |
| Full happy path | Same shared scenario runs on fresh v2 and migrated v1: $500/$25 budget, $18 takeout, $482 remaining and $18 report, two demo insights, aged reflection, both lessons once, check-in once, $50 confirmed toward $200, sapling and first original letter section, legacy feeding reaction |
| Transactions/reflections | Six same-ID transaction requests create one row; same/fresh-ID concurrent same-verdict reviews retain one attached judgement/timestamp; conflicting review is rejected without changing storage |
| Lessons/check-ins | Concurrent first completions through both check-in routes and concurrent lesson answers award once; focused tests also cover fresh IDs, failures and restart |
| Legacy physical reaction ledger | Six concurrent same-ID feed requests spend once and increment the private monotonic sequence exactly once; feed/savings retries after restart do not repeat effects |
| Time and arithmetic | Fixed-clock core tests cover exact 48 hours, four-hour/seven-day boundaries, integer cents, Toronto midnight/month turnover and DST; missing targets remain null |
| Full restart | State, name/voice, budget/report, transactions, reflections, lesson completion, check-in completion, device cursor and successful-ID replay behavior persist |
| Privacy/read-only behavior | Enabled device shape remains exactly five legacy fields; disabled GET/gesture routes return 404. Repeated report/state/device reads leave SQLite payload and request history unchanged |
| Legacy demo flow | Existing skip-$60/save-$50/letter/feed, gated seed/reset, source=demo, reproducibility and manual-data preservation regressions pass |

Only a synthetic representative v1 fixture was migrated, not a live user DB.
The tests use real local backend processes and SQLite restarts. Pure time-boundary
tests inject fixed instants; HTTP scenarios use the current configured local day.
The original scenario test name remains runnable as documented; a second wrapper
runs the same scenario after v1 migration to avoid duplicated scenario logic.

## Remaining established limitations

- Dedicated daily_checkin emission remains unsupported by the frozen hardware
  event enum and strict poller. Supported legacy feed/level_up/greeting events are
  preserved; hardware mapping and precedence require a coordinated contract change.
- The existing latest-date check-in ledger does not guard clock rollback to a
  previously rewarded historical date. Normal same-day/restart/concurrent behavior
  is verified; historical rollback protection is not claimed.
- The confirmed frozen catalogue, cute/calm voices and not_worth_it verdict remain
  in force. No new topics, energetic voice or regret alias were introduced.
- Saved demo reviews retain their purchase timestamps and may age out of insights;
  fresh throwaway databases restore the full unreviewed scenario.

## Manual and physical checks

None performed for BE-10. In particular, physical phone/browser NFC URL opening or
scanning, speaker playback, Raspberry Pi/actuator execution and real Wi-Fi behavior
were not observed. The pi_poller suite uses automated test doubles and does not
constitute a physical Raspberry Pi check. Backend GET/read-only assertions are
verified; the complete physical NFC/browser journey is not claimed.

Automated gate: passed within the frozen contract and limitations above. No runtime
feature changes or merges were made, and no live DB was edited.
