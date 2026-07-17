import type { RsvpStatus } from '@app/shared';
import type { EventRecord } from '../events/eventModel';
import type { RsvpRecord } from './rsvpModel';

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

function responseLabel(status: RsvpStatus): string {
  switch (status) {
    case 'yes':
      return 'Yes, I am going';
    case 'maybe':
      return 'Maybe';
    case 'no':
      return 'No, I cannot make it';
  }
}

export function buildRsvpConfirmationEmail(input: {
  event: EventRecord;
  eventUrl: string;
  rsvp: RsvpRecord;
}) {
  const member = input.rsvp.memberName ?? input.rsvp.memberEmail ?? 'there';
  const host = input.event.organizerName ?? input.event.organizerEmail ?? 'your host';
  const statusLabel = responseLabel(input.rsvp.status);
  const escapedMember = escapeHtml(member);
  const escapedTitle = escapeHtml(input.event.title);
  const escapedHost = escapeHtml(host);
  const escapedLocation = escapeHtml(input.event.location);
  const escapedDate = escapeHtml(eventDateLabel(input.event));
  const escapedStatus = escapeHtml(statusLabel);
  const escapedUrl = escapeHtml(input.eventUrl);

  return {
    subject: `RSVP confirmed for ${input.event.title}`,
    text: [
      `Hi ${member},`,
      '',
      `Your RSVP for ${input.event.title} is confirmed as: ${statusLabel}.`,
      `${eventDateLabel(input.event)} at ${input.event.location}.`,
      `Hosted by ${host}.`,
      '',
      `View the event: ${input.eventUrl}`,
    ].join('\n'),
    html: `
      <p>Hi ${escapedMember},</p>
      <p>Your RSVP for <strong>${escapedTitle}</strong> is confirmed as <strong>${escapedStatus}</strong>.</p>
      <p>${escapedDate}<br>${escapedLocation}</p>
      <p>Hosted by ${escapedHost}.</p>
      <p><a href="${escapedUrl}">View the event</a></p>
    `,
  };
}
