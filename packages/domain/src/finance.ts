import { z } from 'zod';
import {
  categorySchema, categoryLabels, lessonCatalogue, treeStageFor, voiceSchema, reflectionVerdictSchema, monthSchema,
  CHECK_IN_REWARD, LESSON_REWARD, ZERO_REWARD,
  type BudgetInput, type BudgetSummary, type Transaction, type PreferencesInput, type TransactionInput,
  type ReflectionInput, type LessonAnswerInput, type CheckInInput, type AddendumAppState,
  type Insight, type LessonSummary, type DailyReport, type AddendumInitializedAppState,
} from '@mochi/contracts';
import { applyAction, getAppState, localDate, DomainError, DEFAULT_TIME_ZONE, type Action, type StoredState } from './index';

const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const financeSchema = z.strictObject({
  preferences: z.strictObject({ voice: voiceSchema }),
  budgets: z.record(monthSchema, z.strictObject({ monthlyCents: integer.positive(), dailyCents: integer.positive().nullable(), categoryCents: z.partialRecord(categorySchema, integer.positive()) })),
  transactions: z.array(z.strictObject({
    id: z.string(), name: z.string(), amountCents: integer.positive(), category: categorySchema,
    occurredAt: z.iso.datetime({ offset: true }), planned: z.boolean(), source: z.enum(['manual', 'demo']),
    reflection: z.strictObject({ verdict: reflectionVerdictSchema, reflectedAt: z.iso.datetime() }).nullable(),
  })),
  completedLessons: z.array(z.string()),
  operations: z.record(z.string(), z.strictObject({ type: z.string(), input: z.unknown() })),
});
export function emptyFinance(): z.infer<typeof financeSchema> {
  return { preferences: { voice: 'cute' }, budgets: {}, transactions: [], completedLessons: [], operations: {} };
}
export type FinanceAction =
  | { type: 'preferences'; input: PreferencesInput } | { type: 'budget'; input: BudgetInput }
  | { type: 'transaction'; input: TransactionInput } | { type: 'reflection'; input: ReflectionInput }
  | { type: 'lesson'; input: LessonAnswerInput } | { type: 'checkIn'; input: CheckInInput };
export type AddendumAction = Action | FinanceAction;
const cents = (value: number) => Math.round(value * 100);
function add(a: number, b: number): number {
  const result = a + b;
  if (!Number.isSafeInteger(result)) throw new DomainError(409, 'LIMIT_EXCEEDED', 'This amount exceeds the supported balance.');
  return result;
}
function accountRequired(stored: StoredState) {
  if (!stored.account) throw new DomainError(404, 'NOT_INITIALIZED', 'Set up Mochi before using this action.');
  return stored.account;
}
function canonical(action: AddendumAction): string { return action.type === 'quest' ? 'checkIn' : action.type; }
function canonicalInput(action: AddendumAction): unknown {
  return action.type === 'quest' ? { requestId: action.input.requestId } : 'input' in action ? action.input : {};
}
const structured = new Set(['transaction', 'reflection', 'lesson', 'checkIn']);
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

