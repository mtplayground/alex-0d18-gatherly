import type { EventProfile } from '@app/shared';
import { Link } from 'react-router-dom';

function eventDateParts(event: EventProfile) {
  const date = new Date(event.startsAt);
  return {
    day: date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    time: date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  };
}

function hostName(event: EventProfile) {
  return event.organizerName ?? event.organizerEmail ?? 'Organizer';
}

export function EventFeedCard({ event }: { event: EventProfile }) {
  const date = eventDateParts(event);

  return (
    <article className="event-feed-card">
      <Link className="event-feed-card__link" to={`/events/${event.id}`}>
        {event.coverPhotoUrl ? (
          <img src={event.coverPhotoUrl} alt="" loading="lazy" />
        ) : (
          <div className="event-feed-card__fallback" aria-hidden="true">
            <span>{date.day}</span>
          </div>
        )}
        <div className="event-feed-card__shade" />
        <div className="event-feed-card__content">
          <div className="event-feed-card__meta">
            <span>
              {date.day} · {date.time}
            </span>
            <span>{event.rsvpCount} yes</span>
          </div>
          <div>
            <h2>{event.title}</h2>
            <p>{hostName(event)}</p>
          </div>
        </div>
      </Link>
    </article>
  );
}
