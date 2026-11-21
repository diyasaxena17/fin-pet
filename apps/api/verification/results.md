# Backend verification and PR notes

Observed on November 21, 2026 (America/Toronto), on `feat/api` rebased onto the
frozen standalone contract on `main`. All implementation changes are under
`apps/api/`; frontend, shared packages, root configuration, and lockfile are unchanged.

## Application change

A native C++20 service replaces the Express implementation. The user can onboard,
skip a $60 purchase, earn 60 coins/20 XP, record $50 saved toward a $200 goal,
reveal the original first letter section at 25%, and explicitly confirm feeding.
SQLite persists progress, decisions and successful action IDs atomically.
Daily quests, feature unlocks, letter editing and clearly marked demo seeds work
against the existing React client.

The attached backend prompt requested hardware routes that the current contract
removed. Those routes remain 404 by default. `ENABLE_DEVICE_API=true` enables a
separate minimal Pi API without changing frontend JSON. C++ ports the frozen
TypeScript rules; a differential test compares 115 transitions with the actual
shared schemas/domain, so both implementations are checked against one reference.
No shared TypeScript files were edited.

## Validation

- [ ] `pnpm install --frozen-lockfile` rerun: not performed; existing installed
  workspace dependencies were used. Dependency declarations are unchanged.
- [x] Final `pnpm check` passed with Node 22.23.5 and pnpm 10.34.9, including
  validator tests, workspace typechecks, all tests, and both application builds.
- [x] Native CMake build and CTest passed: core rule/transaction/concurrency tests
  plus nine real HTTP scenarios using isolated SQLite databases and process restarts.
- [x] TypeScript reference parity: 115 successful/error transitions match exact
  AppState or status/error code, including unchanged state after rejected inputs.
- [x] Conventional Commit subjects and repository hooks are enabled and passing.
- [x] Request and response shapes match the frozen standalone contract; no
  frontend/shared/root contract changes or dependency additions.
- [x] Empty account, malformed/oversized input, insufficient coins, locked quest,
  repeated onboarding, unknown routes, disabled demos, and write failures checked.
- [x] SQLite failure injected **after state UPDATE**, on UUID INSERT: HTTP 500,
  old state retained, no ID/history committed, and same-ID retry succeeds.
- [x] Corrupt state, missing state row, and unknown schema version fail startup.
- [x] The example Python Pi poller took an initial baseline silently, printed
  exactly one feed event, and printed no extra event after the same UUID replay.
  This exercised software polling only, with no GPIO/actuator attached.

## Manual app checks

- [x] Existing React/Vite client used its real API adapter, not mock mode.
- [x] Desktop onboarding and purchase/savings journey exercised in a browser.
- [x] Skip: 60 coins, 20 XP, $60 potential savings, $0 confirmed savings.
- [x] Save: $50 confirmed, 50 XP total, 25% progress, first exact letter text visible.
- [x] Direct `/tap?petId=mochi-01` opening and refresh left 60 coins/fullness 50.
- [x] Explicit confirmation returned 40 coins, 50 XP, fullness 80, happy pet and
  the rendered success message. Browser console had zero errors.
- [x] Narrow viewport 390 × 844: feeding screen and Future Me screen exercised,
  with no horizontal overflow. This is viewport emulation, not a physical phone.
- [x] Backend process terminated/restarted against the same browser-test database;
  page reload retained coins, XP, $50 confirmed savings, original letter, fullness,
  and device sequence 1. Automated tests also replay IDs after process restarts.
- [x] Browser demo-seed 100 XP exposed daily check-in; completing it showed streak 1
  and disabled repeat completion. Seed 250 XP displayed the expanded simulator and
  persistent DEMO label.
- [x] Optional device API read exactly five fields; browser feed produced one
  `feed` event (sequence 1). HTTP tests verified replay, privacy, greeting cooldown
  and persistence. No physical actuator was connected.
- [ ] Physical phone Wi-Fi access, actual NFC/QR scan and physical Raspberry Pi
  tail/sound reaction: not observed; require those devices.

Screenshot: [mobile feeding after restart](mobile-feed.png).

Observed dev-server URLs were `http://127.0.0.1:5173/` and API port 3000. Vite
reported LAN IP `172.23.35.172`; phone/Pi access to that address was not verified.
For that network, the shortcut is
`http://172.23.35.172:5173/tap?petId=mochi-01` and Pi endpoint is
`http://172.23.35.172:3000/api/device/state`. Recheck the IP when networks change.

The example Python poller is a software handoff point for the hardware owner;
servo/speaker/camera/NFC-reader implementation remains outside this backend.
No PR was opened or merged. These notes follow the repository PR template for
review/handoff; checkboxes describe observed results only.
