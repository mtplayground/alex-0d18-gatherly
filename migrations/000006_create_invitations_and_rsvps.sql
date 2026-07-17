-- migrate:up
CREATE TABLE event_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  invited_user_sub TEXT NOT NULL REFERENCES users(sub) ON DELETE CASCADE,
  invited_by_sub TEXT NOT NULL REFERENCES users(sub) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  CONSTRAINT event_invitations_distinct_users CHECK (invited_user_sub <> invited_by_sub),
  CONSTRAINT event_invitations_unique_invitee UNIQUE (event_id, invited_user_sub)
);

COMMENT ON TABLE event_invitations IS 'Invitations linking Gatherly events to invited users.';
COMMENT ON COLUMN event_invitations.invited_user_sub IS 'Invited user subject from users.sub.';
COMMENT ON COLUMN event_invitations.invited_by_sub IS 'Organizer or sender user subject from users.sub.';

CREATE INDEX event_invitations_event_id_idx ON event_invitations (event_id);
CREATE INDEX event_invitations_invited_user_sub_idx ON event_invitations (invited_user_sub);
CREATE INDEX event_invitations_active_event_idx ON event_invitations (event_id)
WHERE revoked_at IS NULL;

CREATE TRIGGER event_invitations_set_updated_at
BEFORE UPDATE ON event_invitations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE event_rsvps (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_sub TEXT NOT NULL REFERENCES users(sub) ON DELETE CASCADE,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, member_sub),
  CONSTRAINT event_rsvps_status_check CHECK (status IN ('yes', 'no', 'maybe'))
);

COMMENT ON TABLE event_rsvps IS 'Member RSVP response status per event.';
COMMENT ON COLUMN event_rsvps.member_sub IS 'Responding member subject from users.sub.';

CREATE INDEX event_rsvps_event_status_idx ON event_rsvps (event_id, status);
CREATE INDEX event_rsvps_member_sub_idx ON event_rsvps (member_sub);

CREATE TRIGGER event_rsvps_set_updated_at
BEFORE UPDATE ON event_rsvps
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION set_event_rsvp_responded_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.responded_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_rsvps_set_responded_at
BEFORE UPDATE ON event_rsvps
FOR EACH ROW
EXECUTE FUNCTION set_event_rsvp_responded_at();

-- migrate:down
DROP TRIGGER IF EXISTS event_rsvps_set_responded_at ON event_rsvps;
DROP FUNCTION IF EXISTS set_event_rsvp_responded_at();
DROP TRIGGER IF EXISTS event_rsvps_set_updated_at ON event_rsvps;
DROP TABLE IF EXISTS event_rsvps;
DROP TRIGGER IF EXISTS event_invitations_set_updated_at ON event_invitations;
DROP TABLE IF EXISTS event_invitations;
