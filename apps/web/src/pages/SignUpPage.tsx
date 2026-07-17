import type { UserRole } from '@app/shared';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { frontendUrl, platformAuthPath, redirectToPlatformAuth } from '../auth/redirects';

const pendingRoleKey = 'pending-signup-role';
const userRoles: readonly UserRole[] = ['Organizer', 'Member'];

function isRole(value: string | null): value is UserRole {
  return userRoles.includes(value as UserRole);
}

function readPendingRole(): UserRole {
  const query = new URLSearchParams(window.location.search);
  const queryRole = query.get('role');
  if (isRole(queryRole)) {
    return queryRole;
  }

  const storedRole = window.localStorage.getItem(pendingRoleKey);
  if (isRole(storedRole)) {
    return storedRole;
  }

  return 'Member';
}

export function SignUpPage() {
  const { error, status, user, updateRole } = useAuth();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(() => readPendingRole());
  const [roleSaveState, setRoleSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const returnTo = useMemo(() => frontendUrl(`/signup?role=${encodeURIComponent(role)}`), [role]);
  const registerPath = useMemo(() => platformAuthPath('register', returnTo), [returnTo]);
  const selectedRole = useMemo(() => {
    const queryRole = searchParams.get('role');
    return isRole(queryRole) ? queryRole : role;
  }, [role, searchParams]);

  useEffect(() => {
    window.localStorage.setItem(pendingRoleKey, role);
  }, [role]);

  useEffect(() => {
    if (status !== 'authenticated' || !user) {
      return;
    }

    if (user.role === selectedRole) {
      window.localStorage.removeItem(pendingRoleKey);
      setRoleSaveState('saved');
      return;
    }

    let isCurrent = true;
    setRoleSaveState('saving');
    updateRole(selectedRole)
      .then(() => {
        if (isCurrent) {
          window.localStorage.removeItem(pendingRoleKey);
          setRoleSaveState('saved');
        }
      })
      .catch(() => {
        if (isCurrent) {
          setRoleSaveState('error');
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedRole, status, updateRole, user]);

  function beginRegistration(endpoint: 'register' | 'google') {
    window.localStorage.setItem(pendingRoleKey, role);
    redirectToPlatformAuth(endpoint, returnTo);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    beginRegistration('register');
  }

  async function retryRoleSave() {
    setRoleSaveState('saving');
    try {
      await updateRole(selectedRole);
      window.localStorage.removeItem(pendingRoleKey);
      setRoleSaveState('saved');
    } catch {
      setRoleSaveState('error');
    }
  }

  return (
    <main className="auth-page auth-page--signup">
      <section className="auth-visual" aria-label="Outdoor gathering">
        <img
          src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=82"
          alt="Guests celebrating outside with lights and raised glasses"
        />
      </section>
      <section className="auth-panel" aria-labelledby="signup-title">
        <div className="auth-panel__header">
          <p className="eyebrow">Start planning</p>
          <h1 id="signup-title">Create your event account</h1>
          <p className="summary">
            Choose how you plan to join the next gathering, then continue with secure account
            creation.
          </p>
        </div>

        {error ? (
          <div className="inline-alert" role="status">
            {error}
          </div>
        ) : null}

        {status === 'authenticated' && user ? (
          <div className="auth-status">
            <span className="auth-status__label">
              {roleSaveState === 'saving' ? 'Saving role' : 'Registration ready'}
            </span>
            <strong>{user.name ?? user.email}</strong>
            <span className="role-pill">{selectedRole}</span>
            {roleSaveState === 'error' ? (
              <>
                <div className="inline-alert" role="status">
                  We could not save that role. Try again before opening the workspace.
                </div>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => void retryRoleSave()}
                >
                  Save role again
                </button>
              </>
            ) : (
              <Link className="button button--primary" to="/">
                Open workspace
              </Link>
            )}
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>Name</span>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <fieldset className="role-field">
              <legend>Role</legend>
              <div className="role-options">
                {userRoles.map((option) => (
                  <label key={option} className="role-option">
                    <input
                      type="radio"
                      name="role"
                      value={option}
                      checked={role === option}
                      onChange={() => setRole(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="button button--primary" type="submit">
              Create account
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => beginRegistration('google')}
            >
              Continue with Google
            </button>
            <p className="auth-switch">
              Already have an account? <Link to="/signin">Sign in</Link>
            </p>
          </form>
        )}

        <a className="auth-fallback" href={registerPath}>
          Continue through secure sign-up
        </a>
      </section>
    </main>
  );
}
