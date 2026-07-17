import type { EventAttachmentProfile } from '@app/shared';

export interface EventAttachmentRow {
  id: string;
  event_id: string;
  uploaded_by_sub: string | null;
  object_key: string;
  file_name: string;
  content_type: string;
  byte_size: number;
  created_at: Date;
}

export interface EventAttachmentRecord {
  id: string;
  eventId: string;
  uploadedBySub: string | null;
  objectKey: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  createdAt: Date;
}

export function mapEventAttachmentRow(row: EventAttachmentRow): EventAttachmentRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    uploadedBySub: row.uploaded_by_sub,
    objectKey: row.object_key,
    fileName: row.file_name,
    contentType: row.content_type,
    byteSize: row.byte_size,
    createdAt: row.created_at,
  };
}

export function toEventAttachmentProfile(
  attachment: EventAttachmentRecord,
  downloadUrl: string,
): EventAttachmentProfile {
  return {
    id: attachment.id,
    eventId: attachment.eventId,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    byteSize: attachment.byteSize,
    downloadUrl,
    createdAt: attachment.createdAt.toISOString(),
  };
}
