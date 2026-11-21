import { Router } from 'express';
import type { ApiErrorResponse } from '@mochi/contracts';
import { getDeviceState, getState } from '../services/state.js';

export function createApiRouter(demoMode: boolean) {
  const router = Router();
  router.get('/state', (_req, res) => res.json(getState()));
  router.get('/device/state', (_req, res) => res.json(getDeviceState()));

  // Reserve the frozen routes; the backend owner implements mutations next.
  for (const [method, route] of [
    ['post', '/onboard'], ['put', '/letter'], ['post', '/decisions'],
    ['post', '/savings'], ['post', '/pet/feed'], ['post', '/quests/complete'],
    ['post', '/demo/seed'],
  ] as const) {
    router[method](route, (_req, res) => {
      if (route === '/demo/seed' && !demoMode) {
        res.status(403).json({ error: { code: 'DEMO_DISABLED', message: 'Demo mode is disabled' } } satisfies ApiErrorResponse);
        return;
      }
      res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Mutation is reserved for the backend implementation' } } satisfies ApiErrorResponse);
    });
  }
  return router;
}
