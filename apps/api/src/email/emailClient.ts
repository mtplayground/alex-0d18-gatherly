import type { EmailConfig } from '../config';

export class EmailSendError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseBody: string,
  ) {
    super(message);
    this.name = 'EmailSendError';
  }
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(config: EmailConfig, input: SendEmailInput): Promise<string> {
  const res = await fetch(config.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.appToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const responseBody = await res.text();
    if (res.status === 429) {
      throw new EmailSendError('email rate limited', res.status, responseBody);
    }

    throw new EmailSendError(`email send failed: ${res.status}`, res.status, responseBody);
  }

  const payload = (await res.json()) as { id?: unknown };
  if (typeof payload.id !== 'string' || payload.id.length === 0) {
    throw new EmailSendError('email send response did not include an id', res.status, '');
  }

  return payload.id;
}
