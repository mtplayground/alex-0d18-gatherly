import type {
  ActivityLogListResponse,
  ActivityLogProfile,
  CommentListResponse,
  CommentProfile,
  CommentResponse,
  EventAttachmentListResponse,
  EventAttachmentProfile,
  EventAttachmentResponse,
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
import { ApiRequestError, apiRequest, friendlyApiErrorMessage } from '../lib/api';

const maxAttachmentBytes = 12 * 1024 * 1024;

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

function authorName(comment: CommentProfile) {
  return comment.authorName ?? comment.authorEmail ?? 'Guest';
}

function authorInitials(comment: CommentProfile) {
  const name = authorName(comment);
  const parts = name
    .split(/[\s@.]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || 'G';
}

function formatCommentTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatAttachmentSize(byteSize: number) {
  if (byteSize >= 1024 * 1024) {
    return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(byteSize / 1024))} KB`;
}

function formatAttachmentTime(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function activityActorName(activity: ActivityLogProfile) {
  return activity.actorName ?? activity.actorEmail ?? 'Someone';
}

function formatActivityTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function activityFieldLabel(field: string) {
  const labels: Record<string, string> = {
    coverPhotoKey: 'cover photo',
    description: 'description',
    location: 'location',
    startsAt: 'date',
    title: 'title',
  };

  return labels[field] ?? field;
}

function activityText(activity: ActivityLogProfile) {
  const actor = activityActorName(activity);

  if (activity.action === 'event_created') {
    return `${actor} created this event.`;
  }

  if (activity.action === 'event_updated') {
    const changedFields = Array.isArray(activity.metadata.changedFields)
      ? activity.metadata.changedFields.filter(
          (field): field is string => typeof field === 'string',
        )
      : [];
    if (changedFields.length > 0) {
      return `${actor} updated ${changedFields.map(activityFieldLabel).join(', ')}.`;
    }

    return `${actor} updated this event.`;
  }

  if (activity.action === 'rsvp_submitted') {
    return `${actor} RSVP'd ${activity.rsvpStatus ?? 'maybe'}.`;
  }

  return `${actor} commented.`;
}

