-- migrate:up
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_sub TEXT NOT NULL REFERENCES users(sub) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  cover_photo_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  canceled_at TIMESTAMPTZ,
  CONSTRAINT events_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT events_description_not_blank CHECK (
    description IS NULL OR length(trim(description)) > 0
  ),
  CONSTRAINT events_location_not_blank CHECK (length(trim(location)) > 0),
  CONSTRAINT events_cover_photo_key_not_blank CHECK (
    cover_photo_key IS NULL OR length(trim(cover_photo_key)) > 0
  )
);

COMMENT ON TABLE events IS 'Gatherly events owned by organizer users.';
COMMENT ON COLUMN events.organizer_sub IS 'Organizer user subject from users.sub.';
COMMENT ON COLUMN events.cover_photo_key IS 'Private object storage key/reference; never a public URL.';

CREATE INDEX events_organizer_sub_idx ON events (organizer_sub);
CREATE INDEX events_starts_at_idx ON events (starts_at);
CREATE INDEX events_active_starts_at_idx ON events (starts_at)
WHERE canceled_at IS NULL;

CREATE TRIGGER events_set_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- migrate:down
DROP TRIGGER IF EXISTS events_set_updated_at ON events;
DROP TABLE IF EXISTS events;
