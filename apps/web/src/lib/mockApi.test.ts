import { describe, expect, it } from 'vitest';
import { createMockApi } from './mockApi';

describe('isolated frontend demo', () => {
  it('walks the frozen reward, savings, letter, and feeding flow', async () => {
    const api = createMockApi();
    await api.onboard({ name: 'Diya', petName: 'Mochi', goal: { name: 'Weekend away', targetCents: 20000 }, letter: { sections: ['Start', 'Keep going', 'You did it'] } });
    const skipped = (await api.submitDecision({ choice: 'skip', amountCents: 6000, item: 'Shoes' })).state;
    expect(skipped.wallet).toEqual({ coins: 60, xp: 20, level: 1 });
    expect(skipped.savings).toEqual({ potentialCents: 6000, confirmedCents: 0 });
    const saved = (await api.recordSavings({ amountCents: 5000 })).state;
    expect(saved.goal.savedCents / saved.goal.targetCents).toBe(0.25);
    expect(saved.letter.revealedSections).toBe(1);
    const fed = (await api.feedPet({ source: 'nfc' })).state;
    expect(fed.wallet.coins).toBe(40);
    expect(fed.pet.reactionSeq).toBe(1);
    expect((await api.getState()).pet.reactionSeq).toBe(1);
    expect((await api.demoSeed({ level: 2 })).state.features).toEqual({ quests: true, projection: false });
    expect((await api.demoSeed({ level: 3 })).state.features).toEqual({ quests: true, projection: true });
    expect((await api.getState()).pet.reactionSeq).toBe(1);
  });
  it('does not mutate shared fixtures, responses, or another mock session', async () => {
    const api = createMockApi();
    const state = await api.getState();
    state.wallet.coins = 999;
    expect((await api.getState()).wallet.coins).toBe(0);
    expect((await createMockApi().getState()).wallet.coins).toBe(0);
    await expect(api.feedPet({ source: 'app' })).rejects.toThrow('20 coins');
  });
  it('rejects invalid amounts and prevents duplicate quest rewards', async () => {
    const api = createMockApi();
    await expect(api.recordSavings({ amountCents: -1 })).rejects.toThrow();
    await api.recordSavings({ amountCents: 5000 });
    await api.demoSeed({ level: 2 });
    const first = await api.completeQuest({ questId: 'first-save' });
    const second = await api.completeQuest({ questId: 'first-save' });
    expect(second.state.wallet).toEqual(first.state.wallet);
  });
});
