import { Router } from 'express';
import type { HealthResponse } from '@app/shared';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const body: HealthResponse = {
    status: 'ok',
    service: 'api',
    timestamp: new Date().toISOString(),
  };

  res.json(body);
});
