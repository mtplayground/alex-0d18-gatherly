import type { Pool } from 'pg';
import type { RsvpStatus } from '@app/shared';
import { mapEventRow, type EventRecord, type EventRow } from './eventModel';

export const eventReminderKind = '24h';

export interface EventReminderCandidate {
  event: EventRecord;
  memberSub: string;
  memberName: string | null;
  memberEmail: string;
  rsvpStatus: RsvpStatus | null;
}

interface EventReminderCandidateRow extends EventRow {
  member_sub: string;
  member_name: string | null;
  member_email: string;
  rsvp_status: RsvpStatus | null;
}

export async function listDueEventReminderCandidates(
  pool: Pool,
): Promise<EventReminderCandidate[]> {
  const result = await pool.query<EventReminderCandidateRow>(
    `
      SELECT
        events.*,
        organizer.name AS organizer_name,
        organizer.email AS organizer_email,
        COUNT(event_rsvps.member_sub) FILTER (WHERE event_rsvps.status = 'yes') AS rsvp_count,
        invited_user.sub AS member_sub,
        invited_user.name AS member_name,
        invited_user.email AS member_email,
        member_rsvp.status AS rsvp_status
      FROM event_invitations
      JOIN events ON events.id = event_invitations.event_id
      JOIN users invited_user ON invited_user.sub = event_invitations.invited_user_sub
      LEFT JOIN users organizer ON organizer.sub = events.organizer_sub
      LEFT JOIN event_rsvps ON event_rsvps.event_id = events.id
      LEFT JOIN event_rsvps member_rsvp
        ON member_rsvp.event_id = events.id
        AND member_rsvp.member_sub = event_invitations.invited_user_sub
      LEFT JOIN event_reminder_deliveries
        ON event_reminder_deliveries.event_id = events.id
        AND event_reminder_deliveries.member_sub = event_invitations.invited_user_sub
        AND event_reminder_deliveries.reminder_kind = $1
      WHERE event_invitations.revoked_at IS NULL
        AND events.canceled_at IS NULL
        AND events.starts_at > NOW()
        AND events.starts_at <= NOW() + INTERVAL '24 hours'
        AND (member_rsvp.status IS NULL OR member_rsvp.status IN ('yes', 'maybe'))
        AND (
          event_reminder_deliveries.id IS NULL
          OR (
            event_reminder_deliveries.status = 'failed'
            AND event_reminder_deliveries.attempts < 3
            AND event_reminder_deliveries.updated_at < NOW() - INTERVAL '15 minutes'
          )
          OR (
            event_reminder_deliveries.status = 'pending'
            AND event_reminder_deliveries.updated_at < NOW() - INTERVAL '30 minutes'
          )
        )
      GROUP BY
        events.id,
        organizer.name,
        organizer.email,
        invited_user.sub,
        invited_user.name,
        invited_user.email,
        member_rsvp.status,
        event_reminder_deliveries.id,
        event_reminder_deliveries.status,
        event_reminder_deliveries.attempts,
        event_reminder_deliveries.updated_at
      ORDER BY events.starts_at ASC, invited_user.email ASC
      LIMIT 100
    `,
    [eventReminderKind],
  );

  return result.rows.map((row) => ({
    event: mapEventRow(row),
    memberSub: row.member_sub,
    memberName: row.member_name,
    memberEmail: row.member_email,
    rsvpStatus: row.rsvp_status,
  }));
}

export async function claimEventReminderDelivery(
  pool: Pool,
  input: { eventId: string; memberSub: string },
): Promise<boolean> {
  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO event_reminder_deliveries (
        event_id,
        member_sub,
        reminder_kind,
        status,
        attempts
      )
      VALUES ($1, $2, $3, 'pending', 1)
      ON CONFLICT (event_id, member_sub, reminder_kind) DO UPDATE
      SET
        status = 'pending',
        attempts = event_reminder_deliveries.attempts + 1,
        last_error = NULL
      WHERE (
        event_reminder_deliveries.status = 'failed'
        AND event_reminder_deliveries.attempts < 3
        AND event_reminder_deliveries.updated_at < NOW() - INTERVAL '15 minutes'
      )
      OR (
        event_reminder_deliveries.status = 'pending'
        AND event_reminder_deliveries.updated_at < NOW() - INTERVAL '30 minutes'
      )
      RETURNING id
    `,
    [input.eventId, input.memberSub, eventReminderKind],
  );

  return result.rowCount === 1;
}

export async function markEventReminderSent(
  pool: Pool,
  input: { eventId: string; memberSub: string },
): Promise<void> {
  await pool.query(
    `
      UPDATE event_reminder_deliveries
      SET
        status = 'sent',
        sent_at = NOW(),
        last_error = NULL
      WHERE event_id = $1
        AND member_sub = $2
        AND reminder_kind = $3
    `,
    [input.eventId, input.memberSub, eventReminderKind],
  );
}

export async function markEventReminderFailed(
  pool: Pool,
  input: { eventId: string; memberSub: string; error: string },
): Promise<void> {
  await pool.query(
    `
      UPDATE event_reminder_deliveries
      SET
        status = 'failed',
        last_error = $4
      WHERE event_id = $1
        AND member_sub = $2
        AND reminder_kind = $3
    `,
    [input.eventId, input.memberSub, eventReminderKind, input.error.slice(0, 1000)],
  );
}
