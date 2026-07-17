import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setMessage(null);

    try {
      const result = await requestPasswordReset(email);
      if (result.status === 'email_not_configured') {
        setStatus('sent');
        setMessage('Email delivery is not configured yet.');
        return;
      }

      setStatus('sent');
      setMessage('If an account exists for that email, a reset link has been sent.');
    } catch (err) {
      const nextMessage = err instanceof Error ? err.message : 'Unable to request password reset.';
      setStatus('error');
      setMessage(nextMessage);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual" aria-label="Password reset request">
        <img
          src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=82"
          alt="Laptop on a table with notes and warm light"
        />
      </section>
      <section className="auth-panel" aria-labelledby="forgot-title">
        <div className="auth-panel__header">
          <p className="eyebrow">Password reset</p>
          <h1 id="forgot-title">Request a reset link</h1>
          <p className="summary">Enter the email attached to your account.</p>
        </div>

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
          <button className="button button--primary" type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending' : 'Send reset link'}
          </button>
          <Link className="button button--secondary" to="/signin">
            Back to sign in
          </Link>
        </form>

        {message ? (
          <div className={status === 'error' ? 'inline-alert' : 'success-alert'} role="status">
            {message}
          </div>
        ) : null}
      </section>
    </main>
  );
}
