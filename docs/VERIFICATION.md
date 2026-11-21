# Standalone application verification — November 20, 2026

The current app uses the supplied API contract adapted for standalone virtual-pet
behavior. This record replaces the initial read-only scaffold verification.

## Automated coverage

Using Node 22.23.5 and pnpm 10.34.9, the commit hooks run `pnpm check`: hook
validator tests, all workspace typechecks, Vitest, and API/web production builds.
Coverage includes:

- Shared fixture immutability, CAD/UUID/date validation, and unknown-field rejection.
- Rounded/capped skip rewards, purchase records without penalties, savings XP,
  exact level boundaries, and all letter-reveal thresholds.
- Feeding cost/fullness cap and successful request-ID deduplication.
- Daily quests, same-day duplicates with new IDs, local midnight, and streaks.
- Concurrent identical requests and distinct concurrent savings updates.
- Persisted integer cents, decision history, and request IDs across repositories.
- Failed-write rollback and queue recovery; corrupt-file preservation.
- Disabled demo endpoints and removed device endpoints returning 404.
- Live HTTP adapter paths/direct responses and mock parity/isolation.
- Application onboarding, confirmation-only feeding, saved-letter editing, and
  retrying a lost response with the same pending UUID.
- Basic and expanded projection arithmetic, with separate hypothetical growth.

## Observed browser and runtime flow

Using a throwaway data file under `/private/tmp` and the real Vite proxy:

- Onboarded with a $200 goal and three original letter sections.
- Skipped $60: 60 coins, 20 XP, $60 potential, $0 confirmed.
- Recorded $50: 50 total XP, 25% goal progress, first section revealed.
- Opened and reloaded the feeding screen without spending. Explicit confirmation
  resulted in 40 coins, 50 XP, fullness 80, and happy pet mood.
- Viewed/edited the full original letter. Leading spaces and a newline survived
  saving and reloading; explicit labels remain accessible with saved content.
- Seeded 100 XP, completed the daily quest, then seeded 250 XP. The DEMO label,
  streak, quest completion, and expanded simulator appeared correctly.
- Stopped the API and restarted its built server with the same file. The browser
  retained balances, goal, pet, exact letter, streak, and demo level after reload.
- Completed mock-mode onboarding, skip, and feeding while `/api/**` requests
  were blocked; no API requests were made.
- Checked 390 × 844 layouts for the exercised mobile flow without horizontal
  overflow. The browser reported no console errors during the checked flow.
- Built both live and mock web modes. Zod emits dependency comment-annotation
  warnings during bundling; builds complete successfully.

## Remaining external checks

Physical-phone reachability and optional NFC/QR scanning were not tested.
Browser mobile emulation does not establish physical-phone connectivity.
No hardware integration is required by current scope. GitHub required-check
rulesets/branch protection still need remote configuration. No push or deployment
was performed.

Use `docs/SMOKE_TEST.md` for repeatable manual acceptance checks.
