import { Router } from 'express';
import type { AuthLoginUrlResponse, AuthSessionResponse } from '@app/shared';
import type { Pool } from 'pg';
import type { AuthConfig } from '../config';
import { createSessionVerifier } from '../auth/session';
import { toUserProfile } from '../users/userModel';
import { upsertAuthenticatedUser } from '../users/userRepository';

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

export function createAuthRouter(options: CreateAuthRouterOptions): Router {
  const router = Router();
  const verifySession = options.auth ? createSessionVerifier(options.auth) : undefined;

  router.get('/login-url', (req, res) => {
    if (!options.auth || !verifySession) {
      res
        .status(503)
        .json({ error: { code: 'auth_not_configured', message: 'Auth is not configured' } });
      return;
    }

    const returnTo = resolveReturnTo(options.selfUrl, firstQueryValue(req.query.return_to));
    const body: AuthLoginUrlResponse = {
      loginUrl: buildLoginUrl(options.auth, returnTo),
    };

    res.json(body);
  });

  router.get('/login', (req, res) => {
    if (!options.auth) {
      res
        .status(503)
        .json({ error: { code: 'auth_not_configured', message: 'Auth is not configured' } });
      return;
    }

    const returnTo = resolveReturnTo(options.selfUrl, firstQueryValue(req.query.return_to));
    res.redirect(buildLoginUrl(options.auth, returnTo));
  });

  router.get('/register', (req, res) => {
    if (!options.auth) {
      res
        .status(503)
        .json({ error: { code: 'auth_not_configured', message: 'Auth is not configured' } });
      return;
    }

    const returnTo = resolveReturnTo(options.selfUrl, firstQueryValue(req.query.return_to));
    res.redirect(buildLoginUrl(options.auth, returnTo));
  });

  router.get('/me', async (req, res, next) => {
    const sessionVerifier = verifySession;
    if (!options.auth || !sessionVerifier) {
      res
        .status(503)
        .json({ error: { code: 'auth_not_configured', message: 'Auth is not configured' } });
      return;
    }

    try {
      const claims = await sessionVerifier(req);
      if (!claims) {
        res
          .status(401)
          .json({ error: { code: 'not_authenticated', message: 'Not authenticated' } });
        return;
      }

      const result = await upsertAuthenticatedUser(options.databasePool, claims);
      const body: AuthSessionResponse = {
        user: toUserProfile(result.user),
        registration: result.registration,
      };

      res.json(body);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
