export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface HealthResponse {
  status: 'ok';
  service: 'api';
  timestamp: string;
}

export type ApiResult<T> = T | ApiErrorResponse;
