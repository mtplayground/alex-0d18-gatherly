import type { CommentProfile } from '@app/shared';

export interface CommentRow {
  id: string;
  event_id: string;
  author_sub: string;
  author_name?: string | null;
  author_email?: string | null;
  body: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CommentRecord {
  id: string;
  eventId: string;
  authorSub: string;
  authorName: string | null;
  authorEmail: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export function mapCommentRow(row: CommentRow): CommentRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    authorSub: row.author_sub,
    authorName: row.author_name ?? null,
    authorEmail: row.author_email ?? null,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function toCommentProfile(comment: CommentRecord): CommentProfile {
  return {
    id: comment.id,
    eventId: comment.eventId,
    authorSub: comment.authorSub,
    authorName: comment.authorName,
    authorEmail: comment.authorEmail,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    deletedAt: comment.deletedAt ? comment.deletedAt.toISOString() : null,
  };
}
