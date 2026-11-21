import {
  onboardingSchema, letterInputSchema, decisionSchema, savingsSchema,
  feedSchema, questSchema, demoSeedSchema, preferencesInputSchema, budgetSchema, transactionSchema,
  reflectionSchema, lessonAnswerSchema, checkInSchema, monthSchema, lessonCatalogue, type AddendumMochiApi, type Transaction,
} from '@mochi/contracts';
import {
  applyAddendumAction, emptyStoredState, getAddendumAppState, requireAddendumState,
  getBudget, getTransactions, getInsights, getDueReflections, getLessons, getDailyReport, localDate,
  type AddendumAction,
} from '@mochi/domain';

/** Each mock session uses the server's domain rules without network or disk access. */
export function createMockApi(options: { clock?: () => Date; timeZone?: string } = {}): AddendumMochiApi {
  let stored = emptyStoredState();
  const clock = options.clock ?? (() => new Date());
  const dispatch = (action: AddendumAction) => {
    const now = clock();
    stored = applyAddendumAction(stored, action, now, options.timeZone);
    return getAddendumAppState(stored, now, options.timeZone);
  };
  const transactionView = (id: string): Transaction => {
    const { amountCents, ...transaction } = stored.finance.transactions.find((t) => t.id === id)!;
    return structuredClone({ ...transaction, amount: amountCents / 100 });
  };
  return {
    async getState() { return getAddendumAppState(stored, clock(), options.timeZone); },
    async onboard(input) { return requireAddendumState(dispatch({ type: 'onboard', input: onboardingSchema.parse(input) })); },
    async updateLetter(input) { return requireAddendumState(dispatch({ type: 'letter', input: letterInputSchema.parse(input) })); },
    async submitDecision(input) { return requireAddendumState(dispatch({ type: 'decision', input: decisionSchema.parse(input) })); },
    async recordSavings(input) { return requireAddendumState(dispatch({ type: 'savings', input: savingsSchema.parse(input) })); },
    async feedPet(input) { return requireAddendumState(dispatch({ type: 'feed', input: feedSchema.parse(input) })); },
    async completeQuest(input) { return requireAddendumState(dispatch({ type: 'quest', input: questSchema.parse(input) })); },
    async demoSeed(input) { return requireAddendumState(dispatch({ type: 'seed', input: demoSeedSchema.parse(input) })); },
    async demoReset() { return dispatch({ type: 'reset' }); },
    async updatePreferences(input) { return requireAddendumState(dispatch({ type: 'preferences', input: preferencesInputSchema.parse(input) })); },
    async getBudgets(month) { return getBudget(stored, monthSchema.parse(month), clock(), options.timeZone); },
    async updateBudgets(input) {
      const parsed = budgetSchema.parse(input); dispatch({ type: 'budget', input: parsed });
      return getBudget(stored, parsed.month, clock(), options.timeZone);
    },
    async getTransactions(month) { return { transactions: getTransactions(stored, monthSchema.parse(month), options.timeZone) }; },
    async recordTransaction(input) {
      const parsed = transactionSchema.parse(input); dispatch({ type: 'transaction', input: parsed });
      const transaction = transactionView(`txn-${parsed.requestId}`);
      return { transaction, budget: getBudget(stored, localDate(new Date(transaction.occurredAt), options.timeZone).slice(0, 7), clock(), options.timeZone) };
    },
    async getInsights() { return { insights: getInsights(stored, clock()) }; },
    async getDueReflections() { return { transactions: getDueReflections(stored, clock()) }; },
    async reflect(input) {
      const parsed = reflectionSchema.parse(input);
      const state = requireAddendumState(dispatch({ type: 'reflection', input: parsed }));
      return { transaction: transactionView(parsed.transactionId), state };
    },
    async getLessons() { return { lessons: getLessons(stored) }; },
    async answerLesson(input) {
      const parsed = lessonAnswerSchema.parse(input); const before = stored.account;
      const state = requireAddendumState(dispatch({ type: 'lesson', input: parsed }));
      const lesson = lessonCatalogue.find((lesson) => lesson.id === parsed.lessonId)!;
      return { correct: lesson.correctOptionId === parsed.selectedOptionId, feedback: lesson.feedback,
        reward: { coins: state.wallet.coins - (before?.coins ?? 0), xp: state.wallet.xp - (before?.xp ?? 0) }, state };
    },
    async getDailyReport() { return getDailyReport(stored, clock(), options.timeZone); },
    async checkIn(input) {
      const before = stored.account;
      const state = requireAddendumState(dispatch({ type: 'checkIn', input: checkInSchema.parse(input) }));
      return { completedToday: state.quest.completedToday,
        reward: { coins: state.wallet.coins - (before?.coins ?? 0), xp: state.wallet.xp - (before?.xp ?? 0) }, state };
    },
  };
}
export const mockApi = createMockApi();
