import type { ErrorRequestHandler } from 'express';
import type { ApiErrorResponse } from '@app/shared';

interface ErrorWithCode extends Error {
  code?: string;
}

export const errorHandler: ErrorRequestHandler = (err: ErrorWithCode, _req, res, _next) => {
  console.error('Unhandled request error', {
    name: err.name,
    code: err.code,
    message: err.message,
    stack: err.stack,
  });

  const body: ApiErrorResponse = {
    error: {
      code: 'internal_error',
      message: 'Unexpected server error',
    },
  };

  res.status(500).json(body);
};
