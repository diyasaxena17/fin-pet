import { z } from 'zod';
import {
  letterSchema, type AppState, type InitializedAppState, type ApiErrorCode,
  type OnboardingInput, type LetterInput, type DecisionInput, type SavingsInput,
  type FeedInput, type QuestInput, type DemoSeedInput, type Level, type Feature,
} from '@mochi/contracts';

const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const accountSchema = z.strictObject({
  petName: z.string().min(1).max(200), hunger: integer.max(100), mood: z.enum(['neutral', 'happy']),
  coins: integer, xp: integer, goalTitle: z.string().min(1).max(200),
  targetCents: integer.positive(), savedCents: integer, potentialCents: integer,
  goalDate: z.iso.date().nullable(), letter: letterSchema,
  lastQuestDate: z.iso.date().nullable(), streakDays: integer, demoSeeded: z.boolean(),
});
export const storedStateSchema = z.strictObject({
  version: z.literal(1), account: accountSchema.nullable(),
  processedRequestIds: z.array(z.uuid()),
  decisions: z.array(z.strictObject({
    requestId: z.uuid(), itemName: z.string(), amountCents: integer.positive(),
    decision: z.enum(['buy', 'skip']), createdAt: z.iso.datetime(),
  })),
});
export type StoredState = z.infer<typeof storedStateSchema>;
export type Action =
  | { type: 'onboard'; input: OnboardingInput }
  | { type: 'letter'; input: LetterInput }
  | { type: 'decision'; input: DecisionInput }
  | { type: 'savings'; input: SavingsInput }
  | { type: 'feed'; input: FeedInput }
  | { type: 'quest'; input: QuestInput }
  | { type: 'seed'; input: DemoSeedInput }
  | { type: 'reset' };

export class DomainError extends Error {
  constructor(public readonly status: number, public readonly code: ApiErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
export const DEFAULT_TIME_ZONE = 'America/Toronto';
export function emptyStoredState(): StoredState {
  return { version: 1, account: null, processedRequestIds: [], decisions: [] };
}
export function localDate(now: Date, timeZone = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
function previousDate(day: string): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}
function levelFor(xp: number): Level { return xp >= 250 ? 3 : xp >= 100 ? 2 : 1; }
function add(value: number, amount: number): number {
  const result = value + amount;
  if (!Number.isSafeInteger(result)) throw new DomainError(409, 'LIMIT_EXCEEDED', 'This amount exceeds the supported balance.');
  return result;
}
const cents = (amount: number) => Math.round(amount * 100);

export function getAppState(stored: StoredState, now = new Date(), timeZone = DEFAULT_TIME_ZONE): AppState {
  const account = stored.account;
  if (!account) return { initialized: false };
  const level = levelFor(account.xp);
  const today = localDate(now, timeZone);
  const completedToday = account.lastQuestDate === today;
  const unlockedFeatures: Feature[] = ['spending', 'goal', 'feed', 'basicProjection', 'letter'];
  if (level >= 2) unlockedFeatures.push('dailyQuest', 'streak');
  if (level === 3) unlockedFeatures.push('expandedProjection');
  return {
    initialized: true,
    pet: { id: 'mochi-01', name: account.petName, hunger: account.hunger, mood: account.mood },
    wallet: { coins: account.coins, xp: account.xp, level, nextLevelXp: level === 3 ? null : level === 2 ? 250 : 100 },
    goal: { title: account.goalTitle, targetAmount: account.targetCents / 100, confirmedSaved: account.savedCents / 100,
      potentialSavings: account.potentialCents / 100, progressPercent: Math.min(100, account.savedCents / account.targetCents * 100), goalDate: account.goalDate },
    letter: { ...account.letter, revealedSections: [0.25, 0.5, 1].filter((threshold) => account.savedCents / account.targetCents >= threshold).length },
    unlockedFeatures,
    quest: { id: 'daily-check-in', available: level >= 2 && !completedToday, completedToday,
      streakDays: completedToday || account.lastQuestDate === previousDate(today) ? account.streakDays : 0 },
    demoSeeded: account.demoSeeded,
  };
}

/** Pure transition shared by the server and isolated mock. Callers validate input. */
export function applyAction(stored: StoredState, action: Action, now = new Date(), timeZone = DEFAULT_TIME_ZONE): StoredState {
  if (action.type === 'reset') return emptyStoredState();
  const next = structuredClone(stored);
  if (action.type === 'onboard') {
    if (next.account) throw new DomainError(409, 'ALREADY_INITIALIZED', 'Mochi is already set up.');
    const input = action.input;
    next.account = {
      petName: input.petName, hunger: 50, mood: 'neutral', coins: 0, xp: 0,
      goalTitle: input.goalTitle, targetCents: cents(input.goalTarget), savedCents: 0, potentialCents: 0,
      goalDate: input.goalDate ?? null, letter: structuredClone(input.letter), lastQuestDate: null, streakDays: 0, demoSeeded: false,
    };
    return next;
  }
  const account = next.account;
  if (!account) throw new DomainError(404, 'NOT_INITIALIZED', 'Set up Mochi before using this action.');
  const input = action.input;
  const id = 'requestId' in input ? input.requestId : undefined;
  if (id && next.processedRequestIds.includes(id)) return next;
  switch (action.type) {
    case 'letter': account.letter = structuredClone(action.input.letter); break;
    case 'decision': {
      const decision = action.input;
      const amountCents = cents(decision.amount);
      next.decisions.push({ requestId: decision.requestId, itemName: decision.itemName, amountCents, decision: decision.decision, createdAt: now.toISOString() });
      if (decision.decision === 'skip') {
        account.coins = add(account.coins, Math.min(Math.ceil(amountCents / 100), 100));
        account.xp = add(account.xp, 20);
        account.potentialCents = add(account.potentialCents, amountCents);
      }
      break;
    }
    case 'savings':
      account.savedCents = add(account.savedCents, cents(action.input.amount));
      account.xp = add(account.xp, 30);
      break;
    case 'feed':
      if (account.coins < 20) throw new DomainError(409, 'INSUFFICIENT_COINS', 'You need 20 Mochi coins to feed your pet.');
      account.coins -= 20;
      account.hunger = Math.min(100, account.hunger + 30);
      account.mood = 'happy';
      break;
    case 'quest': {
      if (account.xp < 100) throw new DomainError(409, 'QUEST_UNAVAILABLE', 'Daily check-ins unlock at level 2.');
      const today = localDate(now, timeZone);
      if (account.lastQuestDate !== today) {
        account.streakDays = account.lastQuestDate === previousDate(today) ? account.streakDays + 1 : 1;
        account.lastQuestDate = today;
        account.coins = add(account.coins, 10);
        account.xp = add(account.xp, 20);
      }
      break;
    }
    case 'seed':
      if (action.input.xp !== undefined) account.xp = action.input.xp;
      if (action.input.coins !== undefined) account.coins = action.input.coins;
      if (action.input.confirmedSaved !== undefined) account.savedCents = cents(action.input.confirmedSaved);
      account.demoSeeded = true;
      break;
  }
  if (id) next.processedRequestIds.push(id);
  return next;
}

export function requireInitialized(state: AppState): InitializedAppState {
  if (!state.initialized) throw new DomainError(404, 'NOT_INITIALIZED', 'Set up Mochi before using this action.');
  return state;
}
