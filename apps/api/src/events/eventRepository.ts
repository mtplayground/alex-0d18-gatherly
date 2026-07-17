import type { Pool } from 'pg';
import { mapEventRow, type EventRecord, type EventRow } from './eventModel';

export interface CreateEventInput {
  organizerSub: string;
  title: string;
  description: string | null;
  startsAt: Date;
  location: string;
  coverPhotoKey: string | null;
}

export async function createEvent(pool: Pool, input: CreateEventInput): Promise<EventRecord> {
  const result = await pool.query<EventRow>(
    `
      INSERT INTO events (
        organizer_sub,
        title,
        description,
        starts_at,
        location,
        cover_photo_key
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [
      input.organizerSub,
      input.title,
      input.description,
      input.startsAt,
      input.location,
      input.coverPhotoKey,
    ],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('Event insert did not return a row');
  }

  return mapEventRow(row);
}

export async function findEventById(pool: Pool, eventId: string): Promise<EventRecord | null> {
  const result = await pool.query<EventRow>(
    `
      SELECT *
      FROM events
      WHERE id = $1
    `,
    [eventId],
  );

  const row = result.rows[0];
  return row ? mapEventRow(row) : null;
}

export async function listEventsByOrganizer(
  pool: Pool,
  organizerSub: string,
): Promise<EventRecord[]> {
  const result = await pool.query<EventRow>(
    `
      SELECT *
      FROM events
      WHERE organizer_sub = $1
      ORDER BY starts_at ASC, created_at ASC
    `,
    [organizerSub],
  );

  return result.rows.map(mapEventRow);
}
