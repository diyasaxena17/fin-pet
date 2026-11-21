# Mochi collaboration rules

This is the shared scaffold for two independent implementation branches.

- Use the Node version in `.nvmrc` and pnpm version in root `package.json`.
- `feat/web` owns `apps/web/**`; pages use `src/lib/api.ts`, never direct fetch.
- `feat/api` owns `apps/api/**` and maintains the root `pnpm-lock.yaml`.
- `packages/contracts/**`, root configuration, and `docs/API_CONTRACT.md` are
  frozen after the scaffold handoff. Change them in a focused contract PR to
  `main`, then rebase both implementation branches before consuming the change.
- Frontend dependency additions must be coordinated with the backend lockfile
  owner. Do not generate a second lockfile.
- Monetary amounts are integer cents. Potential savings are separate from
  confirmed savings. Device polling must never increment `reactionSeq`.
- Keep credentials and runtime state out of Git.
- Before PR acceptance run `pnpm typecheck`, `pnpm test`, and `pnpm build`, plus
  the applicable browser/mobile checks in `docs/SMOKE_TEST.md`.
- Do not claim phone, NFC, QR, QNX, or persistence verification without actually
  observing the relevant device or restart behavior.
