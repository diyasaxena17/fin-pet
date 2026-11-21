import { describe, expect, it } from 'vitest';
import rawFixture from '../fixtures/app-state.json';
import { appStateFixture, createAppState, moneySchema, onboardingSchema, savingsSchema } from './index';

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
