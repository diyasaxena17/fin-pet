# Standalone app integration smoke test

Run `pnpm install --frozen-lockfile` and `pnpm check`, then start `pnpm dev:api`
and `pnpm dev:web` in separate terminals. Keep `VITE_USE_MOCK=false`. Use a
throwaway `DATA_FILE` for integration testing so existing progress stays intact.

## Browser and API

- [ ] `/health` returns `{ "ok": true }`.
- [ ] A fresh `/api/state` returns `{ "initialized": false }`; opening the app
  launches onboarding.
- [ ] Onboard with a $200 goal and three original letter parts; dashboard loads.
- [ ] Skip a $60 item: 60 coins, 20 XP, $60 potential savings, $0 confirmed.
- [ ] Log $50 actually saved: 50 XP total, 25% goal, first original section revealed.
- [ ] Open `/tap?petId=mochi-01` directly or through app navigation. Opening and
  refreshing must not spend coins. Confirm once: 40 coins, fullness 80, happy pet.
- [ ] Repeat a decision/savings/feed UUID: current state is returned with no
  duplicated reward, savings, or feed cost.
- [ ] Try an API feed with fewer than 20 coins: 409 and no state change.
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
- [ ] Removed `/api/device/state` and `/api/device/gesture` routes return 404.
- [ ] All routes fit desktop and narrow mobile viewports, with clear loading,
  empty, error, confirmation, and success behavior.

## Physical phone and optional shortcuts

These require an actual phone; browser viewport emulation does not complete them.

- [ ] On the same Wi-Fi, open `http://<laptop-ip>:3000/health` from the phone.
- [ ] Open `http://<laptop-ip>:5173` and complete the normal in-app feeding flow.
- [ ] If using NFC/QR, encode `http://<laptop-ip>:5173/tap?petId=mochi-01`, scan
  it, and verify the confirmation appears without spending coins automatically.

On macOS find the Wi-Fi interface with `networksetup -listallhardwareports`, then
use `ipconfig getifaddr en0` (adjust the interface if needed). On Linux use
`hostname -I`. Network isolation/firewalls may block access despite a 0.0.0.0
binding. Request IDs use browser `crypto.getRandomValues` so LAN HTTP does not
require `crypto.randomUUID`, which is restricted to secure contexts.

For isolated frontend work, `VITE_USE_MOCK=true` uses the same validation/rules
but session memory only. It does not demonstrate restart persistence.
