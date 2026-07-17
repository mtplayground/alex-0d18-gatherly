import type { AuthenticatedRequestContext } from '../middleware/authMiddleware';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthenticatedRequestContext;
  }
}

export {};
