import type { EventProfile, EventResponse, InvitationResponse } from '@app/shared';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiRequest } from '../lib/api';

function formatEventDate(value: string) {
  const date = new Date(value);
  return {
    day: date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
    shortDay: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  };
}

function hostName(event: EventProfile) {
  return event.organizerName ?? event.organizerEmail ?? 'Organizer';
}

function EventHeroImage({ event }: { event: EventProfile }) {
  const date = formatEventDate(event.startsAt);

  return (
    <section className="event-detail-media" aria-label="Event cover">
      {event.coverPhotoUrl ? (
        <img src={event.coverPhotoUrl} alt="" />
      ) : (
        <div className="event-detail-fallback">
          <span>{date.shortDay}</span>
          <strong>{event.title}</strong>
        </div>
      )}
    </section>
  );
}

export function EventDetailPage() {
  const { eventId } = useParams();
  const { status: authStatus, user } = useAuth();
  const [event, setEvent] = useState<EventProfile | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending'>('idle');
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setStatus('error');
      setMessage('Event id is missing.');
      return;
    }

    let isCurrent = true;
    setStatus('loading');
    setMessage(null);

    apiRequest<EventResponse>(`/api/events/${eventId}`)
      .then((response) => {
        if (!isCurrent) {
          return;
        }

        setEvent(response.event);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (!isCurrent) {
          return;
        }

        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Unable to load event.');
      });

    return () => {
      isCurrent = false;
    };
  }, [eventId]);

  const formattedDate = useMemo(() => (event ? formatEventDate(event.startsAt) : null), [event]);
  const canInvite =
    authStatus === 'authenticated' &&
    Boolean(user && event && user.role === 'Organizer' && user.sub === event.organizerSub);

  async function handleInviteSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (!event) {
      return;
    }

    setInviteStatus('sending');
    setInviteMessage(null);

    try {
      const response = await apiRequest<InvitationResponse>(`/api/events/${event.id}/invitations`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail }),
      });
      setInviteEmail('');

      if (response.emailStatus === 'sent') {
        setInviteMessage('Invitation sent.');
      } else if (response.emailStatus === 'email_not_configured') {
        setInviteMessage('Invitation saved. Email delivery is not configured yet.');
      } else if (response.emailStatus === 'email_rate_limited') {
        setInviteMessage('Invitation saved. Email is rate limited; try sending again shortly.');
      } else {
        setInviteMessage('Invitation saved, but email delivery failed.');
      }
    } catch (err) {
      setInviteMessage(err instanceof Error ? err.message : 'Unable to invite that member.');
    } finally {
      setInviteStatus('idle');
    }
  }

  if (status === 'loading') {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <p className="eyebrow">Loading</p>
          <h1>Preparing event details</h1>
        </section>
      </main>
    );
  }

  if (status === 'error' || !event || !formattedDate) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <p className="eyebrow">Event details</p>
          <h1>Event unavailable</h1>
          {message ? (
            <div className="inline-alert" role="status">
              {message}
            </div>
          ) : null}
          <Link className="button button--primary" to="/">
            Back to workspace
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="event-detail-page">
      <EventHeroImage event={event} />

      <aside className="event-detail-panel" aria-label="Event details">
        <div>
          <p className="eyebrow">Hosted by {hostName(event)}</p>
          <h1>{event.title}</h1>
        </div>

        <dl className="event-detail-facts">
          <div>
            <dt>Date</dt>
            <dd>{formattedDate.day}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{formattedDate.time}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{event.location}</dd>
          </div>
          <div>
            <dt>RSVPs</dt>
            <dd>{event.rsvpCount}</dd>
          </div>
        </dl>

        {event.description ? <p className="event-detail-description">{event.description}</p> : null}

        <div className="workspace-actions">
          <Link className="button button--primary" to="/signin">
            RSVP
          </Link>
          <Link className="button button--secondary" to="/">
            Workspace
          </Link>
        </div>

        {canInvite ? (
          <form
            className="event-invite-form"
            id="invite"
            onSubmit={(formEvent) => void handleInviteSubmit(formEvent)}
          >
            <label>
              <span>Invite member</span>
              <input
                type="email"
                autoComplete="email"
                value={inviteEmail}
                onChange={(changeEvent) => setInviteEmail(changeEvent.target.value)}
                placeholder="member@example.com"
                required
              />
            </label>
            <button
              className="button button--primary"
              type="submit"
              disabled={inviteStatus === 'sending'}
            >
              {inviteStatus === 'sending' ? 'Inviting' : 'Send invite'}
            </button>
            {inviteMessage ? (
              <div className="inline-alert" role="status">
                {inviteMessage}
              </div>
            ) : null}
          </form>
        ) : null}
      </aside>
    </main>
  );
}
