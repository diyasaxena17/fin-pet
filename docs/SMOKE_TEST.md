# Integration smoke test

Check items only after observing them. A responsive browser viewport is useful
layout QA but does not count as a physical phone, NFC, QR, or QNX test.

## Scaffold checks

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

Start API and web in separate terminals. Keep `VITE_USE_MOCK=false` initially.

```sh
pnpm dev:api
```

```sh
pnpm dev:web
```

- [ ] Laptop: `http://localhost:3000/health` returns `{ "status": "ok" }`.
- [ ] Laptop: `/api/state` returns the shared fixture.
- [ ] Laptop: `http://localhost:5173/api/state` returns the same response via proxy.
- [ ] Laptop: dashboard renders fixture balances; `/onboarding`, `/tap`, and
  `/future-me` load directly and after refresh.
- [ ] Phone: same Wi-Fi, open `http://<laptop-ip>:3000/health`.
- [ ] Phone: open `http://<laptop-ip>:5173`, confirm state loads through proxy.
- [ ] QNX: same reachable network, poll `http://<laptop-ip>:3000/api/device/state`.
- [ ] Write the **actual** `http://<laptop-ip>:5173/tap` URL to NFC / QR and scan
  on a physical phone. Confirm the route opens early, before feature work.

On macOS, find the active Wi-Fi interface with `networksetup -listallhardwareports`,
then use `ipconfig getifaddr en0` (replace `en0` if necessary). On Linux, use
`hostname -I`. Binding `0.0.0.0` allows LAN access; phone firewalls or Wi-Fi client
isolation can still block it. Keep the same IP in the tag/code and use `http`.

## Full implementation acceptance

These require backend mutations/persistence and frontend interactions. They are
not implemented by the scaffold. The matching mock arithmetic is covered by
`apps/web/src/lib/mockApi.test.ts`.

- [ ] Turn mock mode off; restart Vite after editing root `.env`.
- [ ] Onboard with a $200 goal and three-part letter.
- [ ] Skip a $60 item: 60 coins, 20 XP, $60 potential savings, $0 confirmed.
- [ ] Log $50 saved: 25% goal, first letter section revealed.
- [ ] Scan NFC/QR `/tap`, then explicitly confirm feed: 40 coins and one
  `reactionSeq` increment. Cancel/open/refresh must not feed.
- [ ] QNX observes a higher sequence and wags once; repeated polls do not wag.
- [ ] Restart API, reopen phone dashboard, confirm balances, letter progress,
  and reaction sequence persist; QNX does not replay an old reaction.
- [ ] With `DEMO_MODE=true`, seed level 2 then 3; check quest/projection gating.
- [ ] With `DEMO_MODE=false`, seed endpoint returns 403.

For isolated frontend work set `VITE_USE_MOCK=true`. Its state lives in memory,
resets on reload, and cannot drive the physical QNX device.
