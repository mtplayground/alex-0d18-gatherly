import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Pool } from 'pg';
import type { AuthConfig, EmailConfig, ObjectStorageConfig } from './config';
import { createAuthRouter } from './routes/auth';
import { createEventsRouter } from './routes/events';
import { createHealthRouter } from './routes/health';
import { errorHandler } from './middleware/errorHandler';

export interface CreateAppOptions {
  databasePool: Pool;
  auth?: AuthConfig;
  email?: EmailConfig;
  objectStorage: ObjectStorageConfig;
  selfUrl: string;
  clientDistDir?: string;
}

function resolveClientDistDir(configuredDir: string | undefined): string {
  return configuredDir ?? path.resolve(__dirname, '../../web/dist');
}

export function createApp(options: CreateAppOptions) {
  const app = express();
  const clientDistDir = resolveClientDistDir(options.clientDistDir);

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  app.use(
    '/api/auth',
    createAuthRouter({
      databasePool: options.databasePool,
      objectStorage: options.objectStorage,
      selfUrl: options.selfUrl,
      ...(options.auth ? { auth: options.auth } : {}),
      ...(options.email ? { email: options.email } : {}),
    }),
  );
  app.use(
    '/api/events',
    createEventsRouter({
      databasePool: options.databasePool,
      objectStorage: options.objectStorage,
      selfUrl: options.selfUrl,
      ...(options.auth ? { auth: options.auth } : {}),
      ...(options.email ? { email: options.email } : {}),
    }),
  );
  app.use('/api/health', createHealthRouter(options.databasePool));

  if (existsSync(clientDistDir)) {
    app.use(express.static(clientDistDir, { index: false }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }

      res.sendFile(path.join(clientDistDir, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}
