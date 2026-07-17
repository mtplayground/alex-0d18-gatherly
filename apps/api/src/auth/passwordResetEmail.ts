import type { EmailConfig } from '../config';
import { sendEmail } from '../email/emailClient';
import type { UserRecord } from '../users/userModel';

export type PasswordResetEmailStatus = 'sent' | 'email_not_configured';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildPasswordResetUrl(selfUrl: string, token: string): string {
  const url = new URL('/reset-password', selfUrl);
  url.searchParams.set('token', token);

  return url.toString();
}

export async function sendPasswordResetEmail(
  emailConfig: EmailConfig | undefined,
  selfUrl: string,
  user: UserRecord,
  token: string,
): Promise<PasswordResetEmailStatus> {
  if (!emailConfig) {
    return 'email_not_configured';
  }

  const resetUrl = buildPasswordResetUrl(selfUrl, token);
  const displayName = escapeHtml(user.name ?? user.email);
  const safeUrl = escapeHtml(resetUrl);

  await sendEmail(emailConfig, {
    to: user.email,
    subject: 'Reset your password',
    html: `
      <p>Hi ${displayName},</p>
      <p>Use this secure link to continue password reset.</p>
      <p><a href="${safeUrl}">Reset password</a></p>
      <p>This link expires in 1 hour.</p>
    `,
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
  });

  return 'sent';
}
