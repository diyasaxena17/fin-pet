# Squirrel & Tree

A mobile-first financial companion where a squirrel and growing savings tree
make everyday progress visible. Set a goal, write a Future Me letter, plan a
budget, reflect on purchases, and build positive habits. Earn acorns and XP for
financial decisions, lessons and daily check-ins; confirmed savings grow the tree
and reveal your original letter. Feed your squirrel with an explicit in-app
confirmation.

React provides the interactive screens; a C++20 API validates actions and
persists state in SQLite. NFC/QR links can open the read-only daily report;
rewards require an explicit check-in. Legacy feeding links still require
confirmation.

The home route `/` opens the forest companion preview with local demonstration
state. Open `/?legacy=1` for the API-backed account dashboard, or `/signals` for
behavioural tools; `/intent`, `/check-ins` and `/lab` remain available. The preview's
hardware visuals are simulated. See [frontend routes and data sources](apps/web/README.md).

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

The backend also requires CMake, a C++20 compiler, SQLite development headers and
Python 3 for tests. See the [backend setup guide](apps/api/README.md) for platform
details and the optional LAN launcher.

Open `http://localhost:5173`. Health: `http://localhost:3000/health` returns
`{ "ok": true }`. Fresh state is `{ "initialized": false }`; the API-backed account dashboard launches
onboarding. Vite binds `0.0.0.0:5173` and proxies `/api` to port 3000. Vite loads
an optional root `.env`; frontend code receives only `VITE_` variables.
No environment file is required for the default local setup. The C++ backend
reads process environment variables, so export optional API settings in its
terminal. Never put secrets in frontend variables or commit `.env` files.

## Working application flow

1. Onboard with a squirrel name, $200 goal, optional date, and three letter sections.
2. Skip a $60 purchase: 60 acorns, 20 XP, $60 potential savings, $0 confirmed.
3. Record $50 actually saved: 50 total XP, 25% progress, a sapling, and the first
   original letter section revealed.
4. Open the feeding screen and confirm: 40 acorns, fullness 80, happy squirrel.
5. At 100 XP, daily quests and streaks unlock. At 250 XP, the expanded Future Me
   simulator unlocks. The basic projection and full original-letter editing are
   available from level 1.

Amounts are CAD numbers at the API boundary and integer cents in storage.
Confirmed savings are self-reported; the app does not move money. Projections
separate contributions from illustrative growth and are not guarantees.

Actions are validated server-side and return the agreed state or response wrapper.
Spending records power budgets, evidence-based insights and 48-hour Worth-It
reflections without changing goal savings. Name and cute/calm voice preferences
persist while keeping the squirrel's internal identity and progress intact.
Reward-bearing actions use UUID request IDs to prevent duplicate rewards or
spending on retries. The app preserves an ID for retries of a pending operation
within the current session; it does not automatically retry mutations.

The API persists account state, transactions, decisions, quest dates, lesson
completions, reflections and successful request IDs in SQLite. `DB_PATH` defaults
to `apps/api/data/mochi.sqlite3` under the configured source tree. Mutations and
successful IDs commit atomically; failed actions consume no ID. Existing v1
accounts upgrade without resetting progress. Corrupt or incompatible databases
fail startup rather than being replaced. Runtime data is ignored by Git. Use
sample data for this unauthenticated local demo.

`DEMO_TIME_ZONE` defaults to `America/Toronto` for daily quest boundaries.
`DEMO_MODE=true` enables seed/reset endpoints; otherwise they return 404. Vite's
dev app includes local demo controls. Seeded accounts display a persistent DEMO
label. Reset clears all account data after confirmation.

Set `VITE_USE_MOCK=true` and restart Vite for frontend work without the API.
The mock uses shared validation and game rules with session-only memory that
resets on reload; parity tests keep the C++ API compatible.

## Fourteen-day financial sandbox

The [sandbox guide](apps/api/SANDBOX.md) provides a deterministic two-week story:
Week 1 has repeated takeout and impulse purchases; Week 2 improves budgeting and
builds savings and simulated investments. Select any of 14 local end-of-day
snapshots to inspect historical budgets, insights, rewards, tree growth and goals.

The user-selected replay is read-only and persists across restarts in an isolated
SQLite sidecar. Future activity is excluded from earlier days; selecting a new
day requires stopping and restarting the API. Income, expenses, savings transfers
and investments stay separate in the typed native ledger, with investment gains
clearly labeled as simulated. The existing purchase API remains expense-only,
and the real account is preserved. Enable `DEMO_MODE=true DEMO_SANDBOX=true` and
follow the guide's seed/day-selection commands. Replay mode does not drive hardware.

## Packages and ownership

- `apps/web`: interactive React application and typed live/mock adapters.
- `apps/api`: C++20 HTTP API, SQLite persistence, deterministic replay and native/API tests.
- `packages/contracts`: shared request schemas/types and frozen sample state.
- `packages/domain`: pure state transitions for the mock/reference; C++ parity tests verify compatibility.

Frontend owns `apps/web/**`; backend owns `apps/api/**` and the single root
`pnpm-lock.yaml`. Shared contract/domain changes require coordination through a
contract PR. Both implementation branches must start from the accepted setup
tip. See [branching rules](docs/BRANCHING.md).

## Commit and PR checks

```sh
pnpm check
pnpm --filter @mochi/api start
```

`pnpm check` runs hook-validator tests, workspace typechecking, Vitest, C++
builds/CTest, API/reference parity tests, and production builds. Pre-commit runs
this command and checks staged whitespace. Commit-msg
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
