import type { EventRecord } from '../events/eventModel';
import type { InvitationRecord } from './invitationModel';

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

export function buildInvitationEmail(input: {
  event: EventRecord;
  invitation: InvitationRecord;
  eventUrl: string;
}) {
  const host = input.event.organizerName ?? input.event.organizerEmail ?? 'Your host';
  const invitee = input.invitation.invitedUserName ?? input.invitation.invitedUserEmail ?? 'there';
  const escapedTitle = escapeHtml(input.event.title);
  const escapedHost = escapeHtml(host);
  const escapedInvitee = escapeHtml(invitee);
  const escapedLocation = escapeHtml(input.event.location);
  const escapedDate = escapeHtml(eventDateLabel(input.event));
  const escapedUrl = escapeHtml(input.eventUrl);

  return {
    subject: `${host} invited you to ${input.event.title}`,
    text: [
      `Hi ${invitee},`,
      '',
      `${host} invited you to ${input.event.title}.`,
      `${eventDateLabel(input.event)} at ${input.event.location}.`,
      '',
      `View the event: ${input.eventUrl}`,
    ].join('\n'),
    html: `
      <p>Hi ${escapedInvitee},</p>
      <p><strong>${escapedHost}</strong> invited you to <strong>${escapedTitle}</strong>.</p>
      <p>${escapedDate}<br>${escapedLocation}</p>
      <p><a href="${escapedUrl}">View the event</a></p>
    `,
  };
}
