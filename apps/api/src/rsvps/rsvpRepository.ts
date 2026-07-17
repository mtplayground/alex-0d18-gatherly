import type { Pool } from 'pg';
import type { RsvpStatus } from '@app/shared';
import { mapRsvpRow, type RsvpRecord, type RsvpRow } from './rsvpModel';

export interface UpsertRsvpInput {
  eventId: string;
  memberSub: string;
  status: RsvpStatus;
}

const rsvpSelect = `
  event_rsvps.*,
  users.name AS member_name,
  users.email AS member_email
`;

const rsvpJoin = `
  JOIN users ON users.sub = event_rsvps.member_sub
`;

export async function findRsvp(
  pool: Pool,
  eventId: string,
  memberSub: string,
): Promise<RsvpRecord | null> {
  const result = await pool.query<RsvpRow>(
    `
      SELECT ${rsvpSelect}
      FROM event_rsvps
      ${rsvpJoin}
      WHERE event_rsvps.event_id = $1
        AND event_rsvps.member_sub = $2
    `,
    [eventId, memberSub],
  );

  const row = result.rows[0];
  return row ? mapRsvpRow(row) : null;
}

export async function upsertRsvp(pool: Pool, input: UpsertRsvpInput): Promise<RsvpRecord> {
  const result = await pool.query<RsvpRow>(
    `
      WITH saved_rsvp AS (
        INSERT INTO event_rsvps (
          event_id,
          member_sub,
          status
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (event_id, member_sub) DO UPDATE
        SET
          status = EXCLUDED.status,
          responded_at = CASE
            WHEN event_rsvps.status IS DISTINCT FROM EXCLUDED.status THEN NOW()
            ELSE event_rsvps.responded_at
          END,
          updated_at = NOW()
        RETURNING *
      )
      SELECT
        saved_rsvp.*,
        users.name AS member_name,
        users.email AS member_email
      FROM saved_rsvp
      JOIN users ON users.sub = saved_rsvp.member_sub
    `,
    [input.eventId, input.memberSub, input.status],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('RSVP upsert did not return a row');
  }

  return mapRsvpRow(row);
}
