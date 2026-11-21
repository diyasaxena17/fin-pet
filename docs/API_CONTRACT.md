# Mochi API contract v1

This contract was inferred from the provided scaffolding plan; no pre-existing
contract was available. It is the shared baseline for branch handoff. Proposed
defaults are listed below so both owners can review them before implementation.
After handoff, changes require a contract PR to `main` and both owners rebasing.

Canonical TypeScript exports: `@mochi/contracts` (`packages/contracts/src/index.ts`).
Canonical read-only fixture: `packages/contracts/fixtures/app-state.json`.

## Wire conventions

- JSON requests/responses; mutation requests use `Content-Type: application/json`.
- All monetary amounts are safe integer **cents**, always positive for mutations.
- `GET /api/state` returns `AppState` directly. Every successful mutation returns
  `{ "state": AppState }`, status 200. GET and device polling never mutate state.
- Errors return `{ "error": { "code": "...", "message": "..." } }`.
- Device response uses `schemaVersion: 1`; field meanings stay stable for QNX.
- Initial scaffold: reads work; mutation routes return 501. Shapes below specify
  the backend implementation target, not an already implemented mutation API.

## AppState

```ts
interface AppState {
  schemaVersion: 1;
  onboarded: boolean;
  profile: { name: string; petName: string };
  goal: { name: string; targetCents: number; savedCents: number };
  letter: { sections: [string, string, string]; revealedSections: number };
  wallet: { coins: number; xp: number; level: 1 | 2 | 3 };
  savings: { potentialCents: number; confirmedCents: number };
  pet: { mood: 'neutral' | 'happy'; reactionSeq: number };
  quests: { id: string; title: string; completed: boolean }[];
  features: { quests: boolean; projection: boolean };
}
```

`revealedSections` is 0–3. Coins, XP, savings, and `reactionSeq` are non-negative
integers. The initial fixture is not onboarded, has a $200 target, three blank
letter sections, zero balances, and one incomplete `first-save` quest.
`goal.savedCents` and `savings.confirmedCents` track the same recorded savings.

## Routes and adapter functions

| Function | Method and route | Request type | Response type |
| --- | --- | --- | --- |
| — | `GET /health` | none | `HealthResponse`: `{ status: 'ok' }` |
| `getState` | `GET /api/state` | none | `GetStateResponse`: `AppState` |
| `onboard` | `POST /api/onboard` | `OnboardRequest` | `OnboardResponse` |
| `updateLetter` | `PUT /api/letter` | `UpdateLetterRequest` | `UpdateLetterResponse` |
| `submitDecision` | `POST /api/decisions` | `SubmitDecisionRequest` | `SubmitDecisionResponse` |
| `recordSavings` | `POST /api/savings` | `RecordSavingsRequest` | `RecordSavingsResponse` |
| `feedPet` | `POST /api/pet/feed` | `FeedPetRequest` | `FeedPetResponse` |
| `completeQuest` | `POST /api/quests/complete` | `CompleteQuestRequest` | `CompleteQuestResponse` |
| `demoSeed` | `POST /api/demo/seed` | `DemoSeedRequest` | `DemoSeedResponse` |
| — | `GET /api/device/state` | none | `DeviceStateResponse` |

All eight functions are exposed by `MochiApi`. Every named mutation response is
an alias for `MutationResponse = { state: AppState }`.

```ts
interface OnboardRequest {
  name: string;
  petName: string;
  goal: { name: string; targetCents: number };
  letter: { sections: [string, string, string] };
}
interface UpdateLetterRequest { sections: [string, string, string] }
interface SubmitDecisionRequest {
  choice: 'skip' | 'buy'; amountCents: number; item: string;
}
interface RecordSavingsRequest { amountCents: number }
interface FeedPetRequest { source: 'app' | 'nfc' | 'qr' }
interface CompleteQuestRequest { questId: string }
interface DemoSeedRequest { level: 1 | 2 | 3 }
```

Profile/goal names must be nonempty after trimming; letter sections must contain
exactly three strings (empty text is allowed while drafting). Onboarding starts
a fresh demo state. The live backend must validate requests before mutation.

## Demo behavior

- Skip: add `floor(amountCents / 100)` coins, 20 XP, and `amountCents` potential
  savings. Buy: no reward or savings change. Neither confirms any savings.
- Record savings: add the amount to confirmed savings and goal progress. Keep
  potential savings separate. Do not grant extra coins or XP.
- Letter sections reveal at 25%, 50%, and 100% of confirmed goal progress.
- Feed: require at least 20 coins, subtract 20, set mood `happy`, increment
  `reactionSeq` exactly once. Opening `/tap` is not a feed action.
- Levels: 1 below 100 XP, 2 from 100 XP, 3 from 300 XP. Quests unlock at level 2;
  projection unlocks at level 3. Features derive from XP/level.
- `first-save` quest: available at level 2 with positive confirmed savings;
  completion grants 10 coins/20 XP once. Repeated completion returns unchanged
  state without duplicate rewards.
- Demo seed: set XP to 0/100/300 for level 1/2/3, preserve other progress and
  `reactionSeq`; reject with 403 when `DEMO_MODE=false`.

The $60 skip, $50 actual savings, and 20-coin feed are required by the supplied
plan. Cents representation, other reveal thresholds, XP thresholds, quest
reward, routes, and envelope names are scaffold assumptions to review.

## Stable device response

```json
{
  "schemaVersion": 1,
  "petName": "Mochi",
  "level": 1,
  "mood": "neutral",
  "reactionSeq": 0
}
```

`mood` is `neutral | happy`; `level` is `1 | 2 | 3`. QNX records the first
observed sequence as a baseline without reacting, and wags once when it observes
a strictly larger sequence. The next identical response causes no wag. GETs
never consume events or change the sequence. Persist the sequence across API
restarts. Multiple feed actions between polls may be coalesced into one wag.

## Errors

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Malformed JSON or invalid mutation data |
| 404 | `NOT_FOUND` | Unknown route |
| 409 | `INSUFFICIENT_COINS` | Cannot afford a feed |
| 409 | `QUEST_UNAVAILABLE` | Locked or unknown quest |
| 403 | `DEMO_DISABLED` | Demo seed requested outside demo mode |
| 501 | `NOT_IMPLEMENTED` | Reserved mutation in initial scaffold |
| 500 | `INTERNAL_ERROR` | Unexposed internal failure |

The mock uses rejected Errors for domain validation and is deliberately
session-only. Live HTTP errors are exposed as `ApiError` with status and code.
Neither adapter retries mutations automatically.
