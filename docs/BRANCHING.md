# Branch and ownership handoff

The shared scaffold is organized into five focused commits on `chore/repo-setup`:

1. `chore: configure pnpm workspace and shared toolchain`
2. `feat(contracts): define shared API types and frozen state fixture`
3. `feat(api): scaffold Express read routes and compatibility tests`
4. `feat(web): scaffold React pages and typed live and mock adapters`
5. `chore: add CI and document scaffold handoff`

At handoff, `main`, `feat/web`, and `feat/api` point to the final setup commit.
Find its SHA with `git rev-parse chore/repo-setup`. Both developers
must agree on this exact SHA, Node 22.23.5, and pnpm 10.34.9 before starting.
The scaffold task creates local `feat/web` and `feat/api` refs at this tip.
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
| Root configuration | Frozen; focused contract PR to `main` |
| `docs/API_CONTRACT.md` | Frozen; focused contract PR to `main` |

Frontend requests new root/shared dependencies from the lockfile owner. Package
manifest and lockfile changes must stay synchronized; coordinate even web-only
dependency additions. Never commit nested lockfiles.

Land the API PR first, or keep web in mock mode. Land web after real API
compatibility checks pass. Feature work uses PRs, not direct commits to `main`.
If a shared contract change is unavoidable, merge its small PR to `main`, notify
both developers, and rebase both branches before consuming the change.

PR acceptance: typecheck, tests, build, browser/mobile smoke checks, unchanged
request/response shapes, and the main demo flow when its backend is implemented.
