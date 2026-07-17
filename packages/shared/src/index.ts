export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface HealthResponse {
  status: 'ok';
  service: 'api';
  database: {
    status: 'ok';
  };
  timestamp: string;
}

export type ApiResult<T> = T | ApiErrorResponse;

export const USER_ROLES = ['Organizer', 'Member'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const RSVP_STATUSES = ['yes', 'no', 'maybe'] as const;

export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export interface UserProfile {
  sub: string;
  email: string;
  name: string | null;
  profilePhotoKey: string | null;
  profilePhotoUrl: string | null;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
}

export interface AuthLoginUrlResponse {
  loginUrl: string;
}

export interface AuthSessionResponse {
  user: UserProfile;
  registration: 'created' | 'returning';
}

export interface UpdateCurrentUserRequest {
  role: UserRole;
}

export interface ProfilePhotoUploadResponse {
  user: UserProfile;
}

export interface EventProfile {
  id: string;
  organizerSub: string;
  organizerName: string | null;
  organizerEmail: string | null;
  title: string;
  description: string | null;
  startsAt: string;
  location: string;
  rsvpCount: number;
  coverPhotoKey: string | null;
  coverPhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  canceledAt: string | null;
}

export interface EventResponse {
  event: EventProfile;
}

export interface EventListResponse {
  events: EventProfile[];
}

export interface InvitationProfile {
  id: string;
  eventId: string;
  invitedUserSub: string;
  invitedBySub: string;
  invitedUserName: string | null;
  invitedUserEmail: string | null;
  invitedByName: string | null;
  invitedByEmail: string | null;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
}

export type InvitationEmailStatus =
  'sent' | 'email_not_configured' | 'email_rate_limited' | 'email_failed';

export interface CreateInvitationRequest {
  email: string;
}

export interface InvitationResponse {
  invitation: InvitationProfile;
  emailStatus: InvitationEmailStatus;
}

export interface RsvpProfile {
  eventId: string;
  memberSub: string;
  status: RsvpStatus;
  memberName: string | null;
  memberEmail: string | null;
  createdAt: string;
  updatedAt: string;
  respondedAt: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string | null;
  startsAt: string;
  location: string;
  coverPhotoKey?: string | null;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string | null;
  startsAt?: string;
  location?: string;
  coverPhotoKey?: string | null;
}

export type VerificationEmailStatus = 'sent' | 'already_verified' | 'email_not_configured';

export interface VerificationEmailResponse {
  status: VerificationEmailStatus;
  expiresAt: string | null;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  status: 'verified';
  user: UserProfile;
}

export type PasswordResetRequestStatus = 'sent' | 'email_not_configured';

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetRequestResponse {
  status: PasswordResetRequestStatus;
  expiresAt: string | null;
}

export interface PasswordResetConfirmRequest {
  token: string;
}

export interface PasswordResetConfirmResponse {
  status: 'confirmed';
  loginUrl: string;
}
