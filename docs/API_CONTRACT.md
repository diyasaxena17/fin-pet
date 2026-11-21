# Mochi — API contract v1, standalone app

This is the active contract, adapted from the supplied frozen v1 proposal for
Mochi's current standalone application scope. The [original proposal](reference/API_CONTRACT.original.txt)
is retained for reference. This version supersedes the earlier inferred scaffold
contract. Future shared changes follow the contract PR process.

The [shared addendum](API_ADDENDUM.md) defines the additive next contract.

## Scope decisions

- Mochi runs as a normal mobile-first application with a virtual pet. Feeding
  works directly in the app; NFC/QR can optionally open the same confirmation.
- No physical device is required. `AppState.device` is absent. The native API
  preserves optional device state/gesture routes behind `ENABLE_DEVICE_API=true`;
  they return 404 by default. See the addendum for their privacy boundary.
- `demoSeeded: boolean` is added to initialized state so the UI can display a
  persistent DEMO label after seeding. Reset clears it.
- Reward-bearing decisions, savings, feeds, and quest requests require a UUID
  `requestId`. Onboarding, letter replacement, demo seed, and reset follow the
  source schemas without a request ID.

## Transport and responses

Base URL: `/api`, proxied by Vite to the C++20 API at `http://localhost:3000`.
All mutation requests use `Content-Type: application/json`. This is a single-user,
local demo without authentication. Use sample personal/letter data.

All successful routes return status **200**. Mutations return `AppState` directly,
without a `{ state: ... }` wrapper. `GET /api/state` before onboarding returns only
`{ "initialized": false }`. Other account actions return 404 until initialized.
Onboarding a second time returns 409; letter replacement is the supported edit.
`GET /health` is outside `/api` and returns `{ "ok": true }`.
All responses use `Cache-Control: no-store`.

Currency is CAD numbers at the boundary, with at most two decimal places.
The domain and JSON storage use integer cents. Mutation amounts and goal targets
range from $0.01 to $1,000,000,000; demo confirmed savings may also be zero.
Text names are trimmed, nonempty, and at most 200 characters. Each letter part
may be empty while drafting and has a 4,000-character limit. Original letter
whitespace and text are preserved. Dates must be real `YYYY-MM-DD` dates.
Unknown request properties and malformed input are rejected with 400.

## Routes and request types

| Function | Method and endpoint | Input | Result |
| --- | --- | --- | --- |
| — | `GET /health` | none | `HealthResponse` |
| `getState` | `GET /api/state` | none | `AppState` |
| `onboard` | `POST /api/onboarding` | `OnboardingInput` | `InitializedAppState` |
| `updateLetter` | `PUT /api/letter` | `LetterInput` | `InitializedAppState` |
| `submitDecision` | `POST /api/decisions` | `DecisionInput` | `InitializedAppState` |
| `recordSavings` | `POST /api/savings` | `SavingsInput` | `InitializedAppState` |
| `feedPet` | `POST /api/feed` | `FeedInput` | `InitializedAppState` |
| `completeQuest` | `POST /api/quests/complete` | `QuestInput` | `InitializedAppState` |
| `demoSeed` | `POST /api/demo/seed` | `DemoSeedInput` | `InitializedAppState` |
| `demoReset` | `POST /api/demo/reset` | `{}` | `{ initialized: false }` |

```ts
type OnboardingInput = {
  petName: string;
  goalTitle: string;
  goalTarget: number; // CAD
  goalDate?: string;
  letter: { vision: string; why: string; reminder: string };
};
type LetterInput = { letter: { vision: string; why: string; reminder: string } };
type DecisionInput = {
  requestId: string; itemName: string; amount: number; decision: 'skip' | 'buy';
};
type SavingsInput = { requestId: string; amount: number };
type FeedInput = { requestId: string; petId: 'mochi-01' };
type QuestInput = { requestId: string; questId: 'daily-check-in' };
type DemoSeedInput = { xp?: 0 | 100 | 250; confirmedSaved?: number; coins?: number };
```

Demo seed/reset are registered only when `DEMO_MODE=true`; otherwise they return
404. Seeding requires onboarding, preserves unspecified values, sets DEMO state,
and grants no earned activity. Demo coins must be an integer from 0 to 1,000,000.
Reset clears the account, decisions, and request-ID history. Production builds
show the DEMO label when seeded; developer-only seed/reset controls are available
in the Vite dev app.

## Initialized state example

