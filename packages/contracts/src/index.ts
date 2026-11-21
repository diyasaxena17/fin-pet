import { z } from 'zod';
import fixture from '../fixtures/app-state.json';

import { moneySchema } from './money';
export { moneySchema } from './money';
const text = z.string().trim().min(1).max(200);
export const letterSchema = z.strictObject({
  vision: z.string().max(4000), why: z.string().max(4000), reminder: z.string().max(4000),
});
export const onboardingSchema = z.strictObject({
  petName: text, goalTitle: text, goalTarget: moneySchema,
  goalDate: z.iso.date().optional(), letter: letterSchema,
});
export const letterInputSchema = z.strictObject({ letter: letterSchema });
const requestId = z.uuid();
export const decisionSchema = z.strictObject({ requestId, itemName: text, amount: moneySchema, decision: z.enum(['skip', 'buy']) });
export const savingsSchema = z.strictObject({ requestId, amount: moneySchema });
export const feedSchema = z.strictObject({ requestId, petId: z.literal('mochi-01') });
export const questSchema = z.strictObject({ requestId, questId: z.literal('daily-check-in') });
export const demoSeedSchema = z.strictObject({
  xp: z.union([z.literal(0), z.literal(100), z.literal(250)]).optional(),
  confirmedSaved: moneySchema.or(z.literal(0)).optional(),
  coins: z.number().int().nonnegative().max(1_000_000).optional(),
});
export const demoResetSchema = z.strictObject({});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type LetterInput = z.infer<typeof letterInputSchema>;
export type DecisionInput = z.infer<typeof decisionSchema>;
export type SavingsInput = z.infer<typeof savingsSchema>;
export type FeedInput = z.infer<typeof feedSchema>;
export type QuestInput = z.infer<typeof questSchema>;
export type DemoSeedInput = z.infer<typeof demoSeedSchema>;
export type FutureLetter = z.infer<typeof letterSchema>;
export type Level = 1 | 2 | 3;
export type PetMood = 'neutral' | 'happy';
export type Feature = 'spending' | 'goal' | 'feed' | 'basicProjection' | 'letter' | 'dailyQuest' | 'streak' | 'expandedProjection';

export interface InitializedAppState {
  initialized: true;
  pet: { id: 'mochi-01'; name: string; hunger: number; mood: PetMood };
  wallet: { coins: number; xp: number; level: Level; nextLevelXp: 100 | 250 | null };
  goal: { title: string; targetAmount: number; confirmedSaved: number; potentialSavings: number; progressPercent: number; goalDate: string | null };
  letter: FutureLetter & { revealedSections: number };
  unlockedFeatures: Feature[];
  quest: { id: 'daily-check-in'; available: boolean; completedToday: boolean; streakDays: number };
  demoSeeded: boolean;
}
export type AppState = { initialized: false } | InitializedAppState;
export interface HealthResponse { ok: true }
export type ApiErrorCode = 'INVALID_REQUEST' | 'NOT_FOUND' | 'NOT_INITIALIZED' | 'ALREADY_INITIALIZED' | 'INSUFFICIENT_COINS' | 'QUEST_UNAVAILABLE' | 'LIMIT_EXCEEDED' | 'INTERNAL_ERROR' | 'REQUEST_ID_CONFLICT' | 'REFLECTION_EXISTS' | 'REFLECTION_NOT_DUE';
export interface ApiErrorResponse { error: { code: ApiErrorCode; message: string } }

export interface MochiApi {
  getState(): Promise<AppState>;
  onboard(input: OnboardingInput): Promise<InitializedAppState>;
  updateLetter(input: LetterInput): Promise<InitializedAppState>;
  submitDecision(input: DecisionInput): Promise<InitializedAppState>;
  recordSavings(input: SavingsInput): Promise<InitializedAppState>;
  feedPet(input: FeedInput): Promise<InitializedAppState>;
  completeQuest(input: QuestInput): Promise<InitializedAppState>;
  demoSeed(input: DemoSeedInput): Promise<InitializedAppState>;
  demoReset(): Promise<AppState>;
}

export type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
function deepFreeze<T extends object>(value: T): DeepReadonly<T> {
  for (const child of Object.values(value)) if (child && typeof child === 'object') deepFreeze(child);
  return Object.freeze(value) as DeepReadonly<T>;
}
const checkedFixture = {
  ...fixture, initialized: true,
  pet: { ...fixture.pet, id: 'mochi-01', mood: 'neutral' },
  wallet: { ...fixture.wallet, level: 1, nextLevelXp: 100 },
  quest: { ...fixture.quest, id: 'daily-check-in' },
  unlockedFeatures: ['spending', 'goal', 'feed', 'basicProjection', 'letter'],
} satisfies InitializedAppState;
export const appStateFixture: DeepReadonly<InitializedAppState> = deepFreeze(checkedFixture);
/** Sample initialized account; GET before onboarding instead returns initialized:false. */
export function createAppState(): InitializedAppState {
  return structuredClone(appStateFixture) as InitializedAppState;
}

export * from './addendum';
