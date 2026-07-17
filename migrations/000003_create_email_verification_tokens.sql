-- migrate:up
CREATE TABLE email_verification_tokens (
  token_hash TEXT PRIMARY KEY,
  sub TEXT NOT NULL REFERENCES users(sub) ON DELETE CASCADE,
  email CITEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  CONSTRAINT email_verification_tokens_hash_not_blank CHECK (length(trim(token_hash)) > 0),
  CONSTRAINT email_verification_tokens_email_not_blank CHECK (length(trim(email::text)) > 0),
  CONSTRAINT email_verification_tokens_expiry_check CHECK (expires_at > created_at)
);

CREATE INDEX email_verification_tokens_sub_idx ON email_verification_tokens (sub);
CREATE INDEX email_verification_tokens_active_idx ON email_verification_tokens (expires_at)
WHERE consumed_at IS NULL;

-- migrate:down
DROP TABLE IF EXISTS email_verification_tokens;
