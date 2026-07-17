import type { Request } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import type { AuthConfig } from '../config';

export interface MctaiSessionClaims {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

function readSessionCookie(req: Request): string | undefined {
  const value = req.cookies?.mctai_session;
  return typeof value === 'string' && value ? value : undefined;
}

function toSessionClaims(decoded: string | JwtPayload): MctaiSessionClaims | null {
  if (!decoded || typeof decoded === 'string') {
    return null;
  }

  if (typeof decoded.sub !== 'string' || typeof decoded.email !== 'string') {
    return null;
  }

  return {
    sub: decoded.sub,
    email: decoded.email,
    emailVerified: decoded.email_verified === true,
    name: typeof decoded.name === 'string' && decoded.name ? decoded.name : null,
    picture: typeof decoded.picture === 'string' && decoded.picture ? decoded.picture : null,
  };
}

export function createSessionVerifier(auth: AuthConfig) {
  const jwks = jwksClient({ jwksUri: auth.jwksUrl });

  return async function verifySession(req: Request): Promise<MctaiSessionClaims | null> {
    const token = readSessionCookie(req);
    if (!token) {
      return null;
    }

    try {
      const decoded = await new Promise<string | JwtPayload>((resolve, reject) => {
        jwt.verify(
          token,
          (header, callback) => {
            if (!header.kid) {
              callback(new Error('Session token missing key id'));
              return;
            }

            jwks
              .getSigningKey(header.kid)
              .then((key) => {
                callback(null, key.getPublicKey());
              })
              .catch((err: unknown) => {
                callback(err instanceof Error ? err : new Error('Unable to load signing key'));
              });
          },
          {
            audience: auth.appToken,
            issuer: auth.url,
          },
          (err, claims) => {
            if (err) {
              reject(err);
              return;
            }

            if (!claims) {
              reject(new Error('Session token missing claims'));
              return;
            }

            resolve(claims);
          },
        );
      });

      return toSessionClaims(decoded);
    } catch {
      return null;
    }
  };
}
