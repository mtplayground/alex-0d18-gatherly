import { USER_ROLES, type UserProfile, type UserRole } from '@app/shared';

export type AccountMetadata = Record<string, unknown>;

export interface UserRow {
  sub: string;
  email: string;
  name: string | null;
  profile_photo_key: string | null;
  role: UserRole;
  email_verified: boolean;
  account_metadata: AccountMetadata;
  created_at: Date;
  updated_at: Date;
  last_seen_at: Date | null;
  disabled_at: Date | null;
}

export interface UserRecord {
  sub: string;
  email: string;
  name: string | null;
  profilePhotoKey: string | null;
  role: UserRole;
  emailVerified: boolean;
  accountMetadata: AccountMetadata;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date | null;
  disabledAt: Date | null;
}

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

export function mapUserRow(row: UserRow): UserRecord {
  return {
    sub: row.sub,
    email: row.email,
    name: row.name,
    profilePhotoKey: row.profile_photo_key,
    role: row.role,
    emailVerified: row.email_verified,
    accountMetadata: row.account_metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at,
    disabledAt: row.disabled_at,
  };
}

export function toUserProfile(user: UserRecord): UserProfile {
  return {
    sub: user.sub,
    email: user.email,
    name: user.name,
    profilePhotoKey: user.profilePhotoKey,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
  };
}
