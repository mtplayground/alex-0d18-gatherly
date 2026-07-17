import { createHash, randomBytes } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { UserRecord } from '../users/userModel';
import { mapUserRow, type UserRow } from '../users/userModel';

const tokenTtlMinutes = 60;

export interface PasswordResetToken {
  token: string;
  expiresAt: Date;
}

export interface ConsumedPasswordReset {
  sub: string;
  email: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function markExistingTokensConsumed(client: PoolClient, sub: string, email: string) {
  await client.query(
    `
      UPDATE password_reset_tokens
      SET consumed_at = NOW()
      WHERE sub = $1
        AND email = $2
        AND consumed_at IS NULL
    `,
    [sub, email],
  );
}

export async function findUserByEmail(pool: Pool, email: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRow>(
    `
      SELECT *
      FROM users
      WHERE email = $1
        AND disabled_at IS NULL
      LIMIT 1
    `,
    [email],
  );

  const row = result.rows[0];
  return row ? mapUserRow(row) : null;
}

export async function createPasswordResetToken(
  pool: Pool,
  user: UserRecord,
): Promise<PasswordResetToken> {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + tokenTtlMinutes * 60 * 1000);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await markExistingTokensConsumed(client, user.sub, user.email);
    await client.query(
      `
        INSERT INTO password_reset_tokens (
          token_hash,
          sub,
          email,
          expires_at
        )
        VALUES ($1, $2, $3, $4)
      `,
      [tokenHash, user.sub, user.email, expiresAt],
    );
    await client.query('COMMIT');

    return { token, expiresAt };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function consumePasswordResetToken(
  pool: Pool,
  token: string,
): Promise<ConsumedPasswordReset | null> {
  const tokenHash = hashToken(token);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const tokenResult = await client.query<ConsumedPasswordReset>(
      `
        UPDATE password_reset_tokens
        SET consumed_at = NOW()
        WHERE token_hash = $1
          AND consumed_at IS NULL
          AND expires_at > NOW()
        RETURNING sub, email
      `,
      [tokenHash],
    );

    const tokenRow = tokenResult.rows[0];
    if (!tokenRow) {
      await client.query('ROLLBACK');
      return null;
    }

    const userResult = await client.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM users
          WHERE sub = $1
            AND email = $2
            AND disabled_at IS NULL
        )
      `,
      [tokenRow.sub, tokenRow.email],
    );

    if (!userResult.rows[0]?.exists) {
      await client.query('ROLLBACK');
      return null;
    }

    await markExistingTokensConsumed(client, tokenRow.sub, tokenRow.email);
    await client.query('COMMIT');

    return tokenRow;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
