## Application change

Implement the frozen additive API in the C++/SQLite backend, central HTTP adapter
and shared-rule frontend mock. Add a read-only `/check-in` NFC landing page with
explicit reward confirmation, loading/error/retry/completed states. Label UI
coins as acorns and keep legacy feeding and all V1 routes/fields compatible.

Preferences, month budgets, manual spending, observed insights, 24-hour
reflections, once-per-lesson answers, daily reports and both check-in routes
persist correctly. Spending never changes confirmed/potential goal savings.
Tree stage derives from confirmed goal progress using generated shared rules.
SQLite migration preserves the original letter, history, UUIDs and reaction cursor.

Review `feat/addendum-runtime` against `contract/api-addendum`. The contract-only
branch tip is `641a1f78b0a3b7b0eedf55f45db29fdca4ca1773`; its checks passed
independently. Land that focused PR first, then rebase this implementation and
both owner branches on the accepted main tip. Existing `feat/web`, `feat/api`
and `main` refs were not moved. These are local review branches, not remote PRs.

## Validation

- [x] `pnpm install --frozen-lockfile --offline` succeeds using the existing
  `/private/tmp/mochi-pnpm-store` cache. No dependency/lockfile changes.
- [x] `pnpm check` passes using Node 22.23.5 / pnpm 10.34.9 through normal hooks.
- [x] Commit subjects follow Conventional Commits.
- [x] The affected daily-report flow handles loading, no configured target,
  error/retry, explicit confirmation, success and already-completed states.
- [x] Requests/responses match the frozen shared contract; 115 V1 transitions
  and 50 native API/actual mock requests match.
- [ ] Required contract PR is merged and consumed remotely. Local implementation
  is stacked on the verified contract branch; no remote merge was requested.
- [x] Dependencies and the single root lockfile are unchanged.

## Manual app checks

- [x] Desktop 1280 × 900 and mobile browser 390 × 844 journeys were exercised
  and screenshots inspected; no horizontal overflow.
- [x] Savings, rewards, letter progress and read-only reports were checked.
- [x] Reload/restart persistence was verified with real temporary SQLite files,
  including migration from the original v1 shape and UUID replay after restart.
- [x] In-app feeding confirmation and replay protection were checked in Chrome.
- [ ] NFC/QR links were checked on a physical phone. Not performed; browser URL
  navigation establishes no physical scanning/connectivity claim.

Evidence, remaining implementation gaps, and checks not run:

See [observed verification](../../apps/api/verification/addendum-results.md).
New device reactions remain reserved pending hardware agreement. Current device
privacy and opt-in flag remain intact. Additional feature screens are separate
FE work; all twelve new endpoint/adapter methods are implemented. No push,
deployment or remote PR merge was performed.
