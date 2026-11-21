import { describe, expect, it } from 'vitest';
import { budgetSchema, monthQuerySchema, preferencesSchema, preferencesInputSchema, transactionSchema, reflectionSchema, treeStageFor, treeStages } from './index';
const requestId = '11111111-1111-4111-8111-111111111111';
describe('additive contract', () => {
  it('validates budgets, categories, strict query fields and money', () => {
    expect(budgetSchema.parse({ month: '2026-11', monthlyLimit: 500, categoryLimits: { food: 100 } }).dailyLimit).toBeUndefined();
    for (const input of [{ month: '2026-13' }, { month: '26-11' }, { month: '2026-11', extra: 1 }])
      expect(monthQuerySchema.safeParse(input).success).toBe(false);
    expect(budgetSchema.safeParse({ month: '2026-11', monthlyLimit: 0 }).success).toBe(false);
    expect(budgetSchema.safeParse({ month: '2026-11', monthlyLimit: 500, categoryLimits: { unknown: 100 } }).success).toBe(false);
  });
  it('accepts offset dates and rejects impossible dates and synthetic bank labels', () => {
    const transaction = { requestId, name: 'Takeout', amount: 18, category: 'food', occurredAt: '2026-11-19T19:30:00-05:00' };
    expect(transactionSchema.parse(transaction).planned).toBeUndefined();
    for (const changed of [{ occurredAt: '2026-02-30T19:30:00Z' }, { source: 'bank-connected' }, { amount: .001 }, { planned: 'false' }])
      expect(transactionSchema.safeParse({ ...transaction, ...changed }).success).toBe(false);
    expect(preferencesSchema.parse({ voice: 'calm' })).toEqual({ voice: 'calm' });
    expect(reflectionSchema.parse({ requestId, transactionId: 'txn-demo-01', verdict: 'not_worth_it' }).verdict).toBe('not_worth_it');
  });
  it('defines exact tree boundaries once, independently from letter reveals', () => {
    expect([0, 24.999, 25, 49.999, 50, 74.999, 75, 99.999, 100, 125].map(treeStageFor))
      .toEqual(['seedling', 'seedling', 'sapling', 'sapling', 'young', 'young', 'mature', 'mature', 'thriving', 'thriving']);
    expect(Object.isFrozen(treeStages)).toBe(true);
    expect(() => treeStageFor(NaN)).toThrow();
  });
});

it('accepts independent name and voice edits without expanding preference state', () => {
  expect(preferencesInputSchema.parse({ petName: '  Clover  ' })).toEqual({ petName: 'Clover' });
  expect(preferencesInputSchema.parse({ voice: 'calm' })).toEqual({ voice: 'calm' });
  expect(preferencesInputSchema.parse({ petName: 'Maple', voice: 'cute' })).toEqual({ petName: 'Maple', voice: 'cute' });
  expect(preferencesInputSchema.parse({ petName: '🐿'.repeat(100) }).petName).toHaveLength(200);
  for (const value of [{}, { petName: '  ' }, { petName: 'x'.repeat(201) }, { petName: '🐿'.repeat(101) },
    { petName: null }, { voice: 'loud' }, { voice: 'cute', unknown: true }])
    expect(preferencesInputSchema.safeParse(value).success).toBe(false);
  expect(preferencesSchema.safeParse({ voice: 'cute', petName: 'Maple' }).success).toBe(false);
});