function EventHeroImage({ event }: { event: EventProfile }) {
  const date = formatEventDate(event.startsAt);

  return (
    <section className="event-detail-media" aria-label="Event cover">
      {event.coverPhotoUrl ? (
        <img src={event.coverPhotoUrl} alt="" />
      ) : (
        <div className="event-detail-fallback">
          <em>No cover photo</em>
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
  const [comments, setComments] = useState<CommentProfile[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [commentsStatus, setCommentsStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [commentMessage, setCommentMessage] = useState<string | null>(null);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [activities, setActivities] = useState<ActivityLogProfile[]>([]);
  const [activityStatus, setActivityStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [activityMessage, setActivityMessage] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<EventAttachmentProfile[]>([]);
  const [attachmentStatus, setAttachmentStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [attachmentMessage, setAttachmentMessage] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

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
        setMessage(friendlyApiErrorMessage(err, 'Unable to load event.'));
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

        setRsvpMessage(friendlyApiErrorMessage(err, 'Unable to load your RSVP.'));
      });

    return () => {
      isCurrent = false;
    };
  }, [authStatus, eventId, user?.role]);

  useEffect(() => {
    if (!eventId) {
      setCommentsStatus('error');
      setCommentMessage('Event id is missing.');
      return;
    }

    let isCurrent = true;
    setCommentsStatus('loading');
    setCommentMessage(null);

    apiRequest<CommentListResponse>(`/api/events/${eventId}/comments`)
      .then((response) => {
        if (!isCurrent) {
          return;
        }

        setComments(response.comments);
        setCommentsStatus('ready');
      })
      .catch((err: unknown) => {
        if (!isCurrent) {
          return;
        }

        setCommentsStatus('error');
        setCommentMessage(friendlyApiErrorMessage(err, 'Unable to load comments.'));
      });

    return () => {
      isCurrent = false;
    };
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setActivityStatus('error');
      setActivityMessage('Event id is missing.');
      return;
    }

    let isCurrent = true;
    setActivityStatus('loading');
    setActivityMessage(null);

    apiRequest<ActivityLogListResponse>(`/api/events/${eventId}/activity`)
      .then((response) => {
        if (!isCurrent) {
          return;
        }

        setActivities(response.activities);
        setActivityStatus('ready');
      })
      .catch((err: unknown) => {
        if (!isCurrent) {
          return;
        }

        setActivityStatus('error');
        setActivityMessage(friendlyApiErrorMessage(err, 'Unable to load activity.'));
      });

    return () => {
      isCurrent = false;
    };
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setAttachmentStatus('error');
      setAttachmentMessage('Event id is missing.');
      return;
    }

    let isCurrent = true;
    setAttachmentStatus('loading');
    setAttachmentMessage(null);

    apiRequest<EventAttachmentListResponse>(`/api/events/${eventId}/attachments`)
      .then((response) => {
        if (!isCurrent) {
          return;
        }

        setAttachments(response.attachments);
        setAttachmentStatus('ready');
      })
      .catch((err: unknown) => {
        if (!isCurrent) {
          return;
        }

        setAttachmentStatus('error');
        setAttachmentMessage(friendlyApiErrorMessage(err, 'Unable to load attachments.'));
      });

    return () => {
      isCurrent = false;
    };
  }, [eventId]);

  const formattedDate = useMemo(() => (event ? formatEventDate(event.startsAt) : null), [event]);
  const canInvite =
    authStatus === 'authenticated' &&
    Boolean(user && event && user.role === 'Organizer' && user.sub === event.organizerSub);
  const canRsvp = authStatus === 'authenticated' && user?.role === 'Member';

  async function refreshActivity(targetEventId: string) {
    try {
      const response = await apiRequest<ActivityLogListResponse>(
        `/api/events/${targetEventId}/activity`,
      );
      setActivities(response.activities);
      setActivityStatus('ready');
      setActivityMessage(null);
    } catch (err) {
      setActivityStatus('error');
      setActivityMessage(friendlyApiErrorMessage(err, 'Unable to refresh activity.'));
    }
  }

  async function handleAttachmentSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (!event || !attachmentFile) {
      return;
    }

    if (
      attachmentFile.type !== 'application/pdf' ||
      !attachmentFile.name.toLowerCase().endsWith('.pdf')
    ) {
      setAttachmentMessage('Upload a valid PDF file.');
      return;
    }

    if (attachmentFile.size > maxAttachmentBytes) {
      setAttachmentMessage('That PDF is too large. Upload a file that is 12 MB or smaller.');
      return;
    }

    setIsUploadingAttachment(true);
    setAttachmentMessage(null);

    try {
      const body = new FormData();
      body.append('attachment', attachmentFile);
      const response = await apiRequest<EventAttachmentResponse>(
        `/api/events/${event.id}/attachments`,
        {
          method: 'POST',
          body,
        },
      );
      setAttachments((current) => [response.attachment, ...current]);
      setAttachmentFile(null);
      setAttachmentStatus('ready');
      submitEvent.currentTarget.reset();
    } catch (err) {
      setAttachmentMessage(friendlyApiErrorMessage(err, 'Unable to upload attachment.'));
    } finally {
      setIsUploadingAttachment(false);
    }
  }

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
      await refreshActivity(event.id);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 403) {
        setRsvpMessage('You need an invitation before you can RSVP.');
      } else {
        setRsvpMessage(friendlyApiErrorMessage(err, 'Unable to save your RSVP.'));
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
      setInviteMessage(friendlyApiErrorMessage(err, 'Unable to invite that member.'));
    } finally {
      setInviteStatus('idle');
    }
  }

  async function handleCommentSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (!event || !commentBody.trim()) {
      return;
    }

    setIsPostingComment(true);
    setCommentMessage(null);

    try {
      const response = await apiRequest<CommentResponse>(`/api/events/${event.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: commentBody }),
      });
      setComments((current) => [...current, response.comment]);
      setCommentBody('');
      setCommentsStatus('ready');
      await refreshActivity(event.id);
    } catch (err) {
      setCommentMessage(friendlyApiErrorMessage(err, 'Unable to post comment.'));
    } finally {
      setIsPostingComment(false);
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

        <section className="event-attachments" aria-label="PDF attachments">
          <div className="comment-thread__header">
            <p className="photo-card__eyebrow">Attachments</p>
            <span>{attachments.length}</span>
          </div>

          {canInvite ? (
            <form
              className="event-attachment-form"
              onSubmit={(formEvent) => void handleAttachmentSubmit(formEvent)}
            >
              <label>
                <span>Add PDF</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(changeEvent) =>
                    setAttachmentFile(changeEvent.target.files?.[0] ?? null)
                  }
                  required
                />
              </label>
              <button
                className="button button--primary"
                type="submit"
                disabled={isUploadingAttachment || !attachmentFile}
              >
                {isUploadingAttachment ? 'Uploading' : 'Upload PDF'}
              </button>
            </form>
          ) : null}

          {attachmentMessage ? (
            <div className="inline-alert" role="status">
              {attachmentMessage}
            </div>
          ) : null}

          {attachmentStatus === 'loading' ? (
            <div className="loading-band" role="status">
              Loading attachments
            </div>
          ) : null}

          {attachmentStatus === 'ready' && attachments.length === 0 ? (
            <p className="comment-thread__empty">No PDFs are attached to this event yet.</p>
          ) : null}

          <div className="attachment-list">
            {attachments.map((attachment) => (
              <a
                className="attachment-item"
                href={attachment.downloadUrl}
                key={attachment.id}
                rel="noreferrer"
                target="_blank"
              >
                <span className="attachment-item__icon" aria-hidden="true">
                  PDF
                </span>
                <span>
                  <strong>{attachment.fileName}</strong>
                  <small>
                    {formatAttachmentSize(attachment.byteSize)} ·{' '}
                    {formatAttachmentTime(attachment.createdAt)}
                  </small>
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="comment-thread" aria-label="Comments">
          <div className="comment-thread__header">
            <p className="photo-card__eyebrow">Comments</p>
            <span>{comments.length}</span>
          </div>

          {authStatus === 'authenticated' ? (
            <form
              className="comment-form"
              onSubmit={(formEvent) => void handleCommentSubmit(formEvent)}
            >
              <label>
                <span>Join the thread</span>
                <textarea
                  value={commentBody}
                  onChange={(changeEvent) => setCommentBody(changeEvent.target.value)}
                  maxLength={2000}
                  placeholder="Add a comment"
                  required
                />
              </label>
              <button
                className="button button--primary"
                type="submit"
                disabled={isPostingComment || !commentBody.trim()}
              >
                {isPostingComment ? 'Posting' : 'Post comment'}
              </button>
            </form>
          ) : (
            <Link className="button button--secondary" to="/signin">
              Sign in to comment
            </Link>
          )}

          {commentMessage ? (
            <div className="inline-alert" role="status">
              {commentMessage}
            </div>
          ) : null}

          {commentsStatus === 'loading' ? (
            <div className="loading-band" role="status">
              Loading comments
            </div>
          ) : null}

          {commentsStatus === 'ready' && comments.length === 0 ? (
            <p className="comment-thread__empty">
              No comments yet. The thread will fill in as guests coordinate.
            </p>
          ) : null}

          <div className="comment-list">
            {comments.map((comment) => (
              <article className="comment-item" key={comment.id}>
                <div className="comment-avatar" aria-hidden="true">
                  {comment.authorProfilePhotoUrl ? (
                    <img src={comment.authorProfilePhotoUrl} alt="" />
                  ) : (
                    <span>{authorInitials(comment)}</span>
                  )}
                </div>
                <div className="comment-item__body">
                  <div className="comment-item__meta">
                    <strong>{authorName(comment)}</strong>
                    <span>{formatCommentTime(comment.createdAt)}</span>
                  </div>
                  <p>{comment.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="activity-feed" aria-label="Activity history">
          <div className="comment-thread__header">
            <p className="photo-card__eyebrow">Activity</p>
            <span>{activities.length}</span>
          </div>

          {activityMessage ? (
            <div className="inline-alert" role="status">
              {activityMessage}
            </div>
          ) : null}

          {activityStatus === 'loading' ? (
            <div className="loading-band" role="status">
              Loading activity
            </div>
          ) : null}

          {activityStatus === 'ready' && activities.length === 0 ? (
            <p className="comment-thread__empty">
              No activity yet. RSVPs, comments, and event edits will appear here.
            </p>
          ) : null}

          <div className="activity-list">
            {activities.map((activity) => (
              <article className="activity-item" key={activity.id}>
                <span className="activity-item__marker" aria-hidden="true" />
                <div>
                  <p>{activityText(activity)}</p>
                  <time dateTime={activity.createdAt}>
                    {formatActivityTime(activity.createdAt)}
                  </time>
                </div>
              </article>
            ))}
          </div>
        </section>
      </aside>
    </main>
  );
}
