# Hardware integration verification / PR notes

Observed November 21, 2026 (America/Toronto), on `feat/api`.

## Application change

Added a repeatable LAN demo launcher, a configurable Pi controller adapter,
boot baselining, duplicate-process protection, automatic reconnect/backoff, and
a real-browser NFC confirmation regression. The C++ backend sources, transaction
implementation, endpoint shapes, shared contracts, React frontend and root
lockfile were not changed by this task. Only `apps/api/` was edited.

Milestones:

- `3e2e572`: LAN startup script, preserved database, port preflight and tests.
- `b80c09e`: Pi feed dispatch, silent boot baseline, controller adapter, reconnect
  and fake-controller integration tests.
- Final test/documentation milestone: automated NFC browser test, incomplete HTTP
  response recovery, and [live runbook](../HARDWARE_DEMO.md).

## Validation

- [x] CMake configuration/build passed.
- [x] CTest passed: core rules; ten HTTP scenarios including actual controller
  calls through a fake Python module and backend stop/restart; launcher restart
  and occupied-port tests; six deterministic poller tests.
- [x] Frozen TypeScript comparison remained passing: 115 transitions.
- [x] Repository `pnpm check` passed at both implementation milestones and on
  the final rerun with Node 22.23.5 / pnpm 10.34.9: hook-validator tests,
  typechecks, all default tests, reference parity and both application builds.
- [x] Conventional Commit subjects and existing hooks retained.
- [x] No backend transaction/deduplication rewrite or frozen contract changes.
- [x] No dependency additions; only an optional `test:hardware` package script.
- [ ] Fresh workspace dependency installation not repeated; existing installed
  dependencies and an external Playwright installation were used.

## Browser → API → fake Pi controller

Executed `pnpm --filter @mochi/api test:hardware` using external Playwright 1.62.1,
installed Google Chrome, a 390 × 844 viewport, the unchanged React/Vite frontend,
a native C++ process, an isolated temporary SQLite DB and a temporary controller.
The runner started and cleaned up its own servers/controller/data.

- [x] Onboarded sample account, skipped $60, recorded $50 actual savings.
- [x] Opened the real `/tap?petId=mochi-01` URL, refreshed, cancelled back to the
  dashboard and reopened it: **zero feed POSTs**, coins 60, fullness 50, device
  state unchanged. No hardware call occurred.
- [x] Explicit confirmation: **one feed POST**, coins 40, XP 50, fullness 80,
  happy mood, rendered meal-success message, device sequence 1 / type `feed`.
- [x] Replayed the same submitted feed payload/UUID: unchanged state and sequence.
- [x] Fake module received exactly one `wag_tail()` and one `play_happy_sound()`;
  repeated polls/retry produced no second call. This was software, not a motor.
- [x] No browser page errors.

Observed result excerpt:

```json
{
  "opened": {"coins":60,"hunger":50,"feedPosts":0},
  "confirmed": {"coins":40,"xp":50,"hunger":80,"feedPosts":1},
  "device": {"petId":"mochi-01","mood":"happy","hunger":80,"reactionSeq":1,"reactionType":"feed"},
  "retryUnchanged": true,
  "controllerCalls": ["wag_tail","play_happy_sound"],
  "physicalHardware": false
}
```

## Poller reliability

- [x] An old `feed` snapshot on boot was baselined without dispatch.
- [x] A new feed sequence dispatched once; repeated identical snapshots did not.
- [x] Level-up/greeting/null did not wag; a decreased database sequence rebaselined.
- [x] Motor/sound errors did not repeat the same motion.
- [x] Invalid snapshots did not advance the cursor.
- [x] Connection failures and incomplete HTTP responses used capped backoff;
  reconnect reset the delay and retained the cursor.
- [x] In a real HTTP test, stopped/restarted the C++ process on the same port/DB;
  the poller stayed alive, reconnected without stale motion, then processed the
  next new feed. Persisted duplicate feed UUIDs still did not produce a new wag.
- [x] The lock rejected a second process/instance and released when closed.

The adapter gives **at-most-once dispatch per observed sequence**, not guaranteed
actuation across crashes. The existing latest-state endpoint is not an event
queue; multiple/superseding events during an outage can be missed. These existing
API limits are documented rather than changing the frozen contract.

## Network rehearsal

Ran the complete launcher with an isolated persistent rehearsal DB and the
existing Vite dev server. Both listened on `0.0.0.0` (API 3000, web 5173).
The launcher and Vite independently reported LAN IP `172.23.35.172`.

From the laptop through its **LAN address**, using direct requests:

- [x] `http://172.23.35.172:3000/health` → 200, `{"ok":true}`.
- [x] `http://172.23.35.172:3000/api/device/state` → 404/`NOT_INITIALIZED`
  before onboarding, confirming the enabled device route was reachable.
- [x] `http://172.23.35.172:5173/tap?petId=mochi-01` → 200, frontend HTML.
- [x] Read-only macOS firewall check returned `Firewall is disabled. (State = 0)`.
  No firewall/router settings were changed.
- [x] Temporary LAN/browser test servers stopped after verification.

This proves the laptop binding and local LAN-address responses. It does **not**
prove another device can reach the laptop through that network. The live
runbook covers the required external checks, firewall allowances and URL updates.

## Remaining physical dependencies

The user explicitly deferred the existing controller location and Pi access
("skip for now, will add later"). Consequently:

- [ ] Supply the Pi's actual module/file with no-argument `wag_tail()`; optionally
  `play_happy_sound()`. Verify its GPIO/power/audio behavior independently.
- [ ] Start the poller on the physical Pi with that controller; wait for baseline.
- [ ] Open app/health from a physical phone and poll state from the Pi on the LAN.
- [ ] Program/scan a real NFC tag or QR fallback and observe no charge on opening.
- [ ] Confirm feeding on the phone and observe exactly one physical tail wag / sound.
- [ ] Rehearse a real Wi-Fi interruption and Pi reboot without a stale wag.

No physical phone, tag scan, motor, speaker, or remote Pi behavior is claimed.
No PR was opened or merged. This document follows the repository's PR-template
categories for review and records actual observed results only.
