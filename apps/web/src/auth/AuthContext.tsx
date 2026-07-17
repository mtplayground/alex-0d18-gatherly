import type {
  AuthSessionResponse,
  PasswordResetConfirmRequest,
  PasswordResetConfirmResponse,
  PasswordResetRequest,
  PasswordResetRequestResponse,
  ProfilePhotoUploadResponse,
  UpdateCurrentUserRequest,
  UserProfile,
  UserRole,
  VerificationEmailResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from '@app/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiRequest, ApiRequestError } from '../lib/api';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: UserProfile | null;
  registration: AuthSessionResponse['registration'] | null;
  error: string | null;
  confirmPasswordReset: (token: string) => Promise<PasswordResetConfirmResponse>;
  refreshSession: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<PasswordResetRequestResponse>;
  requestVerificationEmail: () => Promise<VerificationEmailResponse>;
  updateRole: (role: UserRole) => Promise<UserProfile>;
  uploadProfilePhoto: (file: File) => Promise<UserProfile>;
  verifyEmail: (token: string) => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [registration, setRegistration] = useState<AuthSessionResponse['registration'] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const applySession = useCallback((session: AuthSessionResponse) => {
    setUser(session.user);
    setRegistration(session.registration);
    setStatus('authenticated');
    setError(null);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const session = await apiRequest<AuthSessionResponse>('/api/auth/me');
      applySession(session);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        setUser(null);
        setRegistration(null);
        setStatus('anonymous');
        setError(null);
        return;
      }

      const message = err instanceof Error ? err.message : 'Unable to load session';
      setUser(null);
      setRegistration(null);
      setStatus('anonymous');
      setError(message);
    }
  }, [applySession]);

  const updateRole = useCallback(
    async (role: UserRole) => {
      const payload: UpdateCurrentUserRequest = { role };
      const session = await apiRequest<AuthSessionResponse>('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      applySession(session);
      return session.user;
    },
    [applySession],
  );

  const requestVerificationEmail = useCallback(async () => {
    return apiRequest<VerificationEmailResponse>('/api/auth/verification-email', {
      method: 'POST',
    });
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const payload: PasswordResetRequest = { email };
    return apiRequest<PasswordResetRequestResponse>('/api/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }, []);

  const confirmPasswordReset = useCallback(async (token: string) => {
    const payload: PasswordResetConfirmRequest = { token };
    return apiRequest<PasswordResetConfirmResponse>('/api/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }, []);

  const uploadProfilePhoto = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.set('photo', file);
    const response = await apiRequest<ProfilePhotoUploadResponse>('/api/auth/me/profile-photo', {
      method: 'POST',
      body: formData,
    });

    setUser(response.user);
    setStatus('authenticated');
    setError(null);

    return response.user;
  }, []);

  const verifyEmail = useCallback(
    async (token: string) => {
      const payload: VerifyEmailRequest = { token };
      const response = await apiRequest<VerifyEmailResponse>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      await refreshSession();

      return response.user;
    },
    [refreshSession],
  );

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      registration,
      error,
      confirmPasswordReset,
      refreshSession,
      requestPasswordReset,
      requestVerificationEmail,
      updateRole,
      uploadProfilePhoto,
      verifyEmail,
    }),
    [
      error,
      confirmPasswordReset,
      refreshSession,
      registration,
      requestPasswordReset,
      requestVerificationEmail,
      status,
      updateRole,
      uploadProfilePhoto,
      user,
      verifyEmail,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
