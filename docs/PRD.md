# Mochi product scaffold

Mochi turns small savings decisions into care for a virtual pet and progress
toward a personal goal. A phone provides onboarding and the dashboard; NFC/QR
opens `/tap`; a QNX device polls a small, stable pet state endpoint.

## Core demo

1. Onboard with a name, pet name, $200 goal, and three letter sections.
2. Skip a $60 purchase: earn 60 coins and 20 XP, record $60 potential savings,
   and keep confirmed savings at $0.
3. Record $50 actually saved: reach 25% of the goal and reveal letter section 1.
4. Scan the real NFC/QR URL, confirm a feed, spend 20 coins, and advance
   `reactionSeq` once. QNX reacts only to a newer sequence number.
5. Preserve state through backend restarts and show the same dashboard on phone.
6. In demo mode, seed levels 2 and 3 to demonstrate feature gating.

## Pages and ownership

- Onboarding: profile, goal, and three-part Future Me letter.
- Dashboard: pet, wallet, goal, potential/confirmed savings, and gated features.
- Tap: explicit feed confirmation; opening or refreshing the URL never feeds.
- Future Me: letter editing and milestone reveals; projection at level 3.

The frontend owns page UX; backend owns validation, persistence, rewards,
milestones, pet state, and the device endpoint. Both use the shared contract.

## Scope of this repository scaffold

The scaffold delivers the toolchain, shared types/fixture, read API, typed live
and mock adapters, page shells, tests, and integration instructions. Finished
page interactions, live mutation handlers, durable storage, and hardware checks
remain implementation work.

## Assumptions supplied by the scaffold

No original PRD or API contract was supplied. The required $60/$50/feed arithmetic
comes directly from the plan. Additional proposed defaults are integer cents,
25%/50%/100% letter reveals, level 2 at 100 XP, level 3 at 300 XP, quests at level
2, projection at level 3, and a one-time first-save quest worth 10 coins/20 XP.
Review these before implementation; change them through a contract PR afterward.
