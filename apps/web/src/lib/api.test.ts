import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppState } from '@mochi/contracts';
import { ApiError, httpApi } from './api';
import { createRequestId } from './requestId';

afterEach(() => vi.unstubAllGlobals());
describe('HTTP adapter contract', () => {
  it('uses direct state responses and the supplied contract paths', async () => {
    const fixture = createAppState();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => fixture });
    vi.stubGlobal('fetch', fetchMock);
    await httpApi.getState();
    expect(await httpApi.onboard({ petName: 'Mochi', goalTitle: 'Trip', goalTarget: 200, letter: { vision: 'a', why: 'b', reminder: 'c' } })).toEqual(fixture);
    await httpApi.updateLetter({ letter: { vision: 'a', why: 'b', reminder: 'c' } });
    await httpApi.submitDecision({ requestId: createRequestId(), itemName: 'Shoes', amount: 60, decision: 'skip' });
    const savings = { requestId: createRequestId(), amount: 50 };
    await httpApi.recordSavings(savings);
    await httpApi.feedPet({ requestId: createRequestId(), petId: 'mochi-01' });
    await httpApi.completeQuest({ requestId: createRequestId(), questId: 'daily-check-in' });
    await httpApi.demoSeed({ xp: 100 });
    await httpApi.demoReset();
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
      ['/api/state', 'GET'], ['/api/onboarding', 'POST'], ['/api/letter', 'PUT'], ['/api/decisions', 'POST'],
      ['/api/savings', 'POST'], ['/api/feed', 'POST'], ['/api/quests/complete', 'POST'], ['/api/demo/seed', 'POST'], ['/api/demo/reset', 'POST'],
    ]);
    expect(JSON.parse(fetchMock.mock.calls[4]![1].body)).toEqual(savings);
  });
  it('surfaces API error codes and handles non-JSON errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: { code: 'INSUFFICIENT_COINS', message: 'You need 20 Mochi coins.' } }) }));
    await expect(httpApi.feedPet({ requestId: createRequestId(), petId: 'mochi-01' })).rejects.toMatchObject({ status: 409, code: 'INSUFFICIENT_COINS' } satisfies Partial<ApiError>);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error('Not JSON'); } }));
    await expect(httpApi.getState()).rejects.toMatchObject({ status: 502, code: 'HTTP_ERROR' });
  });
});
