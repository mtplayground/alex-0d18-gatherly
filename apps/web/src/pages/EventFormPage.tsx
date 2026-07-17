import type {
  CreateEventRequest,
  EventProfile,
  EventResponse,
  UpdateEventRequest,
} from '@app/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiRequest } from '../lib/api';

function formatLocalDateTime(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toDateInputValue(value: string): string {
  return formatLocalDateTime(new Date(value));
}

function EventCoverPreview({
  event,
  previewUrl,
  title,
  location,
  startsAt,
}: {
  event: EventProfile | null;
  previewUrl: string | null;
  title: string;
  location: string;
  startsAt: string;
}) {
  const coverUrl = previewUrl ?? event?.coverPhotoUrl ?? null;
  const displayTitle = title.trim() || event?.title || 'Untitled gathering';
  const displayLocation = location.trim() || event?.location || 'Location pending';
  const displayDate = startsAt
    ? new Date(startsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'Soon';

  return (
    <div className="event-cover-preview" aria-label="Event cover preview">
      {coverUrl ? (
        <img src={coverUrl} alt="" />
      ) : (
        <div className="event-cover-fallback">
          <span className="event-cover-fallback__date">{displayDate}</span>
          <strong>{displayTitle}</strong>
          <span>{displayLocation}</span>
        </div>
      )}
    </div>
  );
}

export function EventFormPage() {
  const { eventId } = useParams();
  const isEditing = Boolean(eventId);
  const { status, user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState(() => formatLocalDateTime(new Date()));
  const [location, setLocation] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [savedEvent, setSavedEvent] = useState<EventProfile | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const canEditLoadedEvent = useMemo(() => {
    if (!isEditing || !savedEvent || !user) {
      return true;
    }

    return savedEvent.organizerSub === user.sub;
  }, [isEditing, savedEvent, user]);

  const populateFromEvent = useCallback((event: EventProfile) => {
    setTitle(event.title);
    setDescription(event.description ?? '');
    setStartsAt(toDateInputValue(event.startsAt));
    setLocation(event.location);
    setSavedEvent(event);
    setCoverFile(null);
    setCoverPreviewUrl(null);
  }, []);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl(null);
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setCoverPreviewUrl(typeof reader.result === 'string' ? reader.result : null);
    });
    reader.readAsDataURL(coverFile);
  }, [coverFile]);

  useEffect(() => {
    if (!isEditing || !eventId || status !== 'authenticated') {
      return;
    }

    let isCurrent = true;
    setIsLoadingEvent(true);
    setStatusMessage(null);
    setIsSuccess(false);

    apiRequest<EventResponse>(`/api/events/${eventId}`)
      .then((response) => {
        if (!isCurrent) {
          return;
        }

        populateFromEvent(response.event);
      })
      .catch((err: unknown) => {
        if (!isCurrent) {
          return;
        }

        const message = err instanceof Error ? err.message : 'Unable to load event.';
        setStatusMessage(message);
        setIsSuccess(false);
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingEvent(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [eventId, isEditing, populateFromEvent, status]);

  async function uploadCoverPhoto(targetEventId: string, file: File): Promise<EventProfile> {
    const formData = new FormData();
    formData.set('cover', file);

    const response = await apiRequest<EventResponse>(`/api/events/${targetEventId}/cover-photo`, {
      method: 'POST',
      body: formData,
    });

    return response.event;
  }

  async function saveNewEvent(): Promise<EventProfile> {
    const payload: CreateEventRequest = {
      title,
      description: description.trim() ? description : null,
      startsAt: new Date(startsAt).toISOString(),
      location,
    };

    const created = await apiRequest<EventResponse>('/api/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return coverFile ? uploadCoverPhoto(created.event.id, coverFile) : created.event;
  }

  async function saveExistingEvent(targetEventId: string): Promise<EventProfile> {
    const payload: UpdateEventRequest = {
      title,
      description: description.trim() ? description : null,
      startsAt: new Date(startsAt).toISOString(),
      location,
    };

    const updated = await apiRequest<EventResponse>(`/api/events/${targetEventId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    return coverFile ? uploadCoverPhoto(updated.event.id, coverFile) : updated.event;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    setIsSuccess(false);

    try {
      const eventToSave =
        isEditing && eventId ? await saveExistingEvent(eventId) : await saveNewEvent();

      setSavedEvent(eventToSave);
      setCoverFile(null);
      setCoverPreviewUrl(null);
      setIsSuccess(true);
      setStatusMessage(
        isEditing
          ? coverFile
            ? 'Event updated with new cover photo.'
            : 'Event updated.'
          : coverFile
            ? 'Event saved with cover photo.'
            : 'Event saved.',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save event.';
      setStatusMessage(message);
      setIsSuccess(false);
    } finally {
      setIsSaving(false);
    }
  }

  if (status === 'loading') {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <p className="eyebrow">Loading</p>
          <h1>Preparing event form</h1>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <p className="eyebrow">Sign in required</p>
          <h1>Create events after sign-in</h1>
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
          <h1>Switch to Organizer to create events</h1>
          <Link className="button button--primary" to="/signup">
            Update role
          </Link>
        </section>
      </main>
    );
  }

  if (isEditing && isLoadingEvent) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <p className="eyebrow">Loading</p>
          <h1>Loading event details</h1>
        </section>
      </main>
    );
  }

  if (!canEditLoadedEvent) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <p className="eyebrow">Organizer access</p>
          <h1>This event belongs to another Organizer</h1>
          <Link className="button button--primary" to="/events/new">
            Create event
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="event-form-page">
      <section className="event-form-layout">
        <form className="auth-panel event-form" onSubmit={(event) => void handleSubmit(event)}>
          <div>
            <p className="eyebrow">Organizer event</p>
            <h1>{isEditing ? 'Edit event' : 'Create event'}</h1>
          </div>

          <label>
            Event title
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>

          <label>
            Date and time
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              required
            />
          </label>

          <label>
            Location
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
            />
          </label>

          <label className="file-field">
            Cover photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <div className="workspace-actions">
            <button className="button button--primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving' : isEditing ? 'Update event' : 'Save event'}
            </button>
            {savedEvent ? (
              <Link className="button button--secondary" to={`/events/${savedEvent.id}/edit`}>
                Edit saved event
              </Link>
            ) : null}
            <Link className="button button--secondary" to="/">
              Back
            </Link>
          </div>

          {statusMessage ? (
            <div className={isSuccess ? 'success-alert' : 'inline-alert'} role="status">
              {statusMessage}
            </div>
          ) : null}
        </form>

        <aside className="event-preview-panel">
          <EventCoverPreview
            event={savedEvent}
            previewUrl={coverPreviewUrl}
            title={title}
            location={location}
            startsAt={startsAt}
          />
          <div className="event-preview-meta">
            <p className="eyebrow">Preview</p>
            <h2>{title.trim() || 'Untitled gathering'}</h2>
            <p>{location.trim() || 'Location pending'}</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
