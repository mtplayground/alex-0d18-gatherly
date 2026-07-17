import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { healthRouter } from './routes/health';
import { errorHandler } from './middleware/errorHandler';

export interface CreateAppOptions {
  clientDistDir?: string;
}

function resolveClientDistDir(configuredDir: string | undefined): string {
  return configuredDir ?? path.resolve(__dirname, '../../web/dist');
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const clientDistDir = resolveClientDistDir(options.clientDistDir);

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/health', healthRouter);

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
