# Mochi

Shared starting point for the web, API, and QNX teams. This setup scaffolds the
project; the production demo mutation flow is the next implementation task.

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
pnpm typecheck
pnpm test
pnpm build
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
plan because no earlier contract or PRD was present. The documented assumptions
need both owners' review before implementation. After handoff, shared files
change through a contract PR to `main`, followed by both owners rebasing.

## Phone, NFC, QR, and QNX smoke test

See [the smoke test checklist](docs/SMOKE_TEST.md). Check the real phone/device
on the same network before either owner starts feature work. A laptop-only HTTP
request does not prove the device can reach the API.
