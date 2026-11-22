import { monthSchema, type ApiErrorResponse, type AddendumMochiApi } from '@mochi/contracts';

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      cache: 'no-store',
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError(0, 'OFFLINE', 'Could not reach the server. Check your connection and retry.');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as ApiErrorResponse | null;
    throw new ApiError(response.status, payload?.error?.code ?? 'HTTP_ERROR', payload?.error?.message ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const httpApi: AddendumMochiApi = {
  getState: () => request('/state'),
  onboard: (body) => request('/onboarding', 'POST', body),
  updateLetter: (body) => request('/letter', 'PUT', body),
  submitDecision: (body) => request('/decisions', 'POST', body),
  recordSavings: (body) => request('/savings', 'POST', body),
  feedPet: (body) => request('/feed', 'POST', body),
  completeQuest: (body) => request('/quests/complete', 'POST', body),
  demoSeed: (body) => request('/demo/seed', 'POST', body),
  demoReset: () => request('/demo/reset', 'POST', {}),
  updatePreferences: (body) => request('/preferences', 'PUT', body),
  getBudgets: (month) => request(`/budgets?month=${encodeURIComponent(monthSchema.parse(month))}`),
  updateBudgets: (body) => request('/budgets', 'PUT', body),
  getTransactions: (month) => request(`/transactions?month=${encodeURIComponent(monthSchema.parse(month))}`),
  recordTransaction: (body) => request('/transactions', 'POST', body),
  getInsights: () => request('/insights'),
  getDueReflections: () => request('/reflections/due'),
  reflect: (body) => request('/reflections', 'POST', body),
  getLessons: () => request('/lessons'),
  answerLesson: (body) => request('/lessons/answer', 'POST', body),
  getDailyReport: () => request('/reports/today'),
  checkIn: (body) => request('/check-ins', 'POST', body),
};

// Dynamic import keeps the fixture-based mock out of the real adapter path.
export const api: AddendumMochiApi = import.meta.env.VITE_USE_MOCK === 'true'
  ? (await import('./mockApi')).mockApi
  : httpApi;

export const { getState, onboard, updateLetter, submitDecision, recordSavings, feedPet, completeQuest, demoSeed, demoReset,
  updatePreferences, getBudgets, updateBudgets, getTransactions, recordTransaction,
  getInsights, getDueReflections, reflect, getLessons, answerLesson, getDailyReport, checkIn,
} = api;
