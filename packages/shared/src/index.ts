export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface HealthResponse {
  status: 'ok';
  service: 'api';
  database: {
    status: 'ok';
  };
  timestamp: string;
}

export type ApiResult<T> = T | ApiErrorResponse;
