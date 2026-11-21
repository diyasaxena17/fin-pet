# Standalone app integration smoke test

Run `pnpm install --frozen-lockfile` and `pnpm check`, then start `pnpm dev:api`
and `pnpm dev:web` in separate terminals. Keep `VITE_USE_MOCK=false`. Use a
throwaway `DB_PATH` (SQLite) for integration testing so existing progress stays intact.

## Browser and API

- [ ] `/health` returns `{ "ok": true }`.
- [ ] A fresh `/api/state` returns `{ "initialized": false }`; opening the app
  launches onboarding.
- [ ] Onboard with a $200 goal and three original letter parts; dashboard loads.
- [ ] Skip a $60 item: 60 acorns, 20 XP, $60 potential savings, $0 confirmed.
- [ ] Log $50 actually saved: 50 XP total, 25% goal, first original section revealed.
- [ ] Open `/tap?petId=mochi-01` directly or through app navigation. Opening and
  refreshing must not spend coins. Confirm once: 40 acorns, fullness 80, happy pet.
- [ ] Repeat a decision/savings/feed UUID: current state is returned with no
  duplicated reward, savings, or feed cost.
- [ ] Try an API feed with fewer than 20 acorns: 409 and no state change.
- [ ] Edit the full original letter while milestone reveals remain gated.
- [ ] Demo-seed 100 XP, see the DEMO label and daily quest. Repeated same-day
  completion gives only one reward, even with a fresh request ID.
- [ ] Seed 250 XP: expanded simulator appears. Basic projection remains available
  at level 1; projection changes never write app state.
- [ ] Restart the backend with the same file and reload. Goal, letter, pet,
  balances, quest streak, and request deduplication remain intact.
- [ ] With `DEMO_MODE=false`, seed and reset return 404.
- [ ] Demo reset clears state and returns the app to onboarding.
- [ ] Invalid amounts/UUIDs/JSON return 400. Duplicate onboarding returns 409.
- [ ] Device state and gesture routes return 404 by default; with
  `ENABLE_DEVICE_API=true`, they preserve the private legacy device shape.
- [ ] All routes fit desktop and narrow mobile viewports, with clear loading,
  empty, error, confirmation, and success behavior.

## Addendum API and primary NFC report

- [ ] Open `/check-in` and reload/refresh. Only GETs occur; no reward or reaction.
- [ ] Confirm a level-2 check-in explicitly. New and legacy routes, fresh and
  replayed UUIDs, and concurrent calls award once per Toronto local day.
- [ ] Force a report load failure; use Retry report. A retry only reads.
- [ ] Without a configured daily limit, the report/page makes no under-budget
  claim. With one, recorded spending and the within/above-target message agree.
- [ ] Set cute/calm preference and monthly/daily/category limits, then restart
  with the same database. Values and original letter remain intact.
- [ ] Log a manual transaction; retry its ID. Counts/totals change once, while
  goal confirmed/potential savings, tree progress and letter reveals stay fixed.
- [ ] Check offset timestamps around local month boundaries and exact CAD cents.
- [ ] Observe three matching purchases in seven days: count/total only, no
  inferred mood. Empty records return no invented insight.
- [ ] Transactions become due for reflection after 24 hours. Persist one verdict;
  retries grant no reward and changed verdicts fail without consuming the new ID.
- [ ] Answer a lesson incorrectly, then correctly with a new ID. Correct answers
  earn once; retries, new IDs and restarts cannot award again.
- [ ] Open an existing v1 SQLite account: original letter whitespace, decisions,
  successful IDs and device reaction cursor survive the schema upgrade/restart.
- [ ] Verify 75% confirmed progress is mature while letter reveals remain two.

Run the optional browser harness documented in `apps/api/HARDWARE_DEMO.md` to
exercise the real HTTP adapters and inspect its desktop/mobile screenshots.

## Physical phone and optional shortcuts

These require an actual phone; browser viewport emulation does not complete them.

- [ ] On the same Wi-Fi, open `http://<laptop-ip>:3000/health` from the phone.
- [ ] Open `http://<laptop-ip>:5173` and complete the normal in-app feeding flow.
- [ ] If using NFC/QR, encode `http://<laptop-ip>:5173/check-in`, scan
  it, and verify the daily report opens without a reward. The optional legacy
  feed URL `/tap?petId=mochi-01` must require its own explicit confirmation.

On macOS find the Wi-Fi interface with `networksetup -listallhardwareports`, then
use `ipconfig getifaddr en0` (adjust the interface if needed). On Linux use
`hostname -I`. Network isolation/firewalls may block access despite a 0.0.0.0
binding. Request IDs use browser `crypto.getRandomValues` so LAN HTTP does not
require `crypto.randomUUID`, which is restricted to secure contexts.

For isolated frontend work, `VITE_USE_MOCK=true` uses the same validation/rules
but session memory only. It does not demonstrate restart persistence.
