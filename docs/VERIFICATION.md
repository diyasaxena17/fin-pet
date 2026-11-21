# Scaffold verification — November 20, 2026

Verified locally using Node 22.23.5 and pnpm 10.34.9:

- Frozen-lockfile installation succeeds with the single root lockfile.
- `pnpm typecheck` passes across contracts, API, and web.
- `pnpm test` passes: 13 tests across four test files. Supertest required local
  HTTP listener permission in the execution sandbox.
- API and web production builds pass. Web also builds with `VITE_USE_MOCK=true`.
- The built API starts and serves health; with `DEMO_MODE=false`, demo seed
  returns 403 and `DEMO_DISABLED`.
- Live `/health`, `/api/state`, and Vite's proxied `/api/state` respond correctly.
- Dashboard renders the real fixture through the proxy. Repeated device-state
  polls return the same sequence without changing state (Supertest).
- All four web routes load directly at 390 × 844 without horizontal overflow.
- Mock dashboard renders with `/api/**` requests blocked and makes zero API
  requests.
- A request from this laptop to its LAN address on port 3000 returns healthy.

## Still requires implementation or physical access

- Both developers must select the pinned toolchain and review the inferred
  contract assumptions before feature work.
- Physical phone and QNX network reachability was not tested. Laptop LAN
  self-access does not establish physical-device reachability.
- NFC/QR scanning and QNX wag behavior were not tested on hardware.
- Live mutation services, validation, persistence, and full page interactions
  are not implemented. Mutation endpoints deliberately return 501.
- Backend restart persistence and the complete real integration flow therefore
  remain unchecked. The demo arithmetic currently passes in the frontend mock.

Use `docs/SMOKE_TEST.md` for the remaining checks. No remote Git push or hosted
deployment was performed.
