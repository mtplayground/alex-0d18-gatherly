import type { Pool, PoolClient } from 'pg';
import type { EventActivityAction, RsvpStatus } from '@app/shared';
import { mapActivityLogRow, type ActivityLogRecord, type ActivityLogRow } from './activityLogModel';

type Queryable = Pool | PoolClient;

export interface CreateActivityLogInput {
  eventId: string;
  actorSub: string | null;
  action: EventActivityAction;
  commentId?: string | null;
  rsvpStatus?: RsvpStatus | null;
  metadata?: Record<string, unknown>;
}

const activitySelect = `
  event_activity_logs.*,
  users.name AS actor_name,
  users.email AS actor_email
`;

const activityJoin = `
  LEFT JOIN users ON users.sub = event_activity_logs.actor_sub
`;

export async function listActivityLogsByEvent(
  pool: Pool,
  eventId: string,
): Promise<ActivityLogRecord[]> {
  const result = await pool.query<ActivityLogRow>(
    `
      SELECT ${activitySelect}
      FROM event_activity_logs
      ${activityJoin}
      WHERE event_activity_logs.event_id = $1
      ORDER BY event_activity_logs.created_at DESC, event_activity_logs.id DESC
      LIMIT 50
    `,
    [eventId],
  );

  return result.rows.map(mapActivityLogRow);
}

export async function createActivityLog(
  db: Queryable,
  input: CreateActivityLogInput,
): Promise<ActivityLogRecord> {
  const result = await db.query<ActivityLogRow>(
    `
      WITH saved_activity AS (
        INSERT INTO event_activity_logs (
          event_id,
          actor_sub,
          action,
          comment_id,
          rsvp_status,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        RETURNING *
      )
      SELECT
        saved_activity.*,
        users.name AS actor_name,
        users.email AS actor_email
      FROM saved_activity
      LEFT JOIN users ON users.sub = saved_activity.actor_sub
    `,
    [
      input.eventId,
      input.actorSub,
      input.action,
      input.commentId ?? null,
      input.rsvpStatus ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('Activity log insert did not return a row');
  }

  return mapActivityLogRow(row);
}
