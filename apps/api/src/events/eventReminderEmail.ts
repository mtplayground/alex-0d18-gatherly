import type { EventRecord } from './eventModel';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function eventDateLabel(event: EventRecord): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(event.startsAt);
}

export function buildEventReminderEmail(input: {
  event: EventRecord;
  eventUrl: string;
  memberName: string | null;
  memberEmail: string;
}) {
  const member = input.memberName ?? input.memberEmail;
  const host = input.event.organizerName ?? input.event.organizerEmail ?? 'your host';
  const escapedMember = escapeHtml(member);
  const escapedTitle = escapeHtml(input.event.title);
  const escapedHost = escapeHtml(host);
  const escapedLocation = escapeHtml(input.event.location);
  const escapedDate = escapeHtml(eventDateLabel(input.event));
  const escapedUrl = escapeHtml(input.eventUrl);

  return {
    subject: `Reminder: ${input.event.title} is coming up`,
    text: [
      `Hi ${member},`,
      '',
      `${input.event.title} is coming up soon.`,
      `${eventDateLabel(input.event)} at ${input.event.location}.`,
      `Hosted by ${host}.`,
      '',
      `View the event: ${input.eventUrl}`,
    ].join('\n'),
    html: `
      <p>Hi ${escapedMember},</p>
      <p><strong>${escapedTitle}</strong> is coming up soon.</p>
      <p>${escapedDate}<br>${escapedLocation}</p>
      <p>Hosted by ${escapedHost}.</p>
      <p><a href="${escapedUrl}">View the event</a></p>
    `,
  };
}
