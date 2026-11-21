# Mochi

Mochi is a mobile-first, full-stack financial companion application delivered
through the browser and connected to a physical QNX pet. Users complete
onboarding, make purchase decisions, record savings, reveal their Future Me
letter, and confirm NFC/QR feeding through interactive app screens. Express owns
the shared state, persistence, validation, rewards, and device events.

This repository is the application scaffold for the frontend, backend, and QNX
teams. Full app acceptance requires working user journeys, durable state across
API restarts, and device integration as specified in [the PRD](docs/PRD.md).
The live mutation flow and persistence remain implementation work.

## Toolchain and setup

Use **Node 22.23.5** (`.nvmrc` / `.node-version`) and **pnpm 10.34.9** on both
developers' machines. Do not use npm or Yarn to install workspace dependencies.

```sh
nvm install
nvm use
corepack enable
corepack prepare pnpm@10.34.9 --activate
node --version
pnpm --version
pnpm install --frozen-lockfile
cp .env.example .env
```

Installation enables the repository's local Git hooks. To enable them again in
an existing checkout, run `pnpm setup:hooks`.

The stack is TypeScript, Vite, React, Express 5, Tailwind 4, and Vitest. Both
owners' initial dependencies are installed together, including React Router,
Testing Library, Zod, and Supertest. Vite uses the official
[Node requirements](https://vite.dev/guide/) and Tailwind's
[Vite integration](https://tailwindcss.com/docs/installation/using-vite).

Run in two terminals from the repository root:

```sh
pnpm dev:api
```

```sh
pnpm dev:web
```

Open `http://localhost:5173`. API health: `http://localhost:3000/health`.
Vite listens on `0.0.0.0:5173` and forwards `/api` to `http://localhost:3000`.
Both apps load the root `.env`; frontend code only receives `VITE_` variables.
Never put secrets in `VITE_` variables or commit `.env` files.

```sh
pnpm check
pnpm --filter @mochi/api start
```

## What is ready

- Shared root-exported request/response types, a recursively frozen JSON fixture,
  and an isolated `createAppState()` factory.
- `GET /health`, `GET /api/state`, and stable `GET /api/device/state` responses.
- Four routed web page shells and a dashboard that reads state through the API.
- All eight typed adapter functions and a session-only mutable mock implementing
  the agreed demo arithmetic. Set `VITE_USE_MOCK=true` and restart Vite to use it.
- API mutation routes reserved with explicit `501 NOT_IMPLEMENTED` responses.
- Supertest API checks, adapter checks, fixture isolation checks, and the mock
  demo flow in Vitest.

The backend still needs mutation services, request validation, and persistence.
The frontend still needs forms, confirmation actions, and finished page behavior.
`DATA_FILE` is configured but unused until the backend repository is implemented.
Mock state resets on reload and is never a persistence substitute.

## Ownership and branches

**Backend owner maintains the single root `pnpm-lock.yaml`.** Frontend requests
new root/shared dependencies rather than editing the lockfile on its branch.
See [the branch and ownership rules](docs/BRANCHING.md). Both branches must start
from the completed `chore/repo-setup` tip, shared with `main` at handoff.

The [API contract](docs/API_CONTRACT.md) was drafted from the supplied scaffold
plan before the v1.0 PRD was supplied. The PRD defines the intended app behavior;
the scaffold contract still needs reconciliation for the level-3 XP threshold,
coin rounding/cap, request deduplication, and device hunger/event fields. Both
owners must resolve these in a contract PR before implementing affected flows.
After handoff, shared files
change through a contract PR to `main`, followed by both owners rebasing.

## Commit and PR checks

`pnpm check` runs commit-validator tests, workspace typechecking, Vitest tests,
and production builds. The pre-commit hook runs this command and checks staged
whitespace. The commit-msg hook requires Conventional Commit subjects, such as
`feat(web): add savings confirmation`, with a maximum of 100 characters.

GitHub Actions runs the same checks on pushes and PRs, plus commit-message
validation. PRs validate every non-merge commit in the proposed change. Use the
PR template to record the app flow, automated results, mobile/device evidence,
and contract compatibility; leave checks unmarked when they have not been run.

Local hooks validate the working tree; CI validates the proposed committed tree.
Repository maintainers should require `CI / quality` and `CI / commit-messages`
on `main` through GitHub branch protection or rulesets. Those remote settings
must be configured separately; committing a workflow does not enable them.

## Phone, NFC, QR, and QNX smoke test

See [the smoke test checklist](docs/SMOKE_TEST.md). Check the real phone/device
on the same network before either owner starts feature work. A laptop-only HTTP
request does not prove the device can reach the API.
