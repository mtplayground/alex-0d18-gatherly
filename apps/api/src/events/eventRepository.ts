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

export interface UpdateEventInput {
  title?: string;
  description?: string | null;
  startsAt?: Date;
  location?: string;
  coverPhotoKey?: string | null;
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

export async function listEvents(pool: Pool): Promise<EventRecord[]> {
  const result = await pool.query<EventRow>(
    `
      SELECT *
      FROM events
      WHERE canceled_at IS NULL
      ORDER BY starts_at ASC, created_at ASC
    `,
  );

  return result.rows.map(mapEventRow);
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

export async function updateEvent(
  pool: Pool,
  eventId: string,
  input: UpdateEventInput,
): Promise<EventRecord | null> {
  const result = await pool.query<EventRow>(
    `
      UPDATE events
      SET
        title = CASE WHEN $2::boolean THEN $3::text ELSE title END,
        description = CASE WHEN $4::boolean THEN $5::text ELSE description END,
        starts_at = CASE WHEN $6::boolean THEN $7::timestamptz ELSE starts_at END,
        location = CASE WHEN $8::boolean THEN $9::text ELSE location END,
        cover_photo_key = CASE WHEN $10::boolean THEN $11::text ELSE cover_photo_key END
      WHERE id = $1
      RETURNING *
    `,
    [
      eventId,
      input.title !== undefined,
      input.title ?? null,
      input.description !== undefined,
      input.description ?? null,
      input.startsAt !== undefined,
      input.startsAt ?? null,
      input.location !== undefined,
      input.location ?? null,
      input.coverPhotoKey !== undefined,
      input.coverPhotoKey ?? null,
    ],
  );

  const row = result.rows[0];
  return row ? mapEventRow(row) : null;
}

export async function deleteEvent(pool: Pool, eventId: string): Promise<boolean> {
  const result = await pool.query(
    `
      DELETE FROM events
      WHERE id = $1
    `,
    [eventId],
  );

  return (result.rowCount ?? 0) > 0;
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
