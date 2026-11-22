# BE-07 verification

Flow: explicit daily check-in/legacy daily quest reward and hardware compatibility.
Existing routes already share lastQuestDate, streak, atomic request history and
the level-2 gate. This ticket rejects query parameters on both completion routes,
adds first-completion concurrency/privacy/restart coverage and documents the
hardware mapping prerequisite. No shared contract or schema was changed.

Changed paths:
- apps/api/src/http_server.cpp
- apps/api/tests/http_tests.py
- apps/api/README.md
- apps/api/verification/be-07-results.md

Observed commands/results:
- `cmake -S apps/api -B apps/api/build && cmake --build apps/api/build -j 2`: passed.
- `python3 apps/api/tests/http_tests.py apps/api/build/mochi-api` selecting
  `test_check_in_first_completion_race_privacy_and_restart`,
  `test_daily_report_is_read_only_and_check_in_aliases_share_one_reward`, and
  `test_forest_scenario_and_replays_persist_with_existing_device_contract`:
  all three passed with localhost access.
- `PATH=/private/tmp/mochi-toolchain/bin:$PATH pnpm check`: passed with Node
  22.23.5/pnpm 10.34.9, including native suites, both parity suites, all workspace
  tests/typechecks/builds and old endpoint regressions.
- `git diff --check`: passed.

New test races 12 first-completion requests across both routes with shared/fresh
UUIDs and observes exactly +10 coins/+20 XP and one completed streak day. Same-ID,
fresh-ID and legacy-route replays cannot add rewards; restart retains completion.
Report/device reads and invalid submissions leave persisted state/request history
unchanged. Enabled device responses contain exactly the five legacy private
fields; disabled routes return 404. A prior feed sequence survives check-ins,
restart and feed-ID replay without another reaction. Existing injected-write-error
and daily-report tests verify rollback, read-only behavior and legacy compatibility.

Required hardware mapping: daily_checkin is reserved, not an allowed emitted
DeviceReaction. The strict poller accepts only feed/level_up/greeting/null.
A dedicated first-check-in physical reaction is therefore NOT implemented; normal
check-ins retain the existing cursor, and genuine level crossings retain level_up.
Hardware/contract owners must agree on daily_checkin support and precedence with
level_up before a first daily completion can increment one dedicated sequence.
Reusing feed/greeting would mislabel the event and is not assumed here.

Other existing limitation: the latest-date ledger does not guard clock rollback
to a previously rewarded historical date (documented since BE-01).

Manual/physical checks: none. NFC URL opening/scanning and physical actuator
behavior were not observed or claimed. Automated process restarts used temporary
SQLite files; no live user DB was touched. Reward/check-in safeguards are verified;
dedicated hardware emission remains dependent on the mapping above.
