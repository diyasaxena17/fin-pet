import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { z } from 'zod';
import type { ApiErrorResponse, HealthResponse } from '@mochi/contracts';
import { DomainError } from '@mochi/domain';
import { createApiRouter } from './routes/index.js';
import { createMemoryRepository, type StateRepository } from './persistence/repository.js';
import { createStateService } from './services/state.js';

export function createApp(options: { demoMode?: boolean; repository?: StateRepository; clock?: () => Date; timeZone?: string } = {}) {
  const app = express();
  const service = createStateService(options.repository ?? createMemoryRepository(), options);
  app.disable('x-powered-by');
  app.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use(express.json({ limit: '128kb' }));
  app.get('/health', (_req, res) => { res.json({ ok: true } satisfies HealthResponse); });
  app.use('/api', createApiRouter(service, options.demoMode ?? false));
  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } } satisfies ApiErrorResponse);
  });
  const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (error instanceof DomainError) {
      res.status(error.status).json({ error: { code: error.code, message: error.message } } satisfies ApiErrorResponse);
      return;
    }
    const invalidBody = error instanceof Error && 'status' in error && (error.status === 400 || error.status === 413);
    if (error instanceof z.ZodError || invalidBody) {
      res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Request does not match the API contract.' } } satisfies ApiErrorResponse);
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unable to save this action. Please retry with the same request ID.' } } satisfies ApiErrorResponse);
  };
  app.use(errorHandler);
  return app;
}
