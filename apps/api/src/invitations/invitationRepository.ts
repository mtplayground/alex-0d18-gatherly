import type { Pool } from 'pg';
import { mapInvitationRow, type InvitationRecord, type InvitationRow } from './invitationModel';

export interface CreateInvitationInput {
  eventId: string;
  invitedUserSub: string;
  invitedBySub: string;
}

const invitationSelect = `
  event_invitations.*,
  invited_user.name AS invited_user_name,
  invited_user.email AS invited_user_email,
  invited_by.name AS invited_by_name,
  invited_by.email AS invited_by_email
`;

const invitationJoins = `
  JOIN users invited_user ON invited_user.sub = event_invitations.invited_user_sub
  JOIN users invited_by ON invited_by.sub = event_invitations.invited_by_sub
`;

export async function createInvitation(
  pool: Pool,
  input: CreateInvitationInput,
): Promise<InvitationRecord> {
  const result = await pool.query<InvitationRow>(
    `
      WITH saved_invitation AS (
        INSERT INTO event_invitations (
          event_id,
          invited_user_sub,
          invited_by_sub
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (event_id, invited_user_sub) DO UPDATE
        SET
          invited_by_sub = EXCLUDED.invited_by_sub,
          revoked_at = NULL,
          updated_at = NOW()
        RETURNING *
      )
      SELECT
        saved_invitation.*,
        invited_user.name AS invited_user_name,
        invited_user.email AS invited_user_email,
        invited_by.name AS invited_by_name,
        invited_by.email AS invited_by_email
      FROM saved_invitation
      JOIN users invited_user ON invited_user.sub = saved_invitation.invited_user_sub
      JOIN users invited_by ON invited_by.sub = saved_invitation.invited_by_sub
    `,
    [input.eventId, input.invitedUserSub, input.invitedBySub],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('Invitation insert did not return a row');
  }

  return mapInvitationRow(row);
}

export async function listInvitationsByEvent(
  pool: Pool,
  eventId: string,
): Promise<InvitationRecord[]> {
  const result = await pool.query<InvitationRow>(
    `
      SELECT ${invitationSelect}
      FROM event_invitations
      ${invitationJoins}
      WHERE event_invitations.event_id = $1
      ORDER BY event_invitations.created_at ASC
    `,
    [eventId],
  );

  return result.rows.map(mapInvitationRow);
}
