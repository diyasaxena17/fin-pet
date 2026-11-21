# Mochi — Software Product Requirements Document

**Version:** v1.1 — Hack Western 13 standalone app MVP

**Build window:** 36 hours

**Software owners:** 1 Frontend Developer, 1 Backend Developer

**Primary track:** Canada Life Future Me Challenge

**Delivery:** Standalone mobile-first web application with a virtual pet. NFC/QR links are optional shortcuts.

## 1. Product summary

Mochi is a financial companion application with a virtual pet that turns small, intentional financial choices into progress toward a meaningful long-term goal. Users set a goal, write a private Future Me letter, log purchase decisions, earn virtual coins and XP, and feed their virtual pet directly in the app. As they progress, Mochi unlocks financial quests and a richer Future Me projection. Goal milestones unlock parts of the user's original letter.

Core product promise: Today's small habits bring you closer to the future you wrote about.

Application delivery: Mochi is a mobile-first, full-stack application delivered through the browser. React provides interactive application screens and navigation; Express provides validated actions, persistent shared state, rewards, milestones, and virtual pet state. The app must support complete user journeys, including loading, empty, error, confirmation, and success states. Acceptance requires saved user progress to survive reloads and API restarts, with feeding available directly in the app.

Primary user: Gen Z student or young adult beginning to save, who finds long-term planning abstract or intimidating.

Demo path: Set a $200 goal + write three-part letter → skip a $60 hoodie (+60 virtual coins, $60 potential savings) → record $50 actually saved (self-reported: 25% progress) → reveal first Future Me message → open Feed Mochi → confirm feed (−20 coins) → the virtual pet becomes happy and fullness increases.

## 2. Success criteria

- New user completes onboarding in under 2 minutes.
- Skip-to-reward flow takes under 30 seconds.
- Feeding works directly from the app. An optional NFC/QR URL opens the same confirmation screen; the successful response updates the virtual pet.
- Saving milestone unlocks the correct letter section; no letter section is unlocked by a mere skipped purchase.
- An XP level-up visibly unlocks at least one new app feature.
- User and letter data survive an API restart.
- Personal letter text stays in the local single-user app and is never sent to hardware or external services.

## 3. In-scope MVP features

### P0 — Must ship

#### F1: Onboarding and goal

- Enter pet name, one goal name, target amount in CAD, and optional target date.
- Write three short Future Me letter sections: (1) What future are you building? (2) Why does it matter? (3) What do you want future you to remember?
- No login or bank linking; one seeded demo account.

#### F2: Dashboard

- Show pet mood/hunger, coins, XP/level, goal progress, self-reported confirmed savings, and potential savings as separate numbers.
- Show a simple Level 1 Future Me preview, e.g. weekly contribution × weeks, labeled illustrative.

#### F3: Mindful purchase decision

- Input item label and price; choose Buy or Skip.
- Skip earns min(ceil(price),100) virtual coins and +20 XP; adds price to potentialSavings only.
- Buy logs the decision without coin reward or shame-based pet penalty.
- Duplicate requests do not double-award coins.

#### F4: Actual-savings log

- Separate button: I moved money toward my goal.
- User enters the amount they actually saved; increments confirmedSaved (explicitly self-reported) and grants +30 XP once per request ID.
- Never imply a skipped purchase moved money to a savings account.

#### F5: Future Me letter reveal

- Show a sealed-letter card on dashboard.
- Reveal letter section 1 at 25% of goal, section 2 at 50%, section 3 at 100% of goal, based on confirmedSaved / goalTarget.
- Reveal uses saved writing verbatim, with no generative alterations.
- Let the author view/edit their original letter at any point via PUT /api/letter; only the celebratory milestone reveal is gated.

#### F6: Coins, XP, levels and unlocks

- XP and virtual coins are separate balances. Feeding spends coins, never XP.
- Level 1: onboarding, shopping decisions, goal tracker, in-app feeding, basic projection, letter.
- Level 2 (100 XP): unlock one daily financial quest and streak tracker.
- Level 3 (250 XP): unlock the expanded Future Me simulator (weekly/monthly contributions, years, optional growth assumption).
- XP is earned by habit actions, not net worth or income.
- Demo-only state seeding shows levels without pretending real achievements occurred.

#### F7: In-app feeding and optional NFC/QR shortcuts

- Dashboard navigation opens /tap?petId=mochi-01. An optional passive NFC tag or QR code may store that same URL.
- Opening the URL shows a confirmation screen; the tag does not automatically deduct coins.
- Confirming feed costs 20 coins, raises fullness by up to 30 (maximum 100), and sets the virtual pet mood to happy.
- If insufficient coins, show a friendly message and keep balances and pet state unchanged.
- Keep normal app navigation available so feeding never depends on a tag, scan, or device.

#### F8: Standalone application behavior

- The Express API is the source of truth for persisted user progress and pet state.
- The app handles loading, empty, error, confirmation, and success states.
- QNX, cameras, gestures, actuators, device polling, and device-specific endpoints are removed from current scope.

### P1 — Only after P0 works

