import type { ActivityLogProfile, EventActivityAction, RsvpStatus } from '@app/shared';

export interface ActivityLogRow {
  id: string;
  event_id: string;
  actor_sub: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  action: EventActivityAction;
  comment_id: string | null;
  rsvp_status: RsvpStatus | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface ActivityLogRecord {
  id: string;
  eventId: string;
  actorSub: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: EventActivityAction;
  commentId: string | null;
  rsvpStatus: RsvpStatus | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export function mapActivityLogRow(row: ActivityLogRow): ActivityLogRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    actorSub: row.actor_sub,
    actorName: row.actor_name ?? null,
    actorEmail: row.actor_email ?? null,
    action: row.action,
    commentId: row.comment_id,
    rsvpStatus: row.rsvp_status,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export function toActivityLogProfile(activity: ActivityLogRecord): ActivityLogProfile {
  return {
    id: activity.id,
    eventId: activity.eventId,
    actorSub: activity.actorSub,
    actorName: activity.actorName,
    actorEmail: activity.actorEmail,
    action: activity.action,
    commentId: activity.commentId,
    rsvpStatus: activity.rsvpStatus,
    metadata: activity.metadata,
    createdAt: activity.createdAt.toISOString(),
  };
}
