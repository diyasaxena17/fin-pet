# Squirrel & Tree frontend

Mobile-first React application for mindful spending and confirmed savings. All network operations are routed through `src/lib/api.ts`; `VITE_USE_MOCK=true` selects `src/lib/mockApi.ts`, which applies the same frozen contract validation and domain rules as the service.

## Screens and routes

| Route | Screen and purpose |
| --- | --- |
| `/onboarding` | Companion name and voice, a savings goal and date, three Future Me prompts, and optional monthly/daily budget setup. |
| `/` | Forest dashboard: session welcome check-in for a daily budget, current savings goal, and investing learning focus; API pet state, acorns, XP/level, confirmed and potential savings, tree, budget/insight previews, purchase decision, level map, and DEMO progression controls. |
| `/budget` | Monthly/daily plan, category summary, transaction list and manual transaction entry. Every row shows its source. Transactions do not count as savings. |
| `/insights` | Evidence-backed pattern cards and optional due reflections. Reflection verdicts do not earn rewards. |
| `/learn` | Contract lesson cards with one answer each, feedback/reward, and the Level 2 daily quest. Lessons remain available at every level. |
| `/future` | Goal progress, explicit “I actually moved this money” savings form, 25/50/100% letter reveals, always-accessible original letter editor, and labeled illustrative projections. |
| `/report` | Read-only daily report with a separate explicit check-in action. Repeated opens do not claim rewards. |
| `/check-in` | Compatibility alias that redirects to `/report`. |
| `/tap?petId=...` | NFC learning forest with clickable Investing Basics, Budgeting, TFSA, Tuition, and Safety Net branches. A mismatched pet ID shows a friendly not-found state. |
| `/topics` | Direct route to the same topic forest landing page. |
| `/feed` | Manual feed fallback using the existing contract feed endpoint. |

## Fixture and mock behavior

- `packages/contracts/fixtures/addendum-app-state.json`: shared initialized account baseline used by the contract/domain package.
- `packages/contracts/fixtures/addendum.json`: shared sample budget, demo transaction, insight, and daily report. The Budget and Insights pages show the sample transaction/insight only as clearly labeled fixture examples; they are not inserted into account totals or treated as a user record.
- `packages/contracts/fixtures/rules.json`: tree-stage thresholds and lesson catalogue used by shared contract/domain logic.
- `apps/web/src/lib/mockApi.ts`: in-memory API implementation backed by `@mochi/domain`. State is session-only and resets on reload; persistence must be verified against the live service.
- The dashboard welcome prompt stores daily budget through the existing budget API and reads the savings goal from the existing onboarding state. An investing selection is a visit-only learning focus because the frozen API has no investing-goal field.

## Current contract scope

The shared API currently supports Levels 1–3: Level 2 daily quests/streaks at 100 XP and Level 3 expanded projection at 250 XP. Levels 4–6 appear only as future roadmap ideas. The addendum exposes report `achievement` and `insight`; there is no separate suggestion field. Daily check-in has no hardware reaction field, so the page celebrates in UI only and does not claim a physical reaction.

`VITE_USE_MOCK=false` (or unset) uses the HTTP adapter and requires a running API implementing every endpoint in `docs/API_ADDENDUM.md`. A missing endpoint is shown as a retryable API error; this frontend does not invent backend values or routes.