```json
{
  "initialized": true,
  "pet": { "id": "mochi-01", "name": "Mochi", "hunger": 50, "mood": "neutral" },
  "wallet": { "coins": 0, "xp": 0, "level": 1, "nextLevelXp": 100 },
  "goal": { "title": "Emergency fund", "targetAmount": 200, "confirmedSaved": 0, "potentialSavings": 0, "progressPercent": 0, "goalDate": null },
  "letter": { "vision": "I want my future self to feel secure.", "why": "I want more room to choose.", "reminder": "Small steps count.", "revealedSections": 0 },
  "unlockedFeatures": ["spending", "goal", "feed", "basicProjection", "letter"],
  "quest": { "id": "daily-check-in", "available": false, "completedToday": false, "streakDays": 0 },
  "demoSeeded": false
}
```

The canonical root exports and Zod request schemas are in `@mochi/contracts`.
The sample fixture is recursively frozen; `createAppState()` returns an isolated
initialized sample. Actual fresh API/mock sessions start uninitialized.

`wallet.level` is 1, 2, or 3; `nextLevelXp` is 100, 250, or null respectively.
`goal.progressPercent` is capped at 100; confirmed savings may exceed the target.
Pet `hunger` follows the source contract's naming but measures fullness: it
starts at 50 and rises when fed. Mood is `neutral` or `happy`. There is no
negative pet penalty, automatic hunger decay, or hardware reaction counter.

## Game rules

- Skip: add `min(ceil(amount), 100)` coins, 20 XP, and the CAD amount to potential
  savings. Buy: persist the decision with no reward or savings change.
- Savings: add the CAD amount to confirmed savings and grant 30 XP once per ID.
  All confirmed amounts are self-reported; Mochi does not move money.
- Letter reveals: 0 below 25%, 1 at 25%, 2 at 50%, and 3 at 100%, using only
  confirmed savings divided by target. Authors can view/edit all original text.
- Feed: require 20 coins, deduct 20, raise hunger/fullness by 30 up to 100, and
  set mood to happy. XP is unchanged. Page opens, GETs, and cancels do not feed.
- Levels: XP 0–99 is level 1, 100–249 is level 2, 250+ is level 3.
- Base unlocks: `spending`, `goal`, `feed`, `basicProjection`, `letter`. Level 2
  adds `dailyQuest` and `streak`. Level 3 adds `expandedProjection`.
- Quest: a successful daily check-in grants 10 coins and 20 XP. Repeated
  completion that local day returns unchanged state, even with a different ID.
  Quests require level 2. Day boundaries use `DEMO_TIME_ZONE`, default
  `America/Toronto`, independent of the host time zone. Streaks persist across
  restarts and continue on consecutive calendar days; a missed day breaks the
  consecutive streak, without subtracting coins or XP.
- Projections are pure frontend math and never mutate app state. Basic preview
  is available at level 1. The level-3 simulator supports weekly/monthly
  contributions, years, and an explicitly illustrative annual rate (default 0%).

## Idempotency, atomicity, and persistence

UUIDs are global to one account. Retrying a successful action ID returns the
**current** state without repeating the action. Failed validation, unavailable
quests, insufficient coins, and failed writes do not consume an ID. The client
retains an ID for retries of the same pending operation within the current app
session. It never automatically retries mutations. Reloading starts a new client
session; callers retrying outside it must retain their original ID.

`@mochi/domain` contains the pure reference rules used by the isolated mock;
the C++ API is checked against them by differential tests. The live API stores
integer-cent account JSON, decisions and global UUIDs in SQLite (`DB_PATH`). Each
mutation uses a mutex and `BEGIN IMMEDIATE`; state, IDs, decisions and reaction
metadata commit together. Exceptions roll back. WAL and FULL synchronization
support restart persistence. Corrupt or incompatible files fail startup rather
than being silently replaced. See [backend storage details](../apps/api/README.md).
The historical `DATA_FILE` setting is not used by the C++ runtime.

The mock uses session memory only; it resets on reload. Runtime state and secrets
stay out of Git. Shared fixtures are examples, never persisted user-data migrations.

## Errors

```json
{ "error": { "code": "INSUFFICIENT_COINS", "message": "You need 20 Mochi coins to feed your pet." } }
```

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Invalid schema, unknown properties, malformed or oversized JSON |
| 404 | `NOT_INITIALIZED` | Account action before onboarding |
| 404 | `NOT_FOUND` | Unknown/removed route or unavailable demo endpoint |
| 409 | `ALREADY_INITIALIZED` | Duplicate onboarding |
| 409 | `INSUFFICIENT_COINS` | Cannot afford feed; no mutation |
| 409 | `QUEST_UNAVAILABLE` | Quest requires level 2 |
| 409 | `LIMIT_EXCEEDED` | Balance would exceed safe integer storage |
| 500 | `INTERNAL_ERROR` | Save/internal error; retry with the same request ID |

The HTTP adapter exposes failures as `ApiError` with status and code. The mock
uses Zod errors for invalid input and `DomainError` for game-rule failures.
