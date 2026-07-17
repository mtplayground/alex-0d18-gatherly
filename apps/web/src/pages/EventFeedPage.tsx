import type { EventListResponse, EventProfile } from '@app/shared';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { EventFeedCard } from '../components/EventFeedCard';
import { AppShell } from '../components/ui/AppShell';
import { apiRequest } from '../lib/api';

export function EventFeedPage() {
  const { status, user } = useAuth();
  const [events, setEvents] = useState<EventProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated' || user?.role !== 'Member') {
      return;
    }

    let isCurrent = true;
    setIsLoading(true);
    setMessage(null);

    apiRequest<EventListResponse>('/api/events/feed')
      .then((response) => {
        if (!isCurrent) {
          return;
        }

        setEvents(response.events);
      })
      .catch((err: unknown) => {
        if (!isCurrent) {
          return;
        }

        setMessage(err instanceof Error ? err.message : 'Unable to load your event feed.');
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [status, user?.role]);

  const nextEvent = useMemo(() => events[0] ?? null, [events]);

  if (status === 'loading') {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <p className="eyebrow">Loading</p>
          <h1>Preparing your event feed</h1>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <p className="eyebrow">Sign in required</p>
          <h1>Open your feed after sign-in</h1>
          <Link className="button button--primary" to="/signin">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  if (user.role !== 'Member') {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <p className="eyebrow">Member feed</p>
          <h1>Switch to Member to browse invitations</h1>
          <Link className="button button--primary" to="/signup">
            Update role
          </Link>
        </section>
      </main>
    );
  }

  return (
    <AppShell
      eyebrow="Event feed"
      title="Your upcoming invitations"
      summary={
        nextEvent
          ? `Next up: ${nextEvent.title} with ${nextEvent.rsvpCount} confirmed.`
          : 'Invited events will appear here as soon as an Organizer adds you.'
      }
      aside={
        <div className="shell-aside">
          <span className="aside-value">{events.length}</span>
          <span className="aside-label">upcoming</span>
        </div>
      }
    >
      <section className="workspace-actions" aria-label="Member actions">
        <Link className="button button--primary" to="/profile">
          Profile photo
        </Link>
        <Link className="button button--secondary" to="/signup">
          Update role
        </Link>
      </section>

      {message ? (
        <div className="inline-alert" role="status">
          {message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="loading-band" role="status">
          Loading events
        </div>
      ) : null}

      {!isLoading && events.length === 0 ? (
        <section className="event-feed-empty">
          <p className="eyebrow">No invitations</p>
          <h2>No upcoming event invitations yet</h2>
          <Link className="button button--secondary" to="/profile">
            Check profile
          </Link>
        </section>
      ) : null}

      <section className="event-feed" aria-label="Upcoming event feed">
        {events.map((event) => (
          <EventFeedCard event={event} key={event.id} />
        ))}
      </section>
    </AppShell>
  );
}
