-- migrate:up
CREATE TABLE users (
  sub TEXT PRIMARY KEY,
  email CITEXT NOT NULL UNIQUE,
  name TEXT,
  profile_photo_key TEXT,
  role TEXT NOT NULL DEFAULT 'Member',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  account_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  CONSTRAINT users_sub_not_blank CHECK (length(trim(sub)) > 0),
  CONSTRAINT users_email_not_blank CHECK (length(trim(email::text)) > 0),
  CONSTRAINT users_name_not_blank CHECK (name IS NULL OR length(trim(name)) > 0),
  CONSTRAINT users_profile_photo_key_not_blank CHECK (
    profile_photo_key IS NULL OR length(trim(profile_photo_key)) > 0
  ),
  CONSTRAINT users_role_check CHECK (role IN ('Organizer', 'Member')),
  CONSTRAINT users_account_metadata_object CHECK (jsonb_typeof(account_metadata) = 'object')
);

COMMENT ON COLUMN users.sub IS 'Stable subject from the platform auth session.';
COMMENT ON COLUMN users.profile_photo_key IS 'Private object storage key/reference; never a public URL.';
COMMENT ON COLUMN users.account_metadata IS 'Application-owned account metadata stored as a JSON object.';

CREATE INDEX users_role_idx ON users (role);
CREATE INDEX users_last_seen_at_idx ON users (last_seen_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- migrate:down
DROP TRIGGER IF EXISTS users_set_updated_at ON users;
DROP TABLE IF EXISTS users;
DROP FUNCTION IF EXISTS set_updated_at();
