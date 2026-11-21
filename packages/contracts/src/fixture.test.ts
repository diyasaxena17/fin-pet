import { describe, expect, it } from 'vitest';
import rawFixture from '../fixtures/app-state.json';
import rawAddendumFixture from '../fixtures/addendum-app-state.json';
import { appStateFixture, createAppState, addendumAppStateFixture, createAddendumAppState, moneySchema, onboardingSchema, savingsSchema } from './index';

describe('shared fixture and input schemas', () => {
  it('exports the JSON unchanged and recursively frozen', () => {
    expect(appStateFixture).toEqual(rawFixture);
    expect(Object.isFrozen(appStateFixture.wallet)).toBe(true);
    expect(Object.isFrozen(appStateFixture.letter)).toBe(true);
  });
  it('isolates fixture consumers', () => {
    const state = createAppState();
    state.wallet.coins = 60;
    state.letter.vision = 'Changed';
    expect(createAppState()).toEqual(rawFixture);
  });
  it('validates CAD amounts without silently truncating fractions', () => {
    for (const amount of [0.01, 60, 60.01, 0.1 + 0.2]) expect(moneySchema.safeParse(amount).success).toBe(true);
    for (const amount of [0, -1, 0.001, 0.00000001, Infinity, NaN, '60', 1_000_000_001]) expect(moneySchema.safeParse(amount).success).toBe(false);
  });
  it('rejects invalid request IDs, calendar dates, and unknown fields', () => {
    expect(savingsSchema.safeParse({ requestId: 'same', amount: 50 }).success).toBe(false);
    const input = { petName: 'Mochi', goalTitle: 'Trip', goalTarget: 200, letter: { vision: '', why: '', reminder: '' } };
    expect(onboardingSchema.safeParse({ ...input, goalDate: '2026-02-30' }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...input, device: {} }).success).toBe(false);
  });
});

// These examples are response-shape fixtures, not a ledger used to compute totals.
import addendumFixture from '../fixtures/addendum.json';
import type { BudgetSummary, Transaction, Insight, DailyReport } from './index';
const examples = addendumFixture as {
  budget: BudgetSummary; transaction: Transaction; insight: Insight; report: DailyReport;
};
it('keeps shared addendum examples explicit about synthetic data and pending check-ins', () => {
  expect(examples.transaction.source).toBe('demo');
  expect(examples.report.completedToday).toBe(false);
  expect(examples.report.insight).not.toContain('completed');
});

it('exports an isolated additive fixture without inventing a spending limit', () => {
  expect(addendumAppStateFixture).toEqual(rawAddendumFixture);
  expect(Object.isFrozen(addendumAppStateFixture.budgetSummary.categories[0])).toBe(true);
  const sample = createAddendumAppState();
  sample.preferences.voice = 'calm';
  sample.budgetSummary.categories[0]!.spent = 99;
  expect(createAddendumAppState()).toEqual(rawAddendumFixture);
  expect(sample.budgetSummary.dailyLimit).toBeNull();
});
