## Application change

Describe the user action, resulting app behavior, and relevant PRD acceptance criteria.

## Validation

- [ ] `pnpm install --frozen-lockfile` succeeds.
- [ ] `pnpm check` passes (validator tests, typecheck, Vitest, builds).
- [ ] Commit subjects follow Conventional Commits.
- [ ] The affected flow handles loading, empty, error, confirmation, and success states as applicable.
- [ ] Requests/responses match the shared contract; any required contract PR is merged and consumed.
- [ ] Dependencies and the single root lockfile are synchronized with the backend owner.

## Manual app checks

Record results or explain why a check is not applicable. Check boxes only after observing the result.

- [ ] Affected desktop and mobile user journeys were exercised.
- [ ] Savings, rewards, and letter progress were checked where affected.
- [ ] Reload/restart persistence was verified where affected.
- [ ] In-app feeding confirmation and replay protection were checked where affected.
- [ ] Optional NFC/QR links were checked on a physical phone if changed.

Evidence, remaining implementation gaps, and checks not run:

<!-- Add screenshots, observed results, or a concise explanation. -->
