-- migrate:up
CREATE TABLE event_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  uploaded_by_sub TEXT REFERENCES users(sub) ON DELETE SET NULL,
  object_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/pdf',
  byte_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT event_attachments_object_key_not_blank CHECK (length(trim(object_key)) > 0),
  CONSTRAINT event_attachments_file_name_not_blank CHECK (length(trim(file_name)) > 0),
  CONSTRAINT event_attachments_content_type_pdf CHECK (content_type = 'application/pdf'),
  CONSTRAINT event_attachments_byte_size_positive CHECK (byte_size > 0)
);

COMMENT ON TABLE event_attachments IS 'PDF attachments stored in private object storage and linked to Gatherly events.';
COMMENT ON COLUMN event_attachments.object_key IS 'Relative object storage key. The configured object storage prefix is prepended at S3 call sites.';

CREATE INDEX event_attachments_event_created_at_idx ON event_attachments (event_id, created_at DESC);
CREATE INDEX event_attachments_uploaded_by_sub_idx ON event_attachments (uploaded_by_sub);

-- migrate:down
DROP TABLE IF EXISTS event_attachments;
