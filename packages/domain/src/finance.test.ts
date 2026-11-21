import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { lessonCatalogue } from '@mochi/contracts';
import { applyAddendumAction, emptyStoredState, getAddendumAppState, getBudget, getDailyReport, getDueReflections, getInsights, getLessons, storedStateSchema, type StoredState } from './index';
const now = new Date('2026-11-21T18:00:00Z');
const onboard = () => applyAddendumAction(emptyStoredState(), { type: 'onboard', input: {
  petName: 'Mochi', goalTitle: 'Fund', goalTarget: 200, letter: { vision: '  Exact\n', why: '', reminder: '' },
} }, now);
const record = (stored: StoredState, occurredAt = '2026-11-19T19:30:00-05:00', amount = 18) => applyAddendumAction(stored,
  { type: 'transaction', input: { requestId: randomUUID(), name: 'Takeout', amount, category: 'food', occurredAt } }, now);

describe('additive finance rules', () => {
  it('defaults legacy storage without modifying the original letter or inventing limits', () => {
    const stored = onboard();
    const { finance: _, ...legacy } = stored;
    const migrated = storedStateSchema.parse(legacy);
    expect(migrated.account!.letter.vision).toBe('  Exact\n');
    expect(getBudget(migrated, '2026-11', now)).toMatchObject({ monthlyLimit: null, dailyLimit: null, remainingThisMonth: null, spentToday: 0 });
    expect(getDailyReport(migrated, now)).toMatchObject({ underDailyLimit: null, achievement: null, availableReward: { coins: 0, xp: 0 } });
  });
  it('groups offset instants in the user timezone and changes spending only', () => {
    let stored = onboard();
    const before = getAddendumAppState(stored, now);
    stored = record(stored, '2026-11-01T01:00:00+14:00', .29); // Oct 31 in Toronto
    expect(getBudget(stored, '2026-10', now).spentThisMonth).toBe(.29);
    expect(getBudget(stored, '2026-11', now).spentThisMonth).toBe(0);
    expect(getAddendumAppState(stored, now)).toEqual(before);
  });
  it('stores cents, replaces limits, preserves savings and derives tree only from contributions', () => {
    let stored = record(onboard());
    stored = applyAddendumAction(stored, { type: 'budget', input: { month: '2026-11', monthlyLimit: 10, dailyLimit: 25, categoryLimits: { food: 5 } } }, now);
    expect(getBudget(stored, '2026-11', now)).toMatchObject({ spentThisMonth: 18, remainingThisMonth: -8, dailyLimit: 25 });
    expect(stored.finance.transactions[0]!.amountCents).toBe(1800);
    const view = getAddendumAppState(stored, now);
    expect(view).toMatchObject({ wallet: { xp: 0, coins: 0 }, goal: { confirmedSaved: 0, potentialSavings: 0 }, forest: { treeStage: 'seedling' } });
    stored = applyAddendumAction(stored, { type: 'savings', input: { requestId: randomUUID(), amount: 150 } }, now);
    expect(getAddendumAppState(stored, now)).toMatchObject({ forest: { treeStage: 'mature', growthPercent: 75 }, letter: { revealedSections: 2 } });
    stored = applyAddendumAction(stored, { type: 'budget', input: { month: '2026-11', monthlyLimit: 500 } }, now);
    expect(getBudget(stored, '2026-11', now).dailyLimit).toBeNull();
    expect(getBudget(stored, '2026-11', now).categories[0]!.limit).toBeNull();
  });
  it('retries transactions, rejects UUID reuse, and leaves failed IDs available', () => {
    let stored = onboard();
    const input = { requestId: randomUUID(), name: 'Item', amount: 1, category: 'other' as const, occurredAt: now.toISOString() };
    stored = applyAddendumAction(stored, { type: 'transaction', input }, now);
    expect(applyAddendumAction(stored, { type: 'transaction', input }, now).finance.transactions).toHaveLength(1);
    expect(() => applyAddendumAction(stored, { type: 'savings', input: { requestId: input.requestId, amount: 1 } }, now)).toThrow('another operation');
    expect(() => applyAddendumAction(stored, { type: 'transaction', input: { ...input, name: 'Changed' } }, now)).toThrow('another operation');
    const future = { ...input, requestId: randomUUID(), occurredAt: '2027-01-01T00:00:00Z' };
    expect(() => applyAddendumAction(stored, { type: 'transaction', input: future }, now)).toThrow('future');
    expect(stored.processedRequestIds).not.toContain(future.requestId);
  });
  it('reflects only after 24 hours and never rewards a verdict', () => {
    let stored = record(onboard(), now.toISOString());
    const input = { requestId: randomUUID(), transactionId: stored.finance.transactions[0]!.id, verdict: 'unsure' as const };
    expect(getDueReflections(stored, now)).toEqual([]);
    expect(() => applyAddendumAction(stored, { type: 'reflection', input }, now)).toThrow('24 hours');
    const tomorrow = new Date(now.getTime() + 86_400_000);
    expect(getDueReflections(stored, tomorrow)).toHaveLength(1);
    stored = applyAddendumAction(stored, { type: 'reflection', input }, tomorrow);
    expect(getDueReflections(stored, tomorrow)).toEqual([]);
    expect(stored.account!.xp).toBe(0);
    expect(() => applyAddendumAction(stored, { type: 'reflection', input: { ...input, requestId: randomUUID(), verdict: 'worth_it' } }, tomorrow)).toThrow('already');
  });
  it('uses observed patterns, excluding outside-window records', () => {
    let stored = onboard();
    expect(getInsights(stored, now)).toEqual([]);
    for (let i = 0; i < 3; i++) stored = record(stored);
    stored = record(stored, '2026-11-01T00:00:00Z', 200);
    expect(getInsights(stored, now)[0]).toMatchObject({ source: 'manual', evidence: { count: 3, windowDays: 7, totalAmount: 54 } });
  });
  it('rewards a correct lesson only once and leaves wrong answers retryable with a fresh ID', () => {
    let stored = onboard();
    const lesson = lessonCatalogue[0]!;
    const input = { requestId: randomUUID(), lessonId: lesson.id, selectedOptionId: 'skip' };
    stored = applyAddendumAction(stored, { type: 'lesson', input }, now);
    expect(stored.account!.xp).toBe(0);
    expect(() => applyAddendumAction(stored, { type: 'lesson', input: { ...input, selectedOptionId: 'save' } }, now)).toThrow('another operation');
    for (let i = 0; i < 2; i++) stored = applyAddendumAction(stored, { type: 'lesson', input: { ...input, requestId: randomUUID(), selectedOptionId: 'save' } }, now);
    expect(stored.account).toMatchObject({ xp: 10, coins: 5 });
    expect(getLessons(stored)[0]).toMatchObject({ completed: true, availableReward: { coins: 0, xp: 0 } });
  });
  it('shares one check-in reward across aliases and local midnight', () => {
    let stored = applyAddendumAction(onboard(), { type: 'seed', input: { xp: 100 } }, now);
    const beforeMidnight = new Date('2026-11-22T04:59:59Z');
    stored = applyAddendumAction(stored, { type: 'checkIn', input: { requestId: randomUUID() } }, beforeMidnight);
    stored = applyAddendumAction(stored, { type: 'quest', input: { requestId: randomUUID(), questId: 'daily-check-in' } }, beforeMidnight);
    expect(stored.account).toMatchObject({ coins: 10, xp: 120 });
    expect(getDailyReport(stored, beforeMidnight)).toMatchObject({ completedToday: true, availableReward: { coins: 0, xp: 0 } });
    const afterMidnight = new Date('2026-11-22T05:00:00Z');
    stored = applyAddendumAction(stored, { type: 'checkIn', input: { requestId: randomUUID() } }, afterMidnight);
    expect(stored.account).toMatchObject({ coins: 20, xp: 140, streakDays: 2 });
  });
});
