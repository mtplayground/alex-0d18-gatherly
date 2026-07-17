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

export const USER_ROLES = ['Organizer', 'Member'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface UserProfile {
  sub: string;
  email: string;
  name: string | null;
  profilePhotoKey: string | null;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
}

export interface AuthLoginUrlResponse {
  loginUrl: string;
}

export interface AuthSessionResponse {
  user: UserProfile;
  registration: 'created' | 'returning';
}
