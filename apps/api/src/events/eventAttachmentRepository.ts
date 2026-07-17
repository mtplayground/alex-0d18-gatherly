import type { Pool } from 'pg';
import {
  mapEventAttachmentRow,
  type EventAttachmentRecord,
  type EventAttachmentRow,
} from './eventAttachmentModel';

export interface CreateEventAttachmentInput {
  eventId: string;
  uploadedBySub: string;
  objectKey: string;
  fileName: string;
  contentType: string;
  byteSize: number;
}

export async function listEventAttachments(
  pool: Pool,
  eventId: string,
): Promise<EventAttachmentRecord[]> {
  const result = await pool.query<EventAttachmentRow>(
    `
      SELECT *
      FROM event_attachments
      WHERE event_id = $1
      ORDER BY created_at DESC, id DESC
    `,
    [eventId],
  );

  return result.rows.map(mapEventAttachmentRow);
}

export async function createEventAttachment(
  pool: Pool,
  input: CreateEventAttachmentInput,
): Promise<EventAttachmentRecord> {
  const result = await pool.query<EventAttachmentRow>(
    `
      INSERT INTO event_attachments (
        event_id,
        uploaded_by_sub,
        object_key,
        file_name,
        content_type,
        byte_size
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [
      input.eventId,
      input.uploadedBySub,
      input.objectKey,
      input.fileName,
      input.contentType,
      input.byteSize,
    ],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('Event attachment insert did not return a row');
  }

  return mapEventAttachmentRow(row);
}
