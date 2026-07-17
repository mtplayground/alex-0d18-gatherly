import type { Pool } from 'pg';
import type { MctaiSessionClaims } from '../auth/session';
import { mapUserRow, type UserRecord, type UserRow } from './userModel';

interface UpsertUserRow extends UserRow {
  was_created: boolean;
}

export interface UpsertAuthenticatedUserResult {
  user: UserRecord;
  registration: 'created' | 'returning';
}

export async function upsertAuthenticatedUser(
  pool: Pool,
  claims: MctaiSessionClaims,
): Promise<UpsertAuthenticatedUserResult> {
  const result = await pool.query<UpsertUserRow>(
    `
      INSERT INTO users (
        sub,
        email,
        name,
        email_verified,
        last_seen_at,
        account_metadata
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        NOW(),
        jsonb_strip_nulls(jsonb_build_object(
          'auth_picture', $5::text
        ))
      )
      ON CONFLICT (sub) DO UPDATE
      SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        email_verified = EXCLUDED.email_verified,
        last_seen_at = NOW(),
        account_metadata = users.account_metadata || EXCLUDED.account_metadata,
        updated_at = NOW()
      RETURNING users.*, (xmax = 0) AS was_created
    `,
    [claims.sub, claims.email, claims.name, claims.emailVerified, claims.picture],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('User upsert did not return a row');
  }

  return {
    user: mapUserRow(row),
    registration: row.was_created ? 'created' : 'returning',
  };
}
