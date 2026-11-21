import fixture from '../fixtures/app-state.json';

export type Level = 1 | 2 | 3;
export type PetMood = 'neutral' | 'happy';
export type LetterSections = [string, string, string];

export interface AppState {
  schemaVersion: 1;
  onboarded: boolean;
  profile: { name: string; petName: string };
  goal: { name: string; targetCents: number; savedCents: number };
  letter: { sections: LetterSections; revealedSections: number };
  wallet: { coins: number; xp: number; level: Level };
  savings: { potentialCents: number; confirmedCents: number };
  pet: { mood: PetMood; reactionSeq: number };
  quests: { id: string; title: string; completed: boolean }[];
  features: { quests: boolean; projection: boolean };
}

export interface OnboardRequest {
  name: string;
  petName: string;
  goal: { name: string; targetCents: number };
  letter: { sections: LetterSections };
}
export interface UpdateLetterRequest { sections: LetterSections }
export interface SubmitDecisionRequest { choice: 'skip' | 'buy'; amountCents: number; item: string }
export interface RecordSavingsRequest { amountCents: number }
export interface FeedPetRequest { source: 'app' | 'nfc' | 'qr' }
export interface CompleteQuestRequest { questId: string }
export interface DemoSeedRequest { level: Level }
export interface HealthResponse { status: 'ok' }
export type GetStateResponse = AppState;
export interface MutationResponse { state: AppState }
export type OnboardResponse = MutationResponse;
export type UpdateLetterResponse = MutationResponse;
export type SubmitDecisionResponse = MutationResponse;
export type RecordSavingsResponse = MutationResponse;
export type FeedPetResponse = MutationResponse;
export type CompleteQuestResponse = MutationResponse;
export type DemoSeedResponse = MutationResponse;
export interface DeviceStateResponse {
  schemaVersion: 1;
  petName: string;
  level: Level;
  mood: PetMood;
  reactionSeq: number;
}
export type ApiErrorCode = 'INVALID_REQUEST' | 'NOT_FOUND' | 'NOT_IMPLEMENTED' | 'DEMO_DISABLED' | 'INSUFFICIENT_COINS' | 'QUEST_UNAVAILABLE' | 'INTERNAL_ERROR';
export interface ApiErrorResponse { error: { code: ApiErrorCode; message: string } }

/** All page interactions go through this interface, including mock mode. */
export interface MochiApi {
  getState(): Promise<GetStateResponse>;
  onboard(request: OnboardRequest): Promise<OnboardResponse>;
  updateLetter(request: UpdateLetterRequest): Promise<UpdateLetterResponse>;
  submitDecision(request: SubmitDecisionRequest): Promise<SubmitDecisionResponse>;
  recordSavings(request: RecordSavingsRequest): Promise<RecordSavingsResponse>;
  feedPet(request: FeedPetRequest): Promise<FeedPetResponse>;
  completeQuest(request: CompleteQuestRequest): Promise<CompleteQuestResponse>;
  demoSeed(request: DemoSeedRequest): Promise<DemoSeedResponse>;
}

export type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;

function deepFreeze<T extends object>(value: T): DeepReadonly<T> {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') deepFreeze(child);
  }
  return Object.freeze(value) as DeepReadonly<T>;
}

// `satisfies` checks the JSON fields without an unchecked AppState assertion.
const checkedFixture = {
  ...fixture,
  schemaVersion: 1,
  wallet: { ...fixture.wallet, level: 1 },
  pet: { ...fixture.pet, mood: 'neutral' },
  letter: { ...fixture.letter, sections: [...fixture.letter.sections] as LetterSections },
} satisfies AppState;

export const appStateFixture: DeepReadonly<AppState> = deepFreeze(checkedFixture);
/** Each consumer gets an isolated mutable copy; never mutate the shared fixture. */
export function createAppState(): AppState {
  return structuredClone(appStateFixture) as AppState;
}
