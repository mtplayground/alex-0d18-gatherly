import type { Pool } from 'pg';
import type { EmailConfig } from '../config';
import { EmailSendError, sendEmail } from '../email/emailClient';
import { buildEventReminderEmail } from './eventReminderEmail';
import {
  claimEventReminderDelivery,
  listDueEventReminderCandidates,
  markEventReminderFailed,
  markEventReminderSent,
} from './eventReminderRepository';

const reminderIntervalMs = 5 * 60 * 1000;

function eventUrl(selfUrl: string, eventId: string): string {
  return new URL(`/events/${eventId}`, selfUrl).toString();
}

function errorMessage(err: unknown): string {
  if (err instanceof EmailSendError) {
    return `${err.message}: ${err.responseBody}`;
  }

  return err instanceof Error ? err.message : 'Unknown reminder email error';
}

export async function runEventReminderJob(input: {
  databasePool: Pool;
  email?: EmailConfig;
  selfUrl: string;
}): Promise<void> {
  if (!input.email) {
    return;
  }

  const candidates = await listDueEventReminderCandidates(input.databasePool);
  for (const candidate of candidates) {
    const claimed = await claimEventReminderDelivery(input.databasePool, {
      eventId: candidate.event.id,
      memberSub: candidate.memberSub,
    });
    if (!claimed) {
      continue;
    }

    const email = buildEventReminderEmail({
      event: candidate.event,
      eventUrl: eventUrl(input.selfUrl, candidate.event.id),
      memberEmail: candidate.memberEmail,
      memberName: candidate.memberName,
    });

    try {
      await sendEmail(input.email, {
        to: candidate.memberEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(candidate.event.organizerEmail ? { replyTo: candidate.event.organizerEmail } : {}),
      });
      await markEventReminderSent(input.databasePool, {
        eventId: candidate.event.id,
        memberSub: candidate.memberSub,
      });
    } catch (err) {
      const message = errorMessage(err);
      await markEventReminderFailed(input.databasePool, {
        eventId: candidate.event.id,
        memberSub: candidate.memberSub,
        error: message,
      });

      if (err instanceof EmailSendError && err.status === 429) {
        console.warn('Event reminder email rate limited', {
          eventId: candidate.event.id,
          memberSub: candidate.memberSub,
        });
      } else {
        console.error('Event reminder email failed', {
          eventId: candidate.event.id,
          memberSub: candidate.memberSub,
          err,
        });
      }
    }
  }
}

export function startEventReminderJob(input: {
  databasePool: Pool;
  email?: EmailConfig;
  selfUrl: string;
}): () => void {
  let isRunning = false;

  const run = () => {
    if (isRunning) {
      return;
    }

    isRunning = true;
    runEventReminderJob(input)
      .catch((err: unknown) => {
        console.error('Event reminder job failed', err);
      })
      .finally(() => {
        isRunning = false;
      });
  };

  run();
  const interval = setInterval(run, reminderIntervalMs);
  return () => clearInterval(interval);
}
