import { z } from 'zod';
import rules from '../fixtures/rules.json';
import type { AppState, InitializedAppState, MochiApi, OnboardingInput, LetterInput, DecisionInput, SavingsInput, FeedInput, QuestInput, DemoSeedInput } from './index';
import { moneySchema } from './money';

export const voiceSchema = z.enum(['cute', 'calm']);
export const preferencesSchema = z.strictObject({ voice: voiceSchema });
export type Preferences = z.infer<typeof preferencesSchema>;
export type PreferencesInput = Preferences;
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const monthQuerySchema = z.strictObject({ month: monthSchema });
export const categorySchema = z.enum(['food', 'shopping', 'transport', 'entertainment', 'bills', 'other']);
export type TransactionCategory = z.infer<typeof categorySchema>;
export const categoryLabels: Record<TransactionCategory, string> = {
  food: 'Food & Drink', shopping: 'Shopping', transport: 'Transport',
  entertainment: 'Entertainment', bills: 'Bills', other: 'Other',
};
export const budgetSchema = z.strictObject({
  month: monthSchema, monthlyLimit: moneySchema,
  dailyLimit: moneySchema.optional(), categoryLimits: z.partialRecord(categorySchema, moneySchema).optional(),
});
export type BudgetInput = z.infer<typeof budgetSchema>;
export const transactionSchema = z.strictObject({
  requestId: z.uuid(), name: z.string().trim().min(1).max(200), amount: moneySchema,
  category: categorySchema, occurredAt: z.iso.datetime({ offset: true }), planned: z.boolean().optional(),
});
export type TransactionInput = z.infer<typeof transactionSchema>;
export const reflectionVerdictSchema = z.enum(['worth_it', 'unsure', 'not_worth_it']);
export const reflectionSchema = z.strictObject({
  requestId: z.uuid(), transactionId: z.string().min(1).max(200), verdict: reflectionVerdictSchema,
});
export type ReflectionInput = z.infer<typeof reflectionSchema>;
export const lessonAnswerSchema = z.strictObject({
  requestId: z.uuid(), lessonId: z.string().min(1).max(200), selectedOptionId: z.string().min(1).max(200),
});
export type LessonAnswerInput = z.infer<typeof lessonAnswerSchema>;
export const checkInSchema = z.strictObject({ requestId: z.uuid() });
export type CheckInInput = z.infer<typeof checkInSchema>;
export interface Reward { coins: number; xp: number }
export const CHECK_IN_REWARD: Readonly<Reward> = Object.freeze({ coins: 10, xp: 20 });
export const LESSON_REWARD: Readonly<Reward> = Object.freeze({ coins: 5, xp: 10 });
export const ZERO_REWARD: Readonly<Reward> = Object.freeze({ coins: 0, xp: 0 });

/** Only source of tree thresholds; forest is a projection, never stored separately. */
export type TreeStage = 'seedling' | 'sapling' | 'young' | 'mature' | 'thriving';
export const treeStages: readonly Readonly<{ stage: TreeStage; minimumPercent: number }>[] =
  Object.freeze(rules.treeStages.map((entry) => Object.freeze({ ...entry, stage: entry.stage as TreeStage })));
export const lessonCatalogue = Object.freeze(rules.lessons.map((lesson) => Object.freeze({
  ...lesson, options: Object.freeze(lesson.options.map((option) => Object.freeze({ ...option }))),
})));
export function treeStageFor(progressPercent: number): TreeStage {
  if (!Number.isFinite(progressPercent) || progressPercent < 0) throw new RangeError('Invalid goal progress');
  return [...treeStages].reverse().find(({ minimumPercent }) => progressPercent >= minimumPercent)!.stage;
}
export interface BudgetSummary {
  month: string; monthlyLimit: number | null; dailyLimit: number | null;
  spentThisMonth: number; spentToday: number; remainingThisMonth: number | null;
  categories: { id: TransactionCategory; label: string; spent: number; limit: number | null }[];
}
export interface Transaction {
  id: string; name: string; amount: number; category: TransactionCategory; occurredAt: string;
  planned: boolean; source: 'manual' | 'demo';
  reflection: { verdict: z.infer<typeof reflectionVerdictSchema>; reflectedAt: string } | null;
}
export interface Insight {
  id: string; kind: 'frequency'; title: string; description: string;
  evidence: { count: number; windowDays: number; totalAmount: number };
  source: 'manual' | 'demo'; suggestion: string;
}
export interface LessonSummary {
  id: string; title: string; body: string; question: string;
  options: { id: string; label: string }[]; completed: boolean; availableReward: Reward;
}
export interface DailyReport {
  date: string; spentToday: number; dailyLimit: number | null; underDailyLimit: boolean | null;
  achievement: string | null; insight: string; completedToday: boolean; streakDays: number; availableReward: Reward;
}
export interface AddendumInitializedAppState extends InitializedAppState {
  forest: { treeStage: TreeStage; growthPercent: number };
  preferences: Preferences; budgetSummary: BudgetSummary; today: { checkInCompleted: boolean };
}
export type AddendumAppState = Extract<AppState, { initialized: false }> | AddendumInitializedAppState;
export interface TransactionResponse { transaction: Transaction; budget: BudgetSummary }
export interface ReflectionResponse { transaction: Transaction; state: AddendumInitializedAppState }
export interface LessonAnswerResponse { correct: boolean; feedback: string; reward: Reward; state: AddendumInitializedAppState }
export interface CheckInResponse { completedToday: boolean; reward: Reward; state: AddendumInitializedAppState }

/** Separate extension lets V1 consumers keep working during the owners' rebase. */
export interface AddendumMochiApi extends MochiApi {
  getState(): Promise<AddendumAppState>;
  onboard(input: OnboardingInput): Promise<AddendumInitializedAppState>;
  updateLetter(input: LetterInput): Promise<AddendumInitializedAppState>;
  submitDecision(input: DecisionInput): Promise<AddendumInitializedAppState>;
  recordSavings(input: SavingsInput): Promise<AddendumInitializedAppState>;
  feedPet(input: FeedInput): Promise<AddendumInitializedAppState>;
  completeQuest(input: QuestInput): Promise<AddendumInitializedAppState>;
  demoSeed(input: DemoSeedInput): Promise<AddendumInitializedAppState>;
  demoReset(): Promise<AddendumAppState>;
  updatePreferences(input: PreferencesInput): Promise<AddendumInitializedAppState>;
  getBudgets(month: string): Promise<BudgetSummary>;
  updateBudgets(input: BudgetInput): Promise<BudgetSummary>;
  getTransactions(month: string): Promise<{ transactions: Transaction[] }>;
  recordTransaction(input: TransactionInput): Promise<TransactionResponse>;
  getInsights(): Promise<{ insights: Insight[] }>;
  getDueReflections(): Promise<{ transactions: Transaction[] }>;
  reflect(input: ReflectionInput): Promise<ReflectionResponse>;
  getLessons(): Promise<{ lessons: LessonSummary[] }>;
  answerLesson(input: LessonAnswerInput): Promise<LessonAnswerResponse>;
  getDailyReport(): Promise<DailyReport>;
  checkIn(input: CheckInInput): Promise<CheckInResponse>;
}

export type DeviceReaction = 'feed' | 'level_up' | 'greeting';
/** Reserved only: do not emit until the hardware owner agrees. */
export type ProposedDeviceReaction = 'daily_checkin' | 'goal_milestone';
export interface DeviceState {
  petId: 'mochi-01'; mood: InitializedAppState['pet']['mood']; hunger: number;
  reactionSeq: number; reactionType: DeviceReaction | null; voice?: Preferences['voice'];
}
