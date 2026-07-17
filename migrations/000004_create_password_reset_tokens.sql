-- migrate:up
CREATE TABLE password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  sub TEXT NOT NULL REFERENCES users(sub) ON DELETE CASCADE,
  email CITEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  CONSTRAINT password_reset_tokens_hash_not_blank CHECK (length(trim(token_hash)) > 0),
  CONSTRAINT password_reset_tokens_email_not_blank CHECK (length(trim(email::text)) > 0),
  CONSTRAINT password_reset_tokens_expiry_check CHECK (expires_at > created_at)
);

CREATE INDEX password_reset_tokens_sub_idx ON password_reset_tokens (sub);
CREATE INDEX password_reset_tokens_active_idx ON password_reset_tokens (expires_at)
WHERE consumed_at IS NULL;

-- migrate:down
DROP TABLE IF EXISTS password_reset_tokens;
