# Mochi collaboration rules

This is the shared scaffold for two independent implementation branches.

Mochi is a mobile-first, full-stack application with persistent user journeys
and QNX integration. Build interactive app behavior, including loading, error,
confirmation, and success states, against the PRD's acceptance criteria.

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
- Run `pnpm check` before committing and before PR acceptance, plus
  the applicable browser/mobile checks in `docs/SMOKE_TEST.md`.
- Local hooks are installed by `pnpm install` or `pnpm setup:hooks`. Use
  Conventional Commit subjects with at most 100 characters. Do not bypass hooks
  to hide a failing check; fix the issue and rerun the relevant verification.
- Complete the PR template with the affected application flow, validation,
  contract compatibility, and actual manual-check results.
- Do not claim phone, NFC, QR, QNX, or persistence verification without actually
  observing the relevant device or restart behavior.
