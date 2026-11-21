# Mochi collaboration rules

This is the shared scaffold for two independent implementation branches.

Mochi is a standalone mobile-first, full-stack application with persistent user
journeys and a virtual pet. Build interactive app behavior, including loading, error,
confirmation, and success states, against the PRD's acceptance criteria.

- Use the Node version in `.nvmrc` and pnpm version in root `package.json`.
- `feat/web` owns `apps/web/**`; pages use `src/lib/api.ts`, never direct fetch.
- `feat/api` owns `apps/api/**` and maintains the root `pnpm-lock.yaml`.
- `packages/contracts/**`, `packages/domain/**`, root configuration, and `docs/API_CONTRACT.md` are
  frozen after the scaffold handoff. Change them in a focused contract PR to
  `main`, then rebase both implementation branches before consuming the change.
- Frontend dependency additions must be coordinated with the backend lockfile
  owner. Do not generate a second lockfile.
- Monetary amounts are CAD numbers at the API boundary and integer cents in
  domain/storage. Potential savings are separate from confirmed savings.
- API and mock share validation and pure game logic through contracts/domain.
  Persist successful request IDs atomically with state; failed actions consume
  no ID. Feeding works in-app; device/gesture endpoints are outside current scope.
- Keep credentials and runtime state out of Git.
- Run `pnpm check` before committing and before PR acceptance, plus
  the applicable browser/mobile checks in `docs/SMOKE_TEST.md`.
- Local hooks are installed by `pnpm install` or `pnpm setup:hooks`. Use
  Conventional Commit subjects with at most 100 characters. Do not bypass hooks
  to hide a failing check; fix the issue and rerun the relevant verification.
- Complete the PR template with the affected application flow, validation,
  contract compatibility, and actual manual-check results.
- Do not claim physical phone, NFC/QR, or persistence verification without
  observing the relevant phone, scan, or restart behavior.
