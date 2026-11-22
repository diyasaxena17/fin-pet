import examples from '../../../../packages/contracts/fixtures/addendum.json';
import type { BudgetSummary, DailyReport, Insight, Transaction } from '@mochi/contracts';

/** Explicitly labeled sample responses from the frozen shared addendum fixture. */
const fixture = examples as {
  budget: BudgetSummary;
  transaction: Transaction;
  insight: Insight;
  report: DailyReport;
};

export const sharedDemoBudget = fixture.budget;
export const sharedDemoTransaction = fixture.transaction;
export const sharedDemoInsight = fixture.insight;
export const sharedDemoReport = fixture.report;
