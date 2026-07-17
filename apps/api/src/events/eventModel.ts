import type { EventProfile } from '@app/shared';

export interface EventRow {
  id: string;
  organizer_sub: string;
  title: string;
  description: string | null;
  starts_at: Date;
  location: string;
  cover_photo_key: string | null;
  created_at: Date;
  updated_at: Date;
  canceled_at: Date | null;
}

export interface EventRecord {
  id: string;
  organizerSub: string;
  title: string;
  description: string | null;
  startsAt: Date;
  location: string;
  coverPhotoKey: string | null;
  createdAt: Date;
  updatedAt: Date;
  canceledAt: Date | null;
}

export function mapEventRow(row: EventRow): EventRecord {
  return {
    id: row.id,
    organizerSub: row.organizer_sub,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    location: row.location,
    coverPhotoKey: row.cover_photo_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canceledAt: row.canceled_at,
  };
}

export function toEventProfile(event: EventRecord): EventProfile {
  return {
    id: event.id,
    organizerSub: event.organizerSub,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    location: event.location,
    coverPhotoKey: event.coverPhotoKey,
    coverPhotoUrl: null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    canceledAt: event.canceledAt ? event.canceledAt.toISOString() : null,
  };
}
