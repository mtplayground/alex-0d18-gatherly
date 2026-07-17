import type { RsvpProfile, RsvpStatus } from '@app/shared';

export interface RsvpRow {
  event_id: string;
  member_sub: string;
  status: RsvpStatus;
  member_name?: string | null;
  member_email?: string | null;
  created_at: Date;
  updated_at: Date;
  responded_at: Date;
}

export interface RsvpRecord {
  eventId: string;
  memberSub: string;
  status: RsvpStatus;
  memberName: string | null;
  memberEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
  respondedAt: Date;
}

export function mapRsvpRow(row: RsvpRow): RsvpRecord {
  return {
    eventId: row.event_id,
    memberSub: row.member_sub,
    status: row.status,
    memberName: row.member_name ?? null,
    memberEmail: row.member_email ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    respondedAt: row.responded_at,
  };
}

export function toRsvpProfile(rsvp: RsvpRecord): RsvpProfile {
  return {
    eventId: rsvp.eventId,
    memberSub: rsvp.memberSub,
    status: rsvp.status,
    memberName: rsvp.memberName,
    memberEmail: rsvp.memberEmail,
    createdAt: rsvp.createdAt.toISOString(),
    updatedAt: rsvp.updatedAt.toISOString(),
    respondedAt: rsvp.respondedAt.toISOString(),
  };
}
