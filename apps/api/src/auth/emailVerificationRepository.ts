import { createHash, randomBytes } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { mapUserRow, type UserRecord, type UserRow } from '../users/userModel';

const tokenTtlHours = 24;

export interface EmailVerificationToken {
  token: string;
  expiresAt: Date;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function markExistingTokensConsumed(client: PoolClient, sub: string, email: string) {
  await client.query(
    `
      UPDATE email_verification_tokens
      SET consumed_at = NOW()
      WHERE sub = $1
        AND email = $2
        AND consumed_at IS NULL
    `,
    [sub, email],
  );
}

export async function createEmailVerificationToken(
  pool: Pool,
  sub: string,
  email: string,
): Promise<EmailVerificationToken> {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + tokenTtlHours * 60 * 60 * 1000);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await markExistingTokensConsumed(client, sub, email);
    await client.query(
      `
        INSERT INTO email_verification_tokens (
          token_hash,
          sub,
          email,
          expires_at
        )
        VALUES ($1, $2, $3, $4)
      `,
      [tokenHash, sub, email, expiresAt],
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

export async function consumeEmailVerificationToken(
  pool: Pool,
  token: string,
): Promise<UserRecord | null> {
  const tokenHash = hashToken(token);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const tokenResult = await client.query<{ sub: string; email: string }>(
      `
        UPDATE email_verification_tokens
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

    const userResult = await client.query<UserRow>(
      `
        UPDATE users
        SET
          email_verified = TRUE,
          account_metadata = jsonb_set(
            account_metadata,
            '{email_verification}',
            jsonb_build_object('verified_at', NOW()),
            TRUE
          ),
          updated_at = NOW()
        WHERE sub = $1
          AND email = $2
          AND disabled_at IS NULL
        RETURNING *
      `,
      [tokenRow.sub, tokenRow.email],
    );

    const userRow = userResult.rows[0];
    if (!userRow) {
      await client.query('ROLLBACK');
      return null;
    }

    await markExistingTokensConsumed(client, tokenRow.sub, tokenRow.email);
    await client.query('COMMIT');

    return mapUserRow(userRow);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
