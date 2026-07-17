import type {
  EventProfile,
  EventResponse,
  InvitationResponse,
  RsvpResponse,
  RsvpStatus,
  RsvpStatusResponse,
} from '@app/shared';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { RsvpButtons } from '../components/RsvpButtons';
import { ApiRequestError } from '../lib/api';
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
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus | null>(null);
  const [rsvpMessage, setRsvpMessage] = useState<string | null>(null);
  const [isSavingRsvp, setIsSavingRsvp] = useState(false);

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

  useEffect(() => {
    if (authStatus !== 'authenticated' || user?.role !== 'Member' || !eventId) {
      setRsvpStatus(null);
      return;
    }

    let isCurrent = true;
    setRsvpMessage(null);

    apiRequest<RsvpStatusResponse>(`/api/events/${eventId}/rsvp`)
      .then((response) => {
        if (!isCurrent) {
          return;
        }

        setRsvpStatus(response.rsvp?.status ?? null);
      })
      .catch((err: unknown) => {
        if (!isCurrent) {
          return;
        }

        if (err instanceof ApiRequestError && err.status === 403) {
          setRsvpMessage('You need an invitation before you can RSVP.');
          return;
        }

        setRsvpMessage(err instanceof Error ? err.message : 'Unable to load your RSVP.');
      });

    return () => {
      isCurrent = false;
    };
  }, [authStatus, eventId, user?.role]);

  const formattedDate = useMemo(() => (event ? formatEventDate(event.startsAt) : null), [event]);
  const canInvite =
    authStatus === 'authenticated' &&
    Boolean(user && event && user.role === 'Organizer' && user.sub === event.organizerSub);
  const canRsvp = authStatus === 'authenticated' && user?.role === 'Member';

  async function handleRsvpChange(nextStatus: RsvpStatus) {
    if (!event) {
      return;
    }

    setIsSavingRsvp(true);
    setRsvpMessage(null);

    try {
      const response = await apiRequest<RsvpResponse>(`/api/events/${event.id}/rsvp`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });

      setRsvpStatus(response.rsvp.status);
      setEvent(response.event);
      setRsvpMessage(`RSVP saved as ${response.rsvp.status}.`);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 403) {
        setRsvpMessage('You need an invitation before you can RSVP.');
      } else {
        setRsvpMessage(err instanceof Error ? err.message : 'Unable to save your RSVP.');
      }
    } finally {
      setIsSavingRsvp(false);
    }
  }

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

        {canRsvp ? (
          <section className="event-rsvp-panel" aria-label="RSVP">
            <p className="photo-card__eyebrow">Your RSVP</p>
            <RsvpButtons
              isSaving={isSavingRsvp}
              onChange={(nextStatus) => void handleRsvpChange(nextStatus)}
              value={rsvpStatus}
            />
            {rsvpMessage ? (
              <div className="inline-alert" role="status">
                {rsvpMessage}
              </div>
            ) : null}
          </section>
        ) : (
          <div className="workspace-actions">
            <Link className="button button--primary" to="/signin">
              RSVP
            </Link>
            <Link className="button button--secondary" to="/">
              Workspace
            </Link>
          </div>
        )}

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
