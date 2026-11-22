# Forest v2 sync from main — 2026-11-22

## Step 1: dedicated sync commit

- Branch: chore/forest-v2-contract, updated to origin's 3974a80 before integration.
- Main fetched at 5f4253a (history-preserving forest-fe revert).
- Merge commit: 59b7d4c, `chore: merge main into forest v2 contract`.
- Merge completed automatically with no conflicts or file changes: main's final
  reverted tree matches the shared base while forest v2 has newer feature work.
- No discarded learning-hub files were reintroduced by this sync. The source
  branch's existing bank-feed, budgets, voice/NFC and hardware work is retained.

## Step 2: separately committed verification

Actual commands/results:

| Command/check | Result |
| --- | --- |
| `git diff --exit-code HEAD --` before committing the merge | Passed; sync changed history only |
| `git diff --name-only --diff-filter=U` | No unresolved entries |
| `PATH=/private/tmp/mochi-toolchain/bin:$PATH pnpm check` | Passed |
| Installed pre-commit/commit-message hooks on sync commit | Passed |

Toolchain: Node 22.23.5 / pnpm 10.34.9. Local HTTP tests used localhost access.
The full check passed 7 hook tests, 10 contract tests, 19 domain tests, 86 frontend
tests across 18 files, six native suites, 115 C++/reference transitions and 66
mock parity requests, plus workspace typechecks/builds. The initial local run
needed no fixes; subsequent CI-specific fixture corrections are recorded below. Local check output: /private/tmp/forest-v2-main-sync-check.log.

## PR / CI gate

A separate PR from chore/forest-v2-contract to main will carry the sync and this
verification commit alongside the branch's feature changes. GitHub Actions quality
and commit-message jobs must pass on the final PR head. CI runs frozen-lockfile
installation and pnpm check; those remote results are reported on the PR rather
than claimed here in advance. Creating a PR is not a Git commit.

No manual browser, physical phone/NFC, speaker, Arduino or Raspberry Pi checks were
performed for this sync. Automated hardware mocks and backend restart tests do not
establish physical actuation, speech quality or live-bank/provider connectivity.
No dependencies, shared contracts or feature implementations were changed by this
sync/verification work.

## Separate CI-fix step

Initial GitHub push/PR runs failed in App.budget.test.tsx and
SquirrelProvider.test.tsx. Both expected $53.44 of today's sample feed; the UTC
runner at 06:59Z put three host-local samples on the previous Toronto day in the
mock API, leaving $26.40 and preventing the expected over-budget mood.

A separate test-only fix pins Date at 2026-11-22T06:59:00Z and configures the mock
API with the browser/process timezone used by the sample feed. Async timers remain
real, and the same spending/replay/mood assertions are retained. No production
bank-feed, hardware or financial logic was changed; this does not establish
cross-timezone correctness of every real deployment.

Observed follow-up commands:
- `TZ=UTC pnpm --filter @mochi/web exec vitest run src/mochi-ui/App.budget.test.tsx src/hardware/SquirrelProvider.test.tsx`: 3/3 passed.
- Same focused command with `TZ=America/Toronto`: 3/3 passed.
- `TZ=UTC pnpm check` with the pinned toolchain and localhost access: passed,
  including all 86 frontend tests, six native suites, builds and parity checks.

PR #14: https://github.com/diyasaxena17/fin-pet/pull/14. Final-head GitHub CI must
rerun after this fixture commit; earlier failures are not represented as passes.
