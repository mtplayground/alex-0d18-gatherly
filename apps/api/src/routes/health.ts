import { Router } from 'express';
import type { HealthResponse } from '@app/shared';
import type { Pool } from 'pg';

export function createHealthRouter(pool: Pool): Router {
  const healthRouter = Router();

  healthRouter.get('/', async (_req, res, next) => {
    try {
      await pool.query('select 1');

      const body: HealthResponse = {
        status: 'ok',
        service: 'api',
        database: {
          status: 'ok',
        },
        timestamp: new Date().toISOString(),
      };

      res.json(body);
    } catch (err) {
      next(err);
    }
  });

  return healthRouter;
}
