## Application change

Freeze additive finance, voice, reflection, lesson, report and check-in shapes
before the next FE/BE split. Preserve all V1 schemas, fields, rewards and
onboarding input. The new typed interface requires complete additive state even
when returned by a V1 mutation. The existing V1 interfaces remain available.

`treeStages` and the lesson catalogue have shared immutable definitions.
Reference rules enforce cents, null limits, observed spending, reward and UUID
invariants. Shared fixtures include an unconfigured additive account and separate
response examples. Truncated proposal rows were confirmed as cute/calm voice and
worth_it/unsure/not_worth_it reflections with `{transaction,state}` responses.

Review `contract/api-addendum` against `main`. Land this focused contract PR
first, then rebase owner implementation branches on its accepted tip. The local
runtime branch is stacked for review; this record does not claim a remote merge.

## Validation

- [ ] `pnpm install --frozen-lockfile` succeeds. Not rerun: existing installed
  workspace dependencies were used; no dependency or lockfile changes.
- [x] `pnpm check` passes independently on the contract branch with Node
  22.23.5 / pnpm 10.34.9, including the existing native V1 differential tests.
- [x] Commit subjects follow Conventional Commits.
- [x] The affected flow handles loading, empty, error, confirmation, and success
  states as applicable: this PR supplies shapes/rules; screen work is separate.
- [x] Requests/responses match the shared contract. This is the focused contract
  change; land it before accepting the stacked implementation.
- [x] Dependencies and the single root lockfile are unchanged.

## Manual app checks

- [ ] Affected desktop and mobile user journeys were exercised. Not applicable
  to this shared-only branch; runtime/browser evidence belongs to the next PR.
- [x] Savings, rewards, and letter progress were checked where affected through
  reference tests for spending isolation, tree/letter thresholds, once-per-lesson
  rewards, alias retries and Toronto local midnight.
- [ ] Reload/restart persistence was verified. Not applicable: no database
  migration or live endpoint changes on this branch.
- [ ] In-app feeding confirmation and replay protection were checked manually.
  Existing automated V1 flow/parity coverage passed; no feed UI change here.
- [ ] Optional NFC/QR links were checked on a physical phone. Not performed.

Evidence, remaining implementation gaps, and checks not run:

`docs/API_ADDENDUM.md` is the specification. Exported fixtures are frozen and
isolated; storage defaults preserve the original letter. Live C++ endpoints,
SQLite migration, central HTTP/mock adapters and acorn UI labels are intentionally
in the stacked implementation rather than this contract PR. Device reaction
names daily_checkin and goal_milestone remain reserved pending hardware agreement.
