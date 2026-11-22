# Forest frontend integration

Source: forest-fe (2c787f2). Target synced: chore/forest-v2-contract (e16fada).

Resolved modify/delete conflicts by retaining source API-backed pages, shared
page components and their tests, including Settings. The target's behavioural
shell remains as SignalsApp: /signals is its passive entry; /intent, /check-ins,
/lab retain their routes. The forest preview remains home; /?legacy=1 and account
paths retain live API journeys. The existing AppProvider was restored for account
routes. Lazy-loaded experiences have an accessible loading status. Both source
forest CSS and target Winter Oak styles are retained.

Validation actually observed:
- Web TypeScript check passed.
- All 55 frontend tests passed, including 8 new experience-routing assertions;
  source account/NFC/topic/setting tests and target behavioural tests retained.
- pnpm check passed with Node 22.23.5/pnpm 10.34.9: six native suites,
  115 reference transitions, 66 addendum parity requests, workspace tests/builds.
- git diff --cached --check passed; no unresolved merge entries remain.
- Playwright browser smoke on temporary API (3000) and Vite (5174): forest home,
  /signals and /settings rendered at desktop and 390x844 with no horizontal
  overflow or console errors. Forest home -> Behavioural tools navigation worked.
- Settings saved Maple/calm via real PUT /api/preferences (HTTP 200), then browser
  reload retained Maple and the $200 goal. Isolated temporary SQLite data only.
- React review: route predicates are stable primitives; lazy imports avoid loading
  all experiences initially; Suspense has a status fallback; navigation links and
  existing form labels are retained. No new dependencies or API changes.

The forest companion screen is source-branch local preview state (including its
hardware animation), not an API-backed account or actual hardware control.
Behavioural tools retain their separate browser storage/persona-ledger model.
The account routes use src/lib/api.ts. No physical phone, NFC scan, speaker or
Raspberry Pi checks were performed. Native automated suites cover process restart;
the browser smoke observed reload, not physical persistence/hardware behavior.
Browser evidence retained locally in /private/tmp/forest-fe-browser-0qv_2q2b.
Temporary servers and their database were stopped/cleaned up after verification.
