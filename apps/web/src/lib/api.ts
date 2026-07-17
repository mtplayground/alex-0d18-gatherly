import type { ApiErrorResponse } from '@app/shared';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== 'object' || !('error' in value)) {
    return false;
  }

  const error = (value as ApiErrorResponse).error;
  return Boolean(error && typeof error.code === 'string' && typeof error.message === 'string');
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isFormData = init.body instanceof FormData;
  const res = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  const contentType = res.headers.get('content-type') ?? '';
  const payload: unknown = contentType.includes('application/json') ? await res.json() : undefined;

  if (!res.ok) {
    if (isApiErrorResponse(payload)) {
      throw new ApiRequestError(payload.error.message, res.status, payload.error.code);
    }

    throw new ApiRequestError(`Request failed with status ${res.status}`, res.status, 'http_error');
  }

  return payload as T;
}