/** Every mock mutation uses this dispatcher, including V1 actions and aliases. */
export function applyAddendumAction(stored: StoredState, action: AddendumAction, now = new Date(), timeZone = DEFAULT_TIME_ZONE): StoredState {
  if (action.type === 'reset') return applyAction(stored, action, now, timeZone);
  const input = action.input;
  const id = 'requestId' in input ? input.requestId : undefined;
  if (id && stored.processedRequestIds.includes(id)) {
    const previous = stored.finance.operations[id];
    if ((structured.has(action.type) || (previous && structured.has(previous.type))) &&
        (!previous || (previous.type === 'quest' ? 'checkIn' : previous.type) !== canonical(action) || stable(previous.input) !== stable(canonicalInput(action))))
      throw new DomainError(409, 'REQUEST_ID_CONFLICT', 'This request ID belongs to another operation.');
    return structuredClone(stored);
  }
  let next = structuredClone(stored);
  switch (action.type) {
    case 'preferences': accountRequired(next); next.finance.preferences = structuredClone(action.input); break;
    case 'budget': {
      accountRequired(next);
      const { month, monthlyLimit, dailyLimit, categoryLimits } = action.input;
      next.finance.budgets[month] = { monthlyCents: cents(monthlyLimit), dailyCents: dailyLimit === undefined ? null : cents(dailyLimit),
        categoryCents: Object.fromEntries(Object.entries(categoryLimits ?? {}).map(([key, amount]) => [key, cents(amount!)])) };
      break;
    }
    case 'transaction': {
      accountRequired(next);
      const transaction = action.input;
      if (Date.parse(transaction.occurredAt) > now.getTime()) throw new DomainError(400, 'INVALID_REQUEST', 'Transactions cannot be in the future.');
      next.finance.transactions.push({ id: `txn-${transaction.requestId}`, name: transaction.name, amountCents: cents(transaction.amount),
        category: transaction.category, occurredAt: transaction.occurredAt, planned: transaction.planned ?? false, source: 'manual', reflection: null });
      // Reject aggregate overflow before publishing state, even across different months.
      next.finance.transactions.reduce((sum, item) => add(sum, item.amountCents), 0);
      break;
    }
    case 'reflection': {
      accountRequired(next);
      const transaction = next.finance.transactions.find(({ id }) => id === action.input.transactionId);
      if (!transaction) throw new DomainError(404, 'NOT_FOUND', 'Transaction not found.');
      if (transaction.reflection && transaction.reflection.verdict !== action.input.verdict)
        throw new DomainError(409, 'REFLECTION_EXISTS', 'This transaction has already been reflected on.');
      if (now.getTime() - Date.parse(transaction.occurredAt) < 86_400_000)
        throw new DomainError(409, 'REFLECTION_NOT_DUE', 'Reflection opens after 24 hours.');
      transaction.reflection ??= { verdict: action.input.verdict, reflectedAt: now.toISOString() };
      break;
    }
    case 'lesson': {
      const account = accountRequired(next);
      const lesson = lessonCatalogue.find(({ id }) => id === action.input.lessonId);
      if (!lesson) throw new DomainError(404, 'NOT_FOUND', 'Lesson not found.');
      if (!lesson.options.some(({ id }) => id === action.input.selectedOptionId))
        throw new DomainError(400, 'INVALID_REQUEST', 'Unknown lesson option.');
      if (lesson.correctOptionId === action.input.selectedOptionId && !next.finance.completedLessons.includes(lesson.id)) {
        account.coins = add(account.coins, LESSON_REWARD.coins); account.xp = add(account.xp, LESSON_REWARD.xp);
        next.finance.completedLessons.push(lesson.id);
      }
      break;
    }
    case 'checkIn': next = applyAction(next, { type: 'quest', input: { ...action.input, questId: 'daily-check-in' } }, now, timeZone); break;
    default: next = applyAction(next, action, now, timeZone);
  }
  if (id) {
    if (!next.processedRequestIds.includes(id)) next.processedRequestIds.push(id);
    next.finance.operations[id] = { type: action.type, input: canonicalInput(action) };
  }
  return next;
}
export function getTransactions(stored: StoredState, month: string, timeZone = DEFAULT_TIME_ZONE): Transaction[] {
  accountRequired(stored);
  return stored.finance.transactions.filter((t) => localDate(new Date(t.occurredAt), timeZone).slice(0, 7) === month)
    .map(({ amountCents, ...transaction }) => structuredClone({ ...transaction, amount: amountCents / 100 }));
}
export function getBudget(stored: StoredState, month: string, now = new Date(), timeZone = DEFAULT_TIME_ZONE): BudgetSummary {
  accountRequired(stored);
  const budget = stored.finance.budgets[month];
  const today = localDate(now, timeZone);
  const transactions = stored.finance.transactions.filter((t) => localDate(new Date(t.occurredAt), timeZone).slice(0, 7) === month);
  const spent = transactions.reduce((sum, t) => add(sum, t.amountCents), 0);
  const spentToday = transactions.filter((t) => localDate(new Date(t.occurredAt), timeZone) === today).reduce((sum, t) => add(sum, t.amountCents), 0);
  return { month, monthlyLimit: budget ? budget.monthlyCents / 100 : null, dailyLimit: budget?.dailyCents == null ? null : budget.dailyCents / 100,
    spentThisMonth: spent / 100, spentToday: spentToday / 100, remainingThisMonth: budget ? (budget.monthlyCents - spent) / 100 : null,
    categories: categorySchema.options.map((id) => ({ id, label: categoryLabels[id],
      spent: transactions.filter((t) => t.category === id).reduce((sum, t) => add(sum, t.amountCents), 0) / 100,
      limit: budget?.categoryCents[id] == null ? null : budget.categoryCents[id]! / 100 })) };
}
export function getAddendumAppState(stored: StoredState, now = new Date(), timeZone = DEFAULT_TIME_ZONE): AddendumAppState {
  const state = getAppState(stored, now, timeZone);
  if (!state.initialized) return state;
  return { ...state, preferences: structuredClone(stored.finance.preferences),
    forest: { treeStage: treeStageFor(state.goal.progressPercent), growthPercent: state.goal.progressPercent },
    budgetSummary: getBudget(stored, localDate(now, timeZone).slice(0, 7), now, timeZone), today: { checkInCompleted: state.quest.completedToday } };
}
export function requireAddendumState(state: AddendumAppState): AddendumInitializedAppState {
  if (!state.initialized) throw new DomainError(404, 'NOT_INITIALIZED', 'Set up Mochi before using this action.');
  return state;
}
export function getDueReflections(stored: StoredState, now = new Date()): Transaction[] {
  accountRequired(stored);
  return stored.finance.transactions.filter((t) => !t.reflection && now.getTime() - Date.parse(t.occurredAt) >= 86_400_000)
    .map(({ amountCents, ...t }) => structuredClone({ ...t, amount: amountCents / 100 }));
}
export function getInsights(stored: StoredState, now = new Date()): Insight[] {
  accountRequired(stored);
  const groups = new Map<string, typeof stored.finance.transactions>();
  for (const t of stored.finance.transactions) {
    const elapsed = now.getTime() - Date.parse(t.occurredAt);
    if (elapsed < 0 || elapsed > 7 * 86_400_000) continue;
    const key = JSON.stringify([t.name, t.source]);
    const group = groups.get(key) ?? []; group.push(t); groups.set(key, group);
  }
  return [...groups.values()].filter((group) => group.length >= 3).map((group) => {
    const first = group[0]!; const count = group.length;
    return { id: `frequency-${first.source}-${first.id}`, kind: 'frequency', title: `${first.name} showed up ${count} times this week`,
      description: `You recorded ${count} ${first.name} purchases in the last seven days.`,
      evidence: { count, windowDays: 7, totalAmount: group.reduce((sum, t) => add(sum, t.amountCents), 0) / 100 }, source: first.source,
      suggestion: 'Consider a small spending challenge that suits you.' };
  });
}
export function getLessons(stored: StoredState): LessonSummary[] {
  accountRequired(stored);
  return lessonCatalogue.map(({ correctOptionId: _, feedback: __, ...lesson }) => {
    const completed = stored.finance.completedLessons.includes(lesson.id);
    return structuredClone({ ...lesson, options: [...lesson.options], completed, availableReward: completed ? ZERO_REWARD : LESSON_REWARD });
  });
}
export function getDailyReport(stored: StoredState, now = new Date(), timeZone = DEFAULT_TIME_ZONE): DailyReport {
  const state = requireAddendumState(getAddendumAppState(stored, now, timeZone));
  const { spentToday, dailyLimit } = state.budgetSummary;
  const underDailyLimit = dailyLimit === null ? null : spentToday <= dailyLimit;
  return { date: localDate(now, timeZone), spentToday, dailyLimit, underDailyLimit,
    achievement: underDailyLimit ? 'Daily spending is within your target' : null,
    insight: state.quest.completedToday ? 'You completed your financial check-in' : 'Your financial check-in is ready',
    completedToday: state.quest.completedToday, streakDays: state.quest.streakDays,
    availableReward: { ...(state.quest.available ? CHECK_IN_REWARD : ZERO_REWARD) } };
}
