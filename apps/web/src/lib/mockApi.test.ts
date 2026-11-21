import { describe, expect, it } from 'vitest';
import { createMockApi } from './mockApi';
import { createRequestId } from './requestId';

const onboarding = { petName: 'Mochi', goalTitle: 'Emergency fund', goalTarget: 200,
  letter: { vision: 'My future', why: 'My reasons', reminder: 'Small steps count.' } };

describe('mock contract compatibility', () => {
  it('walks the same standalone flow as the real API and deduplicates retries', async () => {
    const api = createMockApi();
    expect(await api.getState()).toEqual({ initialized: false });
    await api.onboard(onboarding);
    const decision = { requestId: createRequestId(), itemName: 'Hoodie', amount: 60, decision: 'skip' as const };
    expect((await api.submitDecision(decision)).wallet).toMatchObject({ coins: 60, xp: 20 });
    await api.submitDecision(decision);
    const savings = { requestId: createRequestId(), amount: 50 };
    const saved = await api.recordSavings(savings);
    expect(saved.letter.revealedSections).toBe(1);
    expect(saved.goal).toMatchObject({ progressPercent: 25, potentialSavings: 60, confirmedSaved: 50 });
    await api.recordSavings(savings);
    const feed = { requestId: createRequestId(), petId: 'mochi-01' as const };
    await api.feedPet(feed);
    const fed = await api.feedPet(feed);
    expect(fed.wallet).toMatchObject({ coins: 40, xp: 50 });
    expect(fed.pet).toMatchObject({ hunger: 80, mood: 'happy' });
    expect((await api.demoSeed({ xp: 250 })).unlockedFeatures).toContain('expandedProjection');
    expect(await api.demoReset()).toEqual({ initialized: false });
  });
  it('isolates mock sessions and response objects', async () => {
    const api = createMockApi();
    const state = await api.onboard(onboarding);
    state.wallet.coins = 999;
    expect((await api.getState())).toMatchObject({ wallet: { coins: 0 } });
    expect(await createMockApi().getState()).toEqual({ initialized: false });
    await expect(api.feedPet({ requestId: createRequestId(), petId: 'mochi-01' })).rejects.toThrow('20 Mochi coins');
  });
  it('validates the same request shapes as the server', async () => {
    const api = createMockApi();
    await api.onboard(onboarding);
    await expect(api.recordSavings({ requestId: 'bad', amount: 1 })).rejects.toThrow();
    await expect(api.recordSavings({ requestId: createRequestId(), amount: 0.001 })).rejects.toThrow();
  });
});