- Optional in-app sound effects with user control.
- Better pet cosmetics and progress animations.
- Short financial lessons and personal nudges from prewritten content or an optional LLM.
- Additional daily quest variants.

### Out of scope

- Live banking, brokerage APIs, investment advice, tax optimization, social login, multiplayer, facial stress inference, real-world money movement, stock predictions, and LED blushing.

## 4. Future Me projection requirements

- Basic preview available from level 1; expanded interactive simulator at level 3.
- Show the contribution assumption, time horizon and annual growth assumption (default 0% or an explicitly illustrative user-editable rate).
- Distinguish contributions from hypothetical growth, include a non-guarantee disclaimer.
- Do not represent the projection as an investment recommendation.

## 5. User journeys

A. New user: open site → onboarding → save goal and three letter parts → dashboard shows letter sealed and first financial task.

B. Purchase: enter hoodie/$60 → skip → +60 coins, +20 XP, +$60 potential savings; confirmed saved unchanged.

C. Milestone: tap I moved money toward my goal → record $50 toward $200 goal → 25% → first letter note visibly revealed.

D. Feed: open Feed Mochi (or optional NFC/QR link) → /tap page → confirm spending 20 coins → app reflects a happy, fed virtual pet.

E. Level unlock: earn or demo-seed 100 XP → Level 2 quest appears; reaching 250 XP unlocks Future Me simulator.

## 6. Data and logic rules

- Currency fields are CAD, nonnegative, max two decimals; store integer cents server-side to avoid floating-point errors. The API contract defines the wire shapes and validation bounds.
- Pet feeding cost is 20 coins. Default hunger is 50; feeding increases hunger by 30 up to 100.
- potentialSavings is a self-reported counter of avoided purchases; confirmedSaved is a separate self-reported counter of money moved toward a goal.
- level is derived server-side from total XP (0–99: 1; 100–249: 2; 250+: 3).
- Quests are once per local calendar day in the demo time zone; do not reset streaks for backend downtime.
- API writes actions atomically with request-id deduplication (including feeds).
- Demo-only endpoints must be disabled when DEMO_MODE=false.
- Never record image frames, biometric inferences, or raw financial account data.

## 7. Constraints and design

- Stack: React + Vite + TypeScript + Tailwind (apps/web); Node.js + Express + TypeScript (apps/api); shared TypeScript types/Zod schemas (packages/contracts).
- Data: Single-user persisted local JSON or SQLite; no external database required.
- Transport: API port 3000; web port 5173. Vite proxies /api to the API server. For phone testing use the same local Wi-Fi/hotspot. Optional NFC/QR URLs target a reachable phone-facing app URL; verify actual scanning if tags/codes are used.
- Security: Development-only demo with no real personal or account data. Avoid publishing private letters via unauthenticated internet access.
- Accessibility: Mobile-first, high contrast, buttons with labels and confirmation, not color-only status.

## 8. Acceptance tests

1. Onboard with 3-part letter and $200 goal; reload page → goal/letter persists.
2. Skip $60 purchase → +60 coins, +20 XP, +$60 potential savings; goal confirmedSaved remains $0.
3. Resend same requestId → balances unchanged.
4. Log $50 actual savings → +30 XP, 25% goal, section 1 revealed, sections 2–3 sealed.
5. Open /tap?petId=mochi-01, confirm feed → coins −20 and virtual pet fullness increases; replaying the same requestId causes no extra spend.
6. Try feed with fewer than 20 coins → HTTP 409, no state mutation.
7. Reach 100 XP → Level 2 quest available; 250 XP → expanded simulator available.
8. Normal app navigation supports feeding without hardware; opening/refreshing the confirmation URL does not spend coins.
9. Removed device endpoints return 404; no camera, gesture, or hardware process is needed.
10. Restart API server → saved state remains available.

## 9. Ownership and timeline

Scaffolding owner (before parallel work, first 1–2 hours): create workspace, install dependencies, freeze API contract, commit sample fixtures and scripts, check app↔API and phone network access.

Frontend owner (branch feat/web): only apps/web/**. Owns onboarding, dashboard, decision UI, savings confirmation, letter reveal UI, level unlock UI, tap/feeding UI, mobile design, mock API adapter, FE tests. May propose contract changes but not edit shared contract directly.

Backend owner (branch feat/api): only apps/api/**, and initially maintains root pnpm-lock.yaml if dependencies change. Owns Express API, persistence, input validation, XP/coin/milestone logic, deduplication, virtual pet state, error codes, BE tests and API docs.

Milestones: Hours 0–2 scaffold+contracts; 2–10 parallel builds; 10–16 app/API integration; 16–22 letter+level polish; 22–28 app flow and optional NFC/QR polish; 28–36 test, rehearse, record fallback.

## 10. Explicit non-goals / financial guardrails

- The pet never looks harmed because the user spent money or couldn't save.
- Not saving money on a given day doesn't take away earned XP or saved amounts.
- All financial projections are educational illustrations, not forecasts or financial advice.
- Reward consistency and learning rather than dollar wealth.
