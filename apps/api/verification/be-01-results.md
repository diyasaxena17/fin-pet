# BE-01 verification

Affected flow: opening a new, v1, or v2 SQLite database at API startup.
Contracts: unchanged; retained user_version=2 and the existing JSON storage shape.
Schema inspection and versioning rationale: ../README.md, BE-01 section.

Commands observed:

- `cmake -S apps/api -B apps/api/build && cmake --build apps/api/build -j 2`: passed.
- Focused Python HTTP invocation initially failed at localhost bind under the sandbox;
  no migration assertions ran in that invocation.
- `ctest --test-dir apps/api/build --output-on-failure` with localhost access:
  passed all four suites, including new migration tests.
- Initial `pnpm check`: unavailable on default PATH (Node 25, no pnpm).
- `PATH=/private/tmp/mochi-toolchain/bin:$PATH pnpm check` with localhost access:
  passed using Node 22.23.5 / pnpm 10.34.9. Includes four native suites,
  115 reference transitions, 66 mock parity requests, workspace tests and builds.
- `git diff --check`: passed.

Automated tests observed real backend process starts/restarts with temporary SQLite
files, v1 backup upgrade and repeated startup, original letter/economy/device state
and request history preservation, and rollback on injected failures. No live user
database was touched. No manual browser, mobile, physical phone or NFC checks were
performed; no UI or device endpoint behavior changed.

Remaining limitation: existing lesson uniqueness and same-day rewards are enforced
in application state, not new relational constraints. The single latest check-in
date does not retain history against clock rollback. This change preserves those
existing semantics rather than introducing a historical reward ledger.
