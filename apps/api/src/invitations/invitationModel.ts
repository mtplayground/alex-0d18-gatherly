import type { InvitationProfile } from '@app/shared';

export interface InvitationRow {
  id: string;
  event_id: string;
  invited_user_sub: string;
  invited_by_sub: string;
  invited_user_name?: string | null;
  invited_user_email?: string | null;
  invited_by_name?: string | null;
  invited_by_email?: string | null;
  created_at: Date;
  updated_at: Date;
  revoked_at: Date | null;
}

export interface InvitationRecord {
  id: string;
  eventId: string;
  invitedUserSub: string;
  invitedBySub: string;
  invitedUserName: string | null;
  invitedUserEmail: string | null;
  invitedByName: string | null;
  invitedByEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
}

export function mapInvitationRow(row: InvitationRow): InvitationRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    invitedUserSub: row.invited_user_sub,
    invitedBySub: row.invited_by_sub,
    invitedUserName: row.invited_user_name ?? null,
    invitedUserEmail: row.invited_user_email ?? null,
    invitedByName: row.invited_by_name ?? null,
    invitedByEmail: row.invited_by_email ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    revokedAt: row.revoked_at,
  };
}

export function toInvitationProfile(invitation: InvitationRecord): InvitationProfile {
  return {
    id: invitation.id,
    eventId: invitation.eventId,
    invitedUserSub: invitation.invitedUserSub,
    invitedBySub: invitation.invitedBySub,
    invitedUserName: invitation.invitedUserName,
    invitedUserEmail: invitation.invitedUserEmail,
    invitedByName: invitation.invitedByName,
    invitedByEmail: invitation.invitedByEmail,
    createdAt: invitation.createdAt.toISOString(),
    updatedAt: invitation.updatedAt.toISOString(),
    revokedAt: invitation.revokedAt ? invitation.revokedAt.toISOString() : null,
  };
}
