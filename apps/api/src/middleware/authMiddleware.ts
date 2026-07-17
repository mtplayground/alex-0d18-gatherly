import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Pool } from 'pg';
import type { AuthConfig } from '../config';
import { createSessionVerifier, type MctaiSessionClaims } from '../auth/session';
import type { UserRecord } from '../users/userModel';
import { upsertAuthenticatedUser } from '../users/userRepository';

export interface AuthenticatedRequestContext {
  claims: MctaiSessionClaims;
  user: UserRecord;
  registration: 'created' | 'returning';
}

export interface AuthMiddlewareOptions {
  auth?: AuthConfig;
  databasePool: Pool;
}

export interface AuthMiddlewareSet {
  optionalAuth: RequestHandler;
  requireAuth: RequestHandler;
}

export function createAuthMiddleware(options: AuthMiddlewareOptions): AuthMiddlewareSet {
  const verifySession = options.auth ? createSessionVerifier(options.auth) : undefined;

  async function authenticate(req: Request): Promise<AuthenticatedRequestContext | null> {
    if (!verifySession) {
      return null;
    }

    const claims = await verifySession(req);
    if (!claims) {
      return null;
    }

    const result = await upsertAuthenticatedUser(options.databasePool, claims);
    return {
      claims,
      user: result.user,
      registration: result.registration,
    };
  }

  async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await authenticate(req);
      if (context) {
        req.auth = context;
      }

      next();
    } catch (err) {
      next(err);
    }
  }

  async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!options.auth || !verifySession) {
      res
        .status(503)
        .json({ error: { code: 'auth_not_configured', message: 'Auth is not configured' } });
      return;
    }

    try {
      const context = await authenticate(req);
      if (!context) {
        res
          .status(401)
          .json({ error: { code: 'not_authenticated', message: 'Not authenticated' } });
        return;
      }

      req.auth = context;
      next();
    } catch (err) {
      next(err);
    }
  }

  return {
    optionalAuth,
    requireAuth,
  };
}
