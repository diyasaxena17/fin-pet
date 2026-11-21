import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { applyAction, emptyStoredState, getAppState, requireInitialized, type StoredState } from './index';

const now = new Date('2026-11-20T17:00:00Z');
const onboard = () => applyAction(emptyStoredState(), { type: 'onboard', input: {
  petName: 'Mochi', goalTitle: 'Emergency fund', goalTarget: 200,
  letter: { vision: 'My future', why: 'My reasons', reminder: 'Small steps count.' },
} }, now);
const view = (stored: StoredState, date = now) => requireInitialized(getAppState(stored, date));

describe('standalone app rules', () => {
  it('rewards rounded and capped skipped purchases without confirming savings', () => {
    let stored = onboard();
    for (const amount of [0.01, 60.01, 200]) stored = applyAction(stored, { type: 'decision', input: { requestId: randomUUID(), itemName: 'Item', amount, decision: 'skip' } }, now);
    expect(view(stored).wallet).toMatchObject({ coins: 162, xp: 60, level: 1 });
    expect(view(stored).goal).toMatchObject({ potentialSavings: 260.02, confirmedSaved: 0, progressPercent: 0 });
    expect(view(stored).letter.revealedSections).toBe(0);
    expect(stored.account?.potentialCents).toBe(26002);
  });
  it('records purchases without rewards or pet penalties', () => {
    const original = onboard();
    const stored = applyAction(original, { type: 'decision', input: { requestId: randomUUID(), itemName: 'Book', amount: 20, decision: 'buy' } }, now);
    expect(stored.decisions).toHaveLength(1);
    expect(view(stored)).toEqual(view(original));
    expect(original.decisions).toHaveLength(0);
  });
  it('reveals original letter sections only at confirmed milestones', () => {
    let stored = onboard();
    for (const [amount, revealed] of [[49.99, 0], [0.01, 1], [50, 2], [100, 3], [1, 3]]) {
      stored = applyAction(stored, { type: 'savings', input: { requestId: randomUUID(), amount: amount! } }, now);
      expect(view(stored).letter.revealedSections).toBe(revealed);
    }
    expect(view(stored).letter.vision).toBe('My future');
    expect(view(stored).goal.progressPercent).toBe(100);
    expect(view(stored).wallet.xp).toBe(150);
  });
  it('derives exact level boundaries and keeps basic projection available', () => {
    for (const [xp, level, nextLevelXp] of [[99, 1, 100], [100, 2, 250], [249, 2, 250], [250, 3, null]] as const) {
      const stored = onboard();
      stored.account!.xp = xp;
      const state = view(stored);
      expect(state.wallet).toMatchObject({ level, nextLevelXp });
      expect(state.unlockedFeatures).toContain('basicProjection');
      expect(state.unlockedFeatures.includes('expandedProjection')).toBe(level === 3);
      expect(state.quest.available).toBe(level >= 2);
    }
  });
  it('caps feeding fullness, spends only coins, and deduplicates', () => {
    let stored = applyAction(onboard(), { type: 'seed', input: { coins: 100, xp: 100 } }, now);
    const input = { requestId: randomUUID(), petId: 'mochi-01' as const };
    stored = applyAction(stored, { type: 'feed', input }, now);
    expect(view(stored).pet).toMatchObject({ hunger: 80, mood: 'happy' });
    stored = applyAction(stored, { type: 'feed', input }, now);
    expect(view(stored).wallet).toMatchObject({ coins: 80, xp: 100 });
    stored = applyAction(stored, { type: 'feed', input: { ...input, requestId: randomUUID() } }, now);
    expect(view(stored).pet.hunger).toBe(100);
  });
  it('deduplicates daily quests by local calendar day and preserves consecutive streaks', () => {
    let stored = applyAction(onboard(), { type: 'seed', input: { xp: 100 } }, now);
    const day1 = new Date('2026-11-21T04:59:00Z');
    const day2 = new Date('2026-11-21T05:01:00Z');
    stored = applyAction(stored, { type: 'quest', input: { requestId: randomUUID(), questId: 'daily-check-in' } }, day1);
    const first = view(stored, day1);
    expect(first.quest).toMatchObject({ streakDays: 1, completedToday: true, available: false });
    stored = applyAction(stored, { type: 'quest', input: { requestId: randomUUID(), questId: 'daily-check-in' } }, day1);
    expect(view(stored, day1).wallet).toEqual(first.wallet);
    stored = applyAction(stored, { type: 'quest', input: { requestId: randomUUID(), questId: 'daily-check-in' } }, day2);
    expect(view(stored, day2).quest.streakDays).toBe(2);
    expect(view(stored, day2).wallet).toMatchObject({ xp: 140, coins: 20 });
  });
  it('does not grant a locked quest or mutate the previous state on errors', () => {
    const stored = onboard();
    expect(() => applyAction(stored, { type: 'quest', input: { requestId: randomUUID(), questId: 'daily-check-in' } }, now)).toThrow('level 2');
    expect(() => applyAction(stored, { type: 'feed', input: { requestId: randomUUID(), petId: 'mochi-01' } }, now)).toThrow('20 Mochi coins');
    expect(stored.processedRequestIds).toHaveLength(0);
    expect(view(stored).pet.hunger).toBe(50);
  });
});
