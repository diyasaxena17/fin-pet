import express from 'express';
import type { ErrorRequestHandler } from 'express';
import type { ApiErrorResponse, HealthResponse } from '@mochi/contracts';
import { createApiRouter } from './routes/index.js';

export function createApp(options: { demoMode?: boolean } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' } satisfies HealthResponse);
  });
  app.use('/api', createApiRouter(options.demoMode ?? true));
  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } } satisfies ApiErrorResponse);
  });
  const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const invalidJson = error instanceof SyntaxError && 'status' in error && error.status === 400;
    res.status(invalidJson ? 400 : 500).json({
      error: { code: invalidJson ? 'INVALID_REQUEST' : 'INTERNAL_ERROR', message: invalidJson ? 'Invalid JSON body' : 'Internal server error' },
    } satisfies ApiErrorResponse);
  };
  app.use(errorHandler);
  return app;
}
