import type {
  AuthSessionResponse,
  UpdateCurrentUserRequest,
  UserProfile,
  UserRole,
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
  refreshSession: () => Promise<void>;
  updateRole: (role: UserRole) => Promise<UserProfile>;
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

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      registration,
      error,
      refreshSession,
      updateRole,
    }),
    [error, refreshSession, registration, status, updateRole, user],
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
