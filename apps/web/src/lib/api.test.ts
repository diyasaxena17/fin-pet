import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppState } from '@mochi/contracts';
import { ApiError, httpApi } from './api';

afterEach(() => vi.unstubAllGlobals());

describe('HTTP adapter contract', () => {
  it('uses the frozen method, path, and request shape for every operation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ state: createAppState() }) });
    vi.stubGlobal('fetch', fetchMock);
    await httpApi.getState();
    await httpApi.onboard({ name: 'D', petName: 'Mochi', goal: { name: 'Trip', targetCents: 20000 }, letter: { sections: ['a', 'b', 'c'] } });
    await httpApi.updateLetter({ sections: ['a', 'b', 'c'] });
    await httpApi.submitDecision({ choice: 'skip', amountCents: 6000, item: 'Shoes' });
    await httpApi.recordSavings({ amountCents: 5000 });
    await httpApi.feedPet({ source: 'qr' });
    await httpApi.completeQuest({ questId: 'first-save' });
    await httpApi.demoSeed({ level: 2 });
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
      ['/api/state', 'GET'], ['/api/onboard', 'POST'], ['/api/letter', 'PUT'], ['/api/decisions', 'POST'],
      ['/api/savings', 'POST'], ['/api/pet/feed', 'POST'], ['/api/quests/complete', 'POST'], ['/api/demo/seed', 'POST'],
    ]);
    expect(JSON.parse(fetchMock.mock.calls[4]![1].body)).toEqual({ amountCents: 5000 });
  });
  it('surfaces API errors with their status and code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 501, json: async () => ({ error: { code: 'NOT_IMPLEMENTED', message: 'Reserved' } }) }));
    await expect(httpApi.getState()).rejects.toMatchObject({ status: 501, code: 'NOT_IMPLEMENTED', message: 'Reserved' } satisfies Partial<ApiError>);
  });
});
