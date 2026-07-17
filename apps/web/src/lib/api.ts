import type { ApiErrorResponse } from '@app/shared';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

const friendlyErrorMessages: Record<string, string> = {
  attachment_required: 'Choose a PDF before uploading.',
  attachment_too_large: 'That PDF is too large. Upload a file that is 12 MB or smaller.',
  comment_forbidden: 'Only invited members and the organizer can comment on this event.',
  cover_photo_required: 'Choose a cover photo before uploading.',
  cover_photo_too_large: 'That cover photo is too large. Upload an image that is 8 MB or smaller.',
  event_forbidden: 'This event belongs to another Organizer.',
  event_not_found: 'This event is no longer available.',
  invalid_comment: 'Add a shorter comment before posting.',
  invalid_event: 'Check the event details and try again.',
  invalid_invitation: 'Enter a valid member email address.',
  invalid_rsvp: 'Choose yes, no, or maybe before saving your RSVP.',
  invitation_required: 'You need an invitation before you can RSVP to this event.',
  invitee_not_found: 'No active member account exists for that email address.',
  invitee_not_member: 'Only Member accounts can be invited to events.',
  member_required: 'Switch to a Member account to use this action.',
  not_authenticated: 'Sign in to continue.',
  organizer_required: 'Switch to an Organizer account to use this action.',
  unsupported_attachment_type: 'Upload a valid PDF file.',
  unsupported_cover_photo_type: 'Upload a JPEG, PNG, or WebP cover photo.',
};

export function friendlyApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    return friendlyErrorMessages[err.code] ?? err.message;
  }

  return err instanceof Error ? err.message : fallback;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== 'object' || !('error' in value)) {
    return false;
  }

  const error = (value as ApiErrorResponse).error;
  return Boolean(error && typeof error.code === 'string' && typeof error.message === 'string');
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isFormData = init.body instanceof FormData;
  const res = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  const contentType = res.headers.get('content-type') ?? '';
  const payload: unknown = contentType.includes('application/json') ? await res.json() : undefined;

  if (!res.ok) {
    if (isApiErrorResponse(payload)) {
      throw new ApiRequestError(payload.error.message, res.status, payload.error.code);
    }

    throw new ApiRequestError(`Request failed with status ${res.status}`, res.status, 'http_error');
  }

  return payload as T;
}
