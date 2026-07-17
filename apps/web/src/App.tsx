import { Link } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { platformAuthPath } from './auth/redirects';
import { AppShell } from './components/ui/AppShell';
import { PhotoCard } from './components/ui/PhotoCard';
import { useState } from 'react';

const highlightedPlans = [
  {
    title: 'Rooftop supper',
    eyebrow: 'Fri 7:30 PM',
    detail: '12 guests',
    imageUrl:
      'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=82',
    imageAlt: 'Long dinner table set outdoors with warm string lights',
    tone: 'coral',
  },
  {
    title: 'Lake morning',
    eyebrow: 'Sat 9:00 AM',
    detail: '6 guests',
    imageUrl:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=82',
    imageAlt: 'People sitting near a lake at sunrise',
    tone: 'amber',
  },
  {
    title: 'Studio night',
    eyebrow: 'Sun 6:00 PM',
    detail: '18 guests',
    imageUrl:
      'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1200&q=82',
    imageAlt: 'Friends gathered around a decorated party table',
    tone: 'teal',
  },
] as const;

export function App() {
  const { status, user, registration, error, requestVerificationEmail } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [isRequestingVerification, setIsRequestingVerification] = useState(false);
  const loginPath =
    typeof window === 'undefined'
      ? '/api/auth/login'
      : platformAuthPath('login', new URL('/', window.location.origin).toString());

  if (status === 'loading') {
    return (
      <AppShell
        eyebrow="Loading"
        title="Preparing your event workspace"
        summary="Your plans, roles, and session are being checked."
      >
        <div className="loading-band" aria-live="polite">
          Checking session
        </div>
      </AppShell>
    );
  }

  if (status === 'authenticated' && user) {
    if (!user.emailVerified) {
      async function handleSendVerification() {
        setIsRequestingVerification(true);
        setVerificationStatus(null);

        try {
          const result = await requestVerificationEmail();
          if (result.status === 'email_not_configured') {
            setVerificationStatus('Email delivery is not configured yet.');
            return;
          }

          if (result.status === 'already_verified') {
            setVerificationStatus('This email is already verified.');
            return;
          }

          setVerificationStatus('Verification email sent.');
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unable to send verification email.';
          setVerificationStatus(message);
        } finally {
          setIsRequestingVerification(false);
        }
      }

      return (
        <AppShell
          eyebrow="Email verification"
          title="Confirm your email to unlock full access"
          summary={`We need to verify ${user.email} before this workspace opens.`}
          aside={
            <div className="shell-aside">
              <span className="aside-value">24h</span>
              <span className="aside-label">link window</span>
            </div>
          }
        >
          <section className="verification-panel" aria-label="Email verification">
            <div>
              <h2>Check your inbox</h2>
              <p>
                Use the verification link sent to your email address. You can request a new link any
                time.
              </p>
            </div>
            <div className="workspace-actions">
              <button
                className="button button--primary"
                type="button"
                onClick={() => void handleSendVerification()}
                disabled={isRequestingVerification}
              >
                {isRequestingVerification ? 'Sending' : 'Send verification email'}
              </button>
              <Link className="button button--secondary" to="/verify-email">
                Enter verification link
              </Link>
            </div>
            {verificationStatus ? (
              <div className="inline-alert" role="status">
                {verificationStatus}
              </div>
            ) : null}
          </section>
        </AppShell>
      );
    }

    return (
      <AppShell
        eyebrow={registration === 'created' ? 'Registration complete' : 'Welcome back'}
        title={`Ready for the next gathering, ${user.name ?? user.email}`}
        summary={`You are signed in as ${user.role}. Upcoming event tools will build on this workspace.`}
        aside={
          <div className="shell-aside">
            <span className="aside-value">{user.role === 'Organizer' ? 'OR' : 'MB'}</span>
            <span className="aside-label">{user.role}</span>
          </div>
        }
      >
        <section className="workspace-actions" aria-label="Workspace actions">
          <Link className="button button--primary" to="/signup">
            Update role
          </Link>
          <a className="button button--secondary" href={loginPath}>
            Refresh sign-in
          </a>
        </section>
        <section className="photo-grid" aria-label="Highlighted plans">
          {highlightedPlans.map((plan) => (
            <PhotoCard
              key={plan.title}
              title={plan.title}
              eyebrow={plan.eyebrow}
              detail={plan.detail}
              imageUrl={plan.imageUrl}
              imageAlt={plan.imageAlt}
              tone={plan.tone}
            />
          ))}
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      eyebrow="Photo-forward event planning"
      title="Create vivid invitations and keep every RSVP in view"
      summary="Plan around the cover photo first, then bring guests, roles, and event details into one focused workspace."
      aside={
        <div className="shell-aside">
          <span className="aside-value">2</span>
          <span className="aside-label">ways to join</span>
        </div>
      }
    >
      <section className="workspace-actions" aria-label="Account actions">
        <Link className="button button--primary" to="/signup">
          Create account
        </Link>
        <Link className="button button--secondary" to="/signin">
          Sign in
        </Link>
      </section>
      {error ? (
        <div className="inline-alert" role="status">
          {error}
        </div>
      ) : null}
      <section className="photo-grid" aria-label="Highlighted plans">
        {highlightedPlans.map((plan) => (
          <PhotoCard
            key={plan.title}
            title={plan.title}
            eyebrow={plan.eyebrow}
            detail={plan.detail}
            imageUrl={plan.imageUrl}
            imageAlt={plan.imageAlt}
            tone={plan.tone}
          />
        ))}
      </section>
    </AppShell>
  );
}
