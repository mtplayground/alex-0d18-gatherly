import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

type ResetState = 'idle' | 'confirming' | 'confirmed' | 'error';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const { confirmPasswordReset } = useAuth();
  const [token, setToken] = useState(() => searchParams.get('token') ?? '');
  const [state, setState] = useState<ResetState>(token ? 'confirming' : 'idle');
  const [message, setMessage] = useState<string | null>(null);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const attemptedTokenRef = useRef<string | null>(null);

  const confirmReset = useCallback(
    async (nextToken: string) => {
      const trimmedToken = nextToken.trim();
      if (!trimmedToken) {
        setState('error');
        setMessage('Reset token is required.');
        return;
      }

      setState('confirming');
      setMessage(null);
      setLoginUrl(null);

      try {
        const result = await confirmPasswordReset(trimmedToken);
        setState('confirmed');
        setMessage('Reset link confirmed.');
        setLoginUrl(result.loginUrl);
      } catch (err) {
        const nextMessage = err instanceof Error ? err.message : 'Password reset failed.';
        setState('error');
        setMessage(nextMessage);
      }
    },
    [confirmPasswordReset],
  );

  useEffect(() => {
    const queryToken = searchParams.get('token');
    if (queryToken && attemptedTokenRef.current !== queryToken) {
      attemptedTokenRef.current = queryToken;
      setToken(queryToken);
      void confirmReset(queryToken);
    }
  }, [confirmReset, searchParams]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void confirmReset(token);
  }

  return (
    <main className="auth-page">
      <section className="auth-visual" aria-label="Password reset confirmation">
        <img
          src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=82"
          alt="Bright workspace with a long table and chairs"
        />
      </section>
      <section className="auth-panel" aria-labelledby="reset-title">
        <div className="auth-panel__header">
          <p className="eyebrow">Password reset</p>
          <h1 id="reset-title">Confirm reset link</h1>
          <p className="summary">Use the email link to continue through secure sign-in.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Reset token</span>
            <input
              type="text"
              autoComplete="one-time-code"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
            />
          </label>
          <button
            className="button button--primary"
            type="submit"
            disabled={state === 'confirming'}
          >
            {state === 'confirming' ? 'Confirming' : 'Confirm reset'}
          </button>
          {loginUrl ? (
            <a className="button button--secondary" href={loginUrl}>
              Continue to secure sign-in
            </a>
          ) : (
            <Link className="button button--secondary" to="/forgot-password">
              Request a new link
            </Link>
          )}
        </form>

        {message ? (
          <div className={state === 'confirmed' ? 'success-alert' : 'inline-alert'} role="status">
            {message}
          </div>
        ) : null}
      </section>
    </main>
  );
}
