import { Router } from 'express';
import type { Response } from 'express';
import type {
  AuthLoginUrlResponse,
  AuthSessionResponse,
  PasswordResetConfirmRequest,
  PasswordResetConfirmResponse,
  PasswordResetRequest,
  PasswordResetRequestResponse,
  VerificationEmailResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  UpdateCurrentUserRequest,
} from '@app/shared';
import type { Pool } from 'pg';
import type { AuthConfig, EmailConfig } from '../config';
import {
  consumeEmailVerificationToken,
  createEmailVerificationToken,
} from '../auth/emailVerificationRepository';
import { sendVerificationEmail } from '../auth/emailVerificationEmail';
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  findUserByEmail,
} from '../auth/passwordResetRepository';
import { sendPasswordResetEmail } from '../auth/passwordResetEmail';
import { createAuthMiddleware } from '../middleware/authMiddleware';
import { EmailSendError } from '../email/emailClient';
import { isUserRole, toUserProfile } from '../users/userModel';
import type { UserRecord } from '../users/userModel';
import { updateAuthenticatedUserRole } from '../users/userRepository';

export interface CreateAuthRouterOptions {
  auth?: AuthConfig;
  databasePool: Pool;
  email?: EmailConfig;
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

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) {
    return null;
  }

  return trimmed;
}

async function requestVerificationEmail(
  options: CreateAuthRouterOptions,
  user: UserRecord,
): Promise<VerificationEmailResponse> {
  if (user.emailVerified) {
    return {
      status: 'already_verified',
      expiresAt: null,
    };
  }

  if (!options.email) {
    return {
      status: 'email_not_configured',
      expiresAt: null,
    };
  }

  const token = await createEmailVerificationToken(options.databasePool, user.sub, user.email);
  const status = await sendVerificationEmail(options.email, options.selfUrl, user, token.token);

  return {
    status,
    expiresAt: token.expiresAt.toISOString(),
  };
}

async function requestPasswordReset(
  options: CreateAuthRouterOptions,
  email: string,
): Promise<PasswordResetRequestResponse> {
  if (!options.email) {
    return {
      status: 'email_not_configured',
      expiresAt: null,
    };
  }

  const user = await findUserByEmail(options.databasePool, email);
  if (!user) {
    return {
      status: 'sent',
      expiresAt: null,
    };
  }

  const token = await createPasswordResetToken(options.databasePool, user);
  const status = await sendPasswordResetEmail(options.email, options.selfUrl, user, token.token);

  return {
    status,
    expiresAt: token.expiresAt.toISOString(),
  };
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

  router.get('/me', requireAuth, async (req, res, next) => {
    try {
      if (!req.auth) {
        next(new Error('Authenticated route missing auth context'));
        return;
      }

      if (req.auth.registration === 'created' && !req.auth.user.emailVerified) {
        requestVerificationEmail(options, req.auth.user).catch((err: unknown) => {
          console.error('Failed to send verification email after sign-up', err);
        });
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

  router.post('/verification-email', requireAuth, async (req, res, next) => {
    try {
      if (!req.auth) {
        next(new Error('Authenticated route missing auth context'));
        return;
      }

      const body = await requestVerificationEmail(options, req.auth.user);
      res.status(body.status === 'email_not_configured' ? 202 : 200).json(body);
    } catch (err) {
      if (err instanceof EmailSendError && err.status === 429) {
        res.status(429).json({
          error: {
            code: 'email_rate_limited',
            message: 'Verification email is rate limited. Try again shortly.',
          },
        });
        return;
      }

      next(err);
    }
  });

  router.post('/verify-email', async (req, res, next) => {
    try {
      const body = req.body as Partial<VerifyEmailRequest>;
      if (typeof body.token !== 'string' || body.token.trim().length === 0) {
        res
          .status(400)
          .json({ error: { code: 'invalid_token', message: 'Verification token is required' } });
        return;
      }

      const user = await consumeEmailVerificationToken(options.databasePool, body.token);
      if (!user) {
        res.status(400).json({
          error: {
            code: 'invalid_or_expired_token',
            message: 'Verification link is invalid or expired',
          },
        });
        return;
      }

      const responseBody: VerifyEmailResponse = {
        status: 'verified',
        user: toUserProfile(user),
      };

      res.json(responseBody);
    } catch (err) {
      next(err);
    }
  });

  router.post('/password-reset/request', async (req, res, next) => {
    if (!options.auth) {
      res
        .status(503)
        .json({ error: { code: 'auth_not_configured', message: 'Auth is not configured' } });
      return;
    }

    try {
      const body = req.body as Partial<PasswordResetRequest>;
      const email = normalizeEmail(body.email);
      if (!email) {
        res.status(400).json({
          error: { code: 'invalid_email', message: 'A valid email address is required' },
        });
        return;
      }

      const responseBody = await requestPasswordReset(options, email);
      res.status(responseBody.status === 'email_not_configured' ? 202 : 200).json(responseBody);
    } catch (err) {
      if (err instanceof EmailSendError && err.status === 429) {
        res.status(429).json({
          error: {
            code: 'email_rate_limited',
            message: 'Password reset email is rate limited. Try again shortly.',
          },
        });
        return;
      }

      next(err);
    }
  });

  router.post('/password-reset/confirm', async (req, res, next) => {
    if (!options.auth) {
      res
        .status(503)
        .json({ error: { code: 'auth_not_configured', message: 'Auth is not configured' } });
      return;
    }

    try {
      const body = req.body as Partial<PasswordResetConfirmRequest>;
      if (typeof body.token !== 'string' || body.token.trim().length === 0) {
        res
          .status(400)
          .json({ error: { code: 'invalid_token', message: 'Reset token is required' } });
        return;
      }

      const reset = await consumePasswordResetToken(options.databasePool, body.token);
      if (!reset) {
        res.status(400).json({
          error: {
            code: 'invalid_or_expired_token',
            message: 'Password reset link is invalid or expired',
          },
        });
        return;
      }

      const responseBody: PasswordResetConfirmResponse = {
        status: 'confirmed',
        loginUrl: buildLoginUrl(options.auth, new URL('/', options.selfUrl).toString()),
      };

      res.json(responseBody);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/me', requireAuth, async (req, res, next) => {
    try {
      if (!req.auth) {
        next(new Error('Authenticated route missing auth context'));
        return;
      }

      const body = req.body as Partial<UpdateCurrentUserRequest>;
      if (typeof body.role !== 'string' || !isUserRole(body.role)) {
        res
          .status(400)
          .json({ error: { code: 'invalid_role', message: 'Role must be Organizer or Member' } });
        return;
      }

      const user = await updateAuthenticatedUserRole(
        options.databasePool,
        req.auth.claims.sub,
        body.role,
      );
      const responseBody: AuthSessionResponse = {
        user: toUserProfile(user),
        registration: req.auth.registration,
      };

      res.json(responseBody);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
