# Mochi

Mochi is a standalone, mobile-first financial companion application with a
virtual pet. Users set a goal, write a Future Me letter, log purchase decisions,
record savings, and confirm feeding directly in the app. React provides the
interactive screens; Express owns validated actions and persistent state.
NFC/QR links are optional shortcuts to the feeding screen.

The [PRD](docs/PRD.md) and [active API contract](docs/API_CONTRACT.md) define the
current app scope. The original hardware proposal is retained only as a
[historical reference](docs/reference/API_CONTRACT.original.txt).

## Toolchain and setup

Use **Node 22.23.5** (`.nvmrc` / `.node-version`) and **pnpm 10.34.9**.

```sh
nvm install
nvm use
corepack enable
corepack prepare pnpm@10.34.9 --activate
pnpm install --frozen-lockfile
cp .env.example .env
```

Installation enables the repository's Git hooks; run `pnpm setup:hooks` to enable
them again in an existing checkout. Use pnpm for all workspace dependencies.

Run in separate terminals from the repository root:

```sh
pnpm dev:api
```

```sh
pnpm dev:web
```

Open `http://localhost:5173`. Health: `http://localhost:3000/health` returns
`{ "ok": true }`. Fresh state is `{ "initialized": false }`; the app launches
onboarding. Vite binds `0.0.0.0:5173` and proxies `/api` to port 3000. Both apps
load the root `.env`; frontend code receives only `VITE_` variables. Never put
secrets in frontend variables or commit `.env` files.

## Working application flow

1. Onboard with a pet name, $200 goal, optional date, and three letter sections.
2. Skip a $60 purchase: 60 coins, 20 XP, $60 potential savings, $0 confirmed.
3. Record $50 actually saved: 50 total XP, 25% progress, first letter reveal.
4. Open Feed Mochi and confirm: 40 coins, fullness 80, happy virtual pet.
5. At 100 XP, daily quests and streaks unlock. At 250 XP, the expanded Future Me
   simulator unlocks. The basic projection and full original-letter editing are
   available from level 1.

Amounts are CAD numbers at the API boundary and integer cents in storage.
Confirmed savings are self-reported; the app does not move money. Projections
separate contributions from illustrative growth and are not guarantees.

All account mutations are implemented, validated, and return state directly.
Reward-bearing actions use UUID request IDs to prevent duplicate rewards or
spending on retries. The app preserves an ID for retries of a pending operation
within the current session; it does not automatically retry mutations.

The API persists account state, decisions, quest dates, and successful request
IDs to `DATA_FILE` (default `./data/state.json`, relative to the workspace root).
Writes are serialized and committed via a flushed temporary file and rename.
Run one API process per data file. Corrupt files fail startup rather than being
replaced. Runtime data is ignored by Git. Use sample data for this unauthenticated
local demo.

`DEMO_TIME_ZONE` defaults to `America/Toronto` for daily quest boundaries.
`DEMO_MODE=true` enables seed/reset endpoints; otherwise they return 404. Vite's
dev app includes local demo controls. Seeded accounts display a persistent DEMO
label. Reset clears all account data after confirmation.

Set `VITE_USE_MOCK=true` and restart Vite for frontend work without the API.
The mock shares validation and game rules with the API but keeps session-only
memory and resets on reload.

## Packages and ownership

- `apps/web`: interactive React application and typed live/mock adapters.
- `apps/api`: Express routes, state service, serialized JSON repository, API tests.
- `packages/contracts`: shared request schemas/types and frozen sample state.
- `packages/domain`: pure state transitions shared by API and mock.

Frontend owns `apps/web/**`; backend owns `apps/api/**` and the single root
`pnpm-lock.yaml`. Shared contract/domain changes require coordination through a
contract PR. Both implementation branches must start from the accepted setup
tip. See [branching rules](docs/BRANCHING.md).

## Commit and PR checks

```sh
pnpm check
pnpm --filter @mochi/api start
```

`pnpm check` runs hook-validator tests, typechecking, Vitest, and production
builds. Pre-commit runs this command and checks staged whitespace. Commit-msg
requires Conventional Commit subjects with at most 100 characters, for example
`feat(web): add savings confirmation`.

GitHub Actions runs the same checks on pushes and PRs and validates commit
subjects. PRs check every non-merge commit in the proposed change. Complete the
PR template with application-flow and validation evidence. Local hooks check the
working tree; CI checks the proposed committed tree.

Remote maintainers must separately configure GitHub branch protection/rulesets
to require `CI / quality` and `CI / commit-messages` on `main`. Workflow files do
not enable those settings. Nothing is pushed automatically by this setup task.

Use [the smoke test](docs/SMOKE_TEST.md) for browser, persistence, and optional
physical-phone/NFC checks; see [verification results](docs/VERIFICATION.md) for
what was actually observed.
