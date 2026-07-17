import type { EventListResponse, EventProfile } from '@app/shared';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiRequest } from '../lib/api';

function eventDateParts(event: EventProfile) {
  const date = new Date(event.startsAt);
  return {
    day: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    time: date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  };
}

function EventThumb({ event }: { event: EventProfile }) {
  const date = eventDateParts(event);

  return (
    <div className="organizer-event-thumb" aria-hidden="true">
      {event.coverPhotoUrl ? (
        <img src={event.coverPhotoUrl} alt="" />
      ) : (
        <div className="organizer-event-thumb__fallback">
          <span>{date.day}</span>
        </div>
      )}
    </div>
  );
}

export function OrganizerDashboardPage() {
  const { status, user } = useAuth();
  const [events, setEvents] = useState<EventProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated' || user?.role !== 'Organizer') {
      return;
    }

    let isCurrent = true;
    setIsLoading(true);
    setMessage(null);

    apiRequest<EventListResponse>('/api/events/mine')
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

        setMessage(err instanceof Error ? err.message : 'Unable to load events.');
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

  const upcomingCount = useMemo(() => {
    const now = Date.now();
    return events.filter((event) => new Date(event.startsAt).getTime() >= now).length;
  }, [events]);

  if (status === 'loading') {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <p className="eyebrow">Loading</p>
          <h1>Preparing Organizer dashboard</h1>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <p className="eyebrow">Sign in required</p>
          <h1>Open your dashboard after sign-in</h1>
          <Link className="button button--primary" to="/signin">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  if (user.role !== 'Organizer') {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <p className="eyebrow">Organizer access</p>
          <h1>Switch to Organizer to manage events</h1>
          <Link className="button button--primary" to="/signup">
            Update role
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="organizer-dashboard">
      <header className="organizer-dashboard__header">
        <div>
          <p className="eyebrow">Organizer dashboard</p>
          <h1>Your events</h1>
        </div>
        <div className="shell-aside">
          <span className="aside-value">{upcomingCount}</span>
          <span className="aside-label">upcoming</span>
        </div>
      </header>

      <section className="workspace-actions" aria-label="Organizer actions">
        <Link className="button button--primary" to="/events/new">
          Create event
        </Link>
        <Link className="button button--secondary" to="/">
          Workspace
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
        <section className="organizer-empty">
          <p className="eyebrow">No events yet</p>
          <h2>Create your first gathering</h2>
          <Link className="button button--primary" to="/events/new">
            Create event
          </Link>
        </section>
      ) : null}

      <section className="organizer-event-list" aria-label="Organizer events">
        {events.map((event) => {
          const date = eventDateParts(event);
          return (
            <article className="organizer-event-row" key={event.id}>
              <EventThumb event={event} />
              <div className="organizer-event-row__main">
                <div>
                  <p className="photo-card__eyebrow">
                    {date.day} · {date.time}
                  </p>
                  <h2>{event.title}</h2>
                </div>
                <p>{event.location}</p>
              </div>
              <div className="organizer-event-row__actions">
                <Link className="button button--secondary" to={`/events/${event.id}/edit`}>
                  Edit
                </Link>
                <Link className="button button--secondary" to={`/events/${event.id}`}>
                  View
                </Link>
                <Link className="button button--secondary" to={`/events/${event.id}#invite`}>
                  Invite
                </Link>
                <Link className="button button--secondary" to={`/events/${event.id}/rsvps`}>
                  RSVPs
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
