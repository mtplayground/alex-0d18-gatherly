import { Router } from 'express';
import type { Response } from 'express';
import type { AuthLoginUrlResponse, AuthSessionResponse } from '@app/shared';
import type { Pool } from 'pg';
import type { AuthConfig } from '../config';
import { createAuthMiddleware } from '../middleware/authMiddleware';
import { toUserProfile } from '../users/userModel';

export interface CreateAuthRouterOptions {
  auth?: AuthConfig;
  databasePool: Pool;
  selfUrl: string;
}

function firstQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return undefined;
}

function resolveReturnTo(selfUrl: string, rawReturnTo: string | undefined): string {
  const fallback = new URL('/', selfUrl).toString();
  if (!rawReturnTo) {
    return fallback;
  }

  try {
    const candidate = new URL(rawReturnTo, selfUrl);
    const ownOrigin = new URL(selfUrl).origin;

    if (candidate.origin !== ownOrigin || candidate.pathname.startsWith('/api/')) {
      return fallback;
    }

    return candidate.toString();
  } catch {
    return fallback;
  }
}

function buildLoginUrl(auth: AuthConfig, returnTo: string): string {
  const loginUrl = new URL('/login', auth.url);
  loginUrl.searchParams.set('app_token', auth.appToken);
  loginUrl.searchParams.set('return_to', returnTo);

  return loginUrl.toString();
}

function sendLoginUrlResponse(
  auth: AuthConfig,
  selfUrl: string,
  rawReturnTo: string | undefined,
  res: Response,
) {
  const returnTo = resolveReturnTo(selfUrl, rawReturnTo);
  const body: AuthLoginUrlResponse = {
    loginUrl: buildLoginUrl(auth, returnTo),
  };

  res.json(body);
}

function redirectToLogin(
  auth: AuthConfig,
  selfUrl: string,
  rawReturnTo: string | undefined,
  res: Response,
) {
  const returnTo = resolveReturnTo(selfUrl, rawReturnTo);
  res.redirect(buildLoginUrl(auth, returnTo));
}

export function createAuthRouter(options: CreateAuthRouterOptions): Router {
  const router = Router();
  const { requireAuth } = createAuthMiddleware({
    databasePool: options.databasePool,
    ...(options.auth ? { auth: options.auth } : {}),
  });

  router.get('/login-url', (req, res) => {
    if (!options.auth) {
      res
        .status(503)
        .json({ error: { code: 'auth_not_configured', message: 'Auth is not configured' } });
      return;
    }

    sendLoginUrlResponse(options.auth, options.selfUrl, firstQueryValue(req.query.return_to), res);
  });

  router.get('/google-url', (req, res) => {
    if (!options.auth) {
      res
        .status(503)
        .json({ error: { code: 'auth_not_configured', message: 'Auth is not configured' } });
      return;
    }

    sendLoginUrlResponse(options.auth, options.selfUrl, firstQueryValue(req.query.return_to), res);
  });

  router.get('/login', (req, res) => {
    if (!options.auth) {
      res
        .status(503)
        .json({ error: { code: 'auth_not_configured', message: 'Auth is not configured' } });
      return;
    }

    redirectToLogin(options.auth, options.selfUrl, firstQueryValue(req.query.return_to), res);
  });

  router.get('/register', (req, res) => {
    if (!options.auth) {
      res
        .status(503)
        .json({ error: { code: 'auth_not_configured', message: 'Auth is not configured' } });
      return;
    }

    redirectToLogin(options.auth, options.selfUrl, firstQueryValue(req.query.return_to), res);
  });

  router.get('/google', (req, res) => {
    if (!options.auth) {
      res
        .status(503)
        .json({ error: { code: 'auth_not_configured', message: 'Auth is not configured' } });
      return;
    }

    redirectToLogin(options.auth, options.selfUrl, firstQueryValue(req.query.return_to), res);
  });

  router.get('/me', requireAuth, (req, res, next) => {
    try {
      if (!req.auth) {
        next(new Error('Authenticated route missing auth context'));
        return;
      }

      const body: AuthSessionResponse = {
        user: toUserProfile(req.auth.user),
        registration: req.auth.registration,
      };

      res.json(body);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
