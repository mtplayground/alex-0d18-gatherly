import type { Pool } from 'pg';
import { createActivityLog } from '../activity/activityLogRepository';
import { mapCommentRow, type CommentRecord, type CommentRow } from './commentModel';

export interface CreateCommentInput {
  eventId: string;
  authorSub: string;
  body: string;
}

const commentSelect = `
  event_comments.*,
  users.name AS author_name,
  users.email AS author_email,
  users.profile_photo_key AS author_profile_photo_key
`;

const commentJoin = `
  JOIN users ON users.sub = event_comments.author_sub
`;

export async function listCommentsByEvent(pool: Pool, eventId: string): Promise<CommentRecord[]> {
  const result = await pool.query<CommentRow>(
    `
      SELECT ${commentSelect}
      FROM event_comments
      ${commentJoin}
      WHERE event_comments.event_id = $1
        AND event_comments.deleted_at IS NULL
      ORDER BY event_comments.created_at ASC, event_comments.id ASC
    `,
    [eventId],
  );

  return result.rows.map(mapCommentRow);
}

export async function createComment(pool: Pool, input: CreateCommentInput): Promise<CommentRecord> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query<CommentRow>(
      `
        WITH saved_comment AS (
          INSERT INTO event_comments (
            event_id,
            author_sub,
            body
          )
          VALUES ($1, $2, $3)
          RETURNING *
        )
        SELECT
          saved_comment.*,
          users.name AS author_name,
          users.email AS author_email,
          users.profile_photo_key AS author_profile_photo_key
        FROM saved_comment
        JOIN users ON users.sub = saved_comment.author_sub
      `,
      [input.eventId, input.authorSub, input.body],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Comment insert did not return a row');
    }

    await createActivityLog(client, {
      eventId: input.eventId,
      actorSub: input.authorSub,
      action: 'comment_created',
      commentId: row.id,
    });

    await client.query('COMMIT');
    return mapCommentRow(row);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
