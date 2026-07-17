import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { frontendUrl, platformAuthPath, redirectToPlatformAuth } from '../auth/redirects';

export function SignInPage() {
  const { status, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const returnTo = useMemo(() => frontendUrl('/'), []);
  const loginPath = useMemo(() => platformAuthPath('login', returnTo), [returnTo]);
  const googlePath = useMemo(() => platformAuthPath('google', returnTo), [returnTo]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    redirectToPlatformAuth('login', returnTo);
  }

  return (
    <main className="auth-page">
      <section className="auth-visual" aria-label="Event table">
        <img
          src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1400&q=82"
          alt="Friends gathered around a dinner table with warm lights"
        />
      </section>
      <section className="auth-panel" aria-labelledby="signin-title">
        <div className="auth-panel__header">
          <p className="eyebrow">Welcome back</p>
          <h1 id="signin-title">Sign in to your event workspace</h1>
          <p className="summary">
            Pick up the plans, photos, and guest details you already started.
          </p>
        </div>

        {status === 'authenticated' && user ? (
          <div className="auth-status">
            <span className="auth-status__label">Signed in</span>
            <strong>{user.name ?? user.email}</strong>
            <Link className="button button--primary" to="/">
              Open workspace
            </Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
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
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <button className="button button--primary" type="submit">
              Sign in
            </button>
            <a className="button button--secondary" href={googlePath}>
              Continue with Google
            </a>
            <Link className="auth-fallback" to="/forgot-password">
              Forgot password?
            </Link>
            <p className="auth-switch">
              New here? <Link to="/signup">Create an account</Link>
            </p>
          </form>
        )}

        <a className="auth-fallback" href={loginPath}>
          Continue through secure sign-in
        </a>
      </section>
    </main>
  );
}
