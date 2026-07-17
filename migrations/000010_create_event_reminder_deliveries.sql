-- migrate:up
CREATE TABLE event_reminder_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_sub TEXT NOT NULL REFERENCES users(sub) ON DELETE CASCADE,
  reminder_kind TEXT NOT NULL DEFAULT '24h',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 1,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT event_reminder_deliveries_kind_check CHECK (reminder_kind IN ('24h')),
  CONSTRAINT event_reminder_deliveries_status_check CHECK (status IN ('pending', 'sent', 'failed')),
  CONSTRAINT event_reminder_deliveries_attempts_positive CHECK (attempts > 0),
  CONSTRAINT event_reminder_deliveries_unique_member UNIQUE (event_id, member_sub, reminder_kind)
);

COMMENT ON TABLE event_reminder_deliveries IS 'Idempotency and delivery state for scheduled Gatherly event reminder emails.';
COMMENT ON COLUMN event_reminder_deliveries.reminder_kind IS 'Reminder window identifier, currently 24h before event start.';

CREATE INDEX event_reminder_deliveries_status_updated_idx ON event_reminder_deliveries (status, updated_at);
CREATE INDEX event_reminder_deliveries_member_sub_idx ON event_reminder_deliveries (member_sub);

CREATE TRIGGER event_reminder_deliveries_set_updated_at
BEFORE UPDATE ON event_reminder_deliveries
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- migrate:down
DROP TRIGGER IF EXISTS event_reminder_deliveries_set_updated_at ON event_reminder_deliveries;
DROP TABLE IF EXISTS event_reminder_deliveries;
