# Branch and ownership handoff

The shared scaffold is organized into five focused commits on `chore/repo-setup`:

1. `chore: configure pnpm workspace and shared toolchain`
2. `feat(contracts): define shared API types and frozen state fixture`
3. `feat(api): scaffold Express read routes and compatibility tests`
4. `feat(web): scaffold React pages and typed live and mock adapters`
5. `chore: add CI and document scaffold handoff`

Further setup, PRD/check improvements, and the standalone contract implementation
are committed on `chore/repo-setup`.
After accepting the full setup branch, advance `main` and base both implementation
branches on that same accepted tip before feature work begins.
Find the proposed setup SHA with `git rev-parse chore/repo-setup`. Both developers
must agree on this exact SHA, Node 22.23.5, and pnpm 10.34.9 before starting.
The initial local `feat/web` and `feat/api` refs identify the original scaffold
tip and must be updated to the accepted setup before implementation.
Publish `main` through the team's normal Git workflow before another checkout
tries to pull it; the scaffold task does not push remote changes.

In each owner's separate checkout, after the shared commit is published:

```sh
git switch main
git pull --ff-only
git rev-parse HEAD
```

Frontend, if its branch does not already exist:

```sh
git switch -c feat/web
```

Backend, in its own checkout, if its branch does not already exist:

```sh
git switch -c feat/api
```

Use `git switch feat/web` or `git switch feat/api` for an existing local branch.

| Area | Owner / change rule |
| --- | --- |
| `apps/web/**` | Frontend |
| `apps/api/**` | Backend |
| Root `pnpm-lock.yaml` | Backend; coordinate all dependency changes |
| `packages/contracts/**` | Frozen; focused contract PR to `main` |
| `packages/domain/**` | Shared API/mock rules; focused contract PR to `main` |
| Root configuration | Frozen; focused contract PR to `main` |
| `docs/API_CONTRACT.md` | Frozen; focused contract PR to `main` |

Frontend requests new root/shared dependencies from the lockfile owner. Package
manifest and lockfile changes must stay synchronized; coordinate even web-only
dependency additions. Never commit nested lockfiles.

Land the API PR first, or keep web in mock mode. Land web after real API
compatibility checks pass. Feature work uses PRs, not direct commits to `main`.
If a shared contract change is unavoidable, merge its small PR to `main`, notify
both developers, and rebase both branches before consuming the change.

## Commit and PR gates

- `pnpm install` enables `.githooks`; use `pnpm setup:hooks` for an existing
  checkout. Pre-commit checks staged whitespace and runs `pnpm check`.
- Commit subjects use Conventional Commits and stay within 100 characters.
  The commit-msg hook rejects invalid subjects.
- `pnpm check` runs validator tests, typecheck, Vitest, and builds. CI runs the
  same command on every push and pull request, and validates commit subjects.
- Complete `.github/pull_request_template.md` with the affected application
  journey and observed browser/mobile results. Include persistence and feeding
  checks when the change affects those flows; explain checks not run.
- PR acceptance requires compatible request/response shapes and the main demo
  flow once implemented. The PRD's full-stack app acceptance criteria define
  completion across the working application screens and API.
- Configure GitHub branch protection/rulesets separately to require `CI / quality`
  and `CI / commit-messages` on `main`. Workflow files and local hooks alone do
  not prevent a maintainer from merging a PR that fails checks. Remote protection
  has not been configured by this repository-only change.
