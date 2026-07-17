import type { EmailConfig } from '../config';
import { sendEmail } from '../email/emailClient';
import type { UserRecord } from '../users/userModel';

export type VerificationEmailStatus = 'sent' | 'already_verified' | 'email_not_configured';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildVerificationUrl(selfUrl: string, token: string): string {
  const url = new URL('/verify-email', selfUrl);
  url.searchParams.set('token', token);

  return url.toString();
}

export async function sendVerificationEmail(
  emailConfig: EmailConfig | undefined,
  selfUrl: string,
  user: UserRecord,
  token: string,
): Promise<VerificationEmailStatus> {
  if (user.emailVerified) {
    return 'already_verified';
  }

  if (!emailConfig) {
    return 'email_not_configured';
  }

  const verificationUrl = buildVerificationUrl(selfUrl, token);
  const displayName = escapeHtml(user.name ?? user.email);
  const safeUrl = escapeHtml(verificationUrl);

  await sendEmail(emailConfig, {
    to: user.email,
    subject: 'Verify your email',
    html: `
      <p>Hi ${displayName},</p>
      <p>Confirm this email address to unlock full access to your event workspace.</p>
      <p><a href="${safeUrl}">Verify email</a></p>
      <p>This link expires in 24 hours.</p>
    `,
    text: `Verify your email: ${verificationUrl}\n\nThis link expires in 24 hours.`,
  });

  return 'sent';
}
