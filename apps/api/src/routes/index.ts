import { Router } from 'express';
import {
  onboardingSchema, letterInputSchema, decisionSchema, savingsSchema,
  feedSchema, questSchema, demoSeedSchema, demoResetSchema,
} from '@mochi/contracts';
import type { createStateService } from '../services/state.js';

export function createApiRouter(service: ReturnType<typeof createStateService>, demoMode: boolean) {
  const router = Router();
  router.get('/state', async (_req, res) => { res.json(await service.getState()); });
  router.post('/onboarding', async (req, res) => { res.json(await service.dispatch({ type: 'onboard', input: onboardingSchema.parse(req.body) })); });
  router.put('/letter', async (req, res) => { res.json(await service.dispatch({ type: 'letter', input: letterInputSchema.parse(req.body) })); });
  router.post('/decisions', async (req, res) => { res.json(await service.dispatch({ type: 'decision', input: decisionSchema.parse(req.body) })); });
  router.post('/savings', async (req, res) => { res.json(await service.dispatch({ type: 'savings', input: savingsSchema.parse(req.body) })); });
  router.post('/feed', async (req, res) => { res.json(await service.dispatch({ type: 'feed', input: feedSchema.parse(req.body) })); });
  router.post('/quests/complete', async (req, res) => { res.json(await service.dispatch({ type: 'quest', input: questSchema.parse(req.body) })); });
  if (demoMode) {
    router.post('/demo/seed', async (req, res) => { res.json(await service.dispatch({ type: 'seed', input: demoSeedSchema.parse(req.body) })); });
    router.post('/demo/reset', async (req, res) => {
      demoResetSchema.parse(req.body);
      res.json(await service.dispatch({ type: 'reset' }));
    });
  }
  return router;
}
