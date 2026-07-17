import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

type VerifyState = 'idle' | 'verifying' | 'verified' | 'error';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { verifyEmail } = useAuth();
  const [token, setToken] = useState(() => searchParams.get('token') ?? '');
  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'idle');
  const [message, setMessage] = useState<string | null>(null);
  const attemptedTokenRef = useRef<string | null>(null);

  const confirmEmail = useCallback(
    async (nextToken: string) => {
      const trimmedToken = nextToken.trim();
      if (!trimmedToken) {
        setState('error');
        setMessage('Verification token is required.');
        return;
      }

      setState('verifying');
      setMessage(null);

      try {
        await verifyEmail(trimmedToken);
        setState('verified');
        setMessage('Email verified.');
      } catch (err) {
        const nextMessage = err instanceof Error ? err.message : 'Verification failed.';
        setState('error');
        setMessage(nextMessage);
      }
    },
    [verifyEmail],
  );

  useEffect(() => {
    const queryToken = searchParams.get('token');
    if (queryToken && attemptedTokenRef.current !== queryToken) {
      attemptedTokenRef.current = queryToken;
      setToken(queryToken);
      void confirmEmail(queryToken);
    }
  }, [confirmEmail, searchParams]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void confirmEmail(token);
  }

  return (
    <main className="auth-page">
      <section className="auth-visual" aria-label="Email confirmation">
        <img
          src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=82"
          alt="People working together at a table with laptops and coffee"
        />
      </section>
      <section className="auth-panel" aria-labelledby="verify-title">
        <div className="auth-panel__header">
          <p className="eyebrow">Email verification</p>
          <h1 id="verify-title">Confirm your email</h1>
          <p className="summary">Finish verification to open the full event workspace.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Verification token</span>
            <input
              type="text"
              autoComplete="one-time-code"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
            />
          </label>
          <button className="button button--primary" type="submit" disabled={state === 'verifying'}>
            {state === 'verifying' ? 'Verifying' : 'Verify email'}
          </button>
          <Link className="button button--secondary" to="/">
            Return to workspace
          </Link>
        </form>

        {message ? (
          <div className={state === 'verified' ? 'success-alert' : 'inline-alert'} role="status">
            {message}
          </div>
        ) : null}
      </section>
    </main>
  );
}
