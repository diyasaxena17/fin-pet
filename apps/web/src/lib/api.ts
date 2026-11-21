import type { ApiErrorResponse, MochiApi } from '@mochi/contracts';

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as ApiErrorResponse | null;
    throw new ApiError(response.status, payload?.error?.code ?? 'HTTP_ERROR', payload?.error?.message ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const httpApi: MochiApi = {
  getState: () => request('/state'),
  onboard: (body) => request('/onboarding', 'POST', body),
  updateLetter: (body) => request('/letter', 'PUT', body),
  submitDecision: (body) => request('/decisions', 'POST', body),
  recordSavings: (body) => request('/savings', 'POST', body),
  feedPet: (body) => request('/feed', 'POST', body),
  completeQuest: (body) => request('/quests/complete', 'POST', body),
  demoSeed: (body) => request('/demo/seed', 'POST', body),
  demoReset: () => request('/demo/reset', 'POST', {}),
};

// Dynamic import keeps the fixture-based mock out of the real adapter path.
export const api: MochiApi = import.meta.env.VITE_USE_MOCK === 'true'
  ? (await import('./mockApi')).mockApi
  : httpApi;

export const { getState, onboard, updateLetter, submitDecision, recordSavings, feedPet, completeQuest, demoSeed, demoReset } = api;
