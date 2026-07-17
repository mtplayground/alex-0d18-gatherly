-- migrate:up
ALTER TABLE event_activity_logs
DROP CONSTRAINT event_activity_logs_action_check;

ALTER TABLE event_activity_logs
ADD CONSTRAINT event_activity_logs_action_check CHECK (
  action IN ('event_created', 'event_updated', 'rsvp_submitted', 'comment_created')
);

COMMENT ON TABLE event_activity_logs IS 'Append-only event activity history for created, edited, RSVP, and comment actions.';

-- migrate:down
ALTER TABLE event_activity_logs
DROP CONSTRAINT event_activity_logs_action_check;

ALTER TABLE event_activity_logs
ADD CONSTRAINT event_activity_logs_action_check CHECK (
  action IN ('event_created', 'rsvp_submitted', 'comment_created')
);

COMMENT ON TABLE event_activity_logs IS 'Append-only event activity history for created, RSVP, and comment actions.';
