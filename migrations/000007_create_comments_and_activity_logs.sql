-- migrate:up
CREATE TABLE event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  author_sub TEXT NOT NULL REFERENCES users(sub) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT event_comments_body_not_blank CHECK (length(trim(body)) > 0)
);

COMMENT ON TABLE event_comments IS 'Comments posted by users on Gatherly events.';
COMMENT ON COLUMN event_comments.author_sub IS 'Comment author subject from users.sub.';

CREATE INDEX event_comments_event_created_at_idx ON event_comments (event_id, created_at DESC)
WHERE deleted_at IS NULL;
CREATE INDEX event_comments_author_sub_idx ON event_comments (author_sub);

CREATE TRIGGER event_comments_set_updated_at
BEFORE UPDATE ON event_comments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE event_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  actor_sub TEXT REFERENCES users(sub) ON DELETE SET NULL,
  action TEXT NOT NULL,
  comment_id UUID REFERENCES event_comments(id) ON DELETE SET NULL,
  rsvp_status TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT event_activity_logs_action_check CHECK (
    action IN ('event_created', 'rsvp_submitted', 'comment_created')
  ),
  CONSTRAINT event_activity_logs_rsvp_status_check CHECK (
    rsvp_status IS NULL OR rsvp_status IN ('yes', 'no', 'maybe')
  ),
  CONSTRAINT event_activity_logs_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT event_activity_logs_comment_action_check CHECK (
    (action = 'comment_created' AND comment_id IS NOT NULL)
    OR (action <> 'comment_created' AND comment_id IS NULL)
  ),
  CONSTRAINT event_activity_logs_rsvp_action_check CHECK (
    (action = 'rsvp_submitted' AND rsvp_status IS NOT NULL)
    OR (action <> 'rsvp_submitted' AND rsvp_status IS NULL)
  )
);

COMMENT ON TABLE event_activity_logs IS 'Append-only event activity history for created, RSVP, and comment actions.';
COMMENT ON COLUMN event_activity_logs.actor_sub IS 'User subject that performed the action, retained as nullable history if the user is deleted.';
COMMENT ON COLUMN event_activity_logs.metadata IS 'Application-owned activity metadata stored as a JSON object.';

CREATE INDEX event_activity_logs_event_created_at_idx ON event_activity_logs (event_id, created_at DESC);
CREATE INDEX event_activity_logs_actor_sub_idx ON event_activity_logs (actor_sub);
CREATE INDEX event_activity_logs_action_idx ON event_activity_logs (action);

-- migrate:down
DROP TABLE IF EXISTS event_activity_logs;
DROP TRIGGER IF EXISTS event_comments_set_updated_at ON event_comments;
DROP TABLE IF EXISTS event_comments;
