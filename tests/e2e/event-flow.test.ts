import assert from 'node:assert/strict';
import test from 'node:test';

import type { EmailConfig } from '../../apps/api/src/config';
import { sendVerificationEmail } from '../../apps/api/src/auth/emailVerificationEmail';
import type { UserRecord } from '../../apps/api/src/users/userModel';
import type { EventRecord } from '../../apps/api/src/events/eventModel';
import { buildInvitationEmail } from '../../apps/api/src/invitations/invitationEmail';
import type { InvitationRecord } from '../../apps/api/src/invitations/invitationModel';
import type { RsvpRecord } from '../../apps/api/src/rsvps/rsvpModel';
import { buildRsvpConfirmationEmail } from '../../apps/api/src/rsvps/rsvpConfirmationEmail';
import type { CommentRecord } from '../../apps/api/src/comments/commentModel';
import { buildEventReminderEmail } from '../../apps/api/src/events/eventReminderEmail';
import { sendEmail } from '../../apps/api/src/email/emailClient';

interface EmailRequestBody {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  from?: string;
}

interface CapturedEmail {
  url: string;
  authorization: string | null;
  body: EmailRequestBody;
}

const emailConfig: EmailConfig = {
  url: 'https://email.test/send',
  appToken: 'app-email-token',
};

const selfUrl = 'https://gatherly.test';
const now = new Date('2026-07-17T12:00:00.000Z');
const startsAt = new Date('2026-07-18T21:00:00.000Z');

function makeUser(overrides: Partial<UserRecord>): UserRecord {
  return {
    sub: 'user-default',
    email: 'default@example.com',
    name: 'Default User',
    profilePhotoKey: null,
    role: 'member',
    emailVerified: true,
    accountMetadata: {},
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
    disabledAt: null,
    ...overrides,
  };
}

test('full member event journey sends expected emails and records the social flow', async (t) => {
  const sentEmails: CapturedEmail[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input, init) => {
    assert.equal(input, emailConfig.url);
    assert.equal(init?.method, 'POST');
    assert.equal(init?.headers?.['Authorization'], `Bearer ${emailConfig.appToken}`);
    assert.equal(init?.headers?.['Content-Type'], 'application/json');

    const body = JSON.parse(String(init?.body)) as EmailRequestBody;
    sentEmails.push({
      url: String(input),
      authorization: init?.headers?.['Authorization'] ?? null,
      body,
    });

    return {
      ok: true,
      status: 200,
      json: async () => ({ id: `msg_${sentEmails.length}` }),
      text: async () => '',
    } as Response;
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const organizer = makeUser({
    sub: 'organizer-1',
    email: 'host@example.com',
    name: 'Avery Host',
    role: 'organizer',
    emailVerified: false,
  });

  const member = makeUser({
    sub: 'member-1',
    email: 'member@example.com',
    name: 'Mina Member',
    profilePhotoKey: 'avatars/member-1.jpg',
    role: 'member',
  });

  const verificationStatus = await sendVerificationEmail(
    emailConfig,
    selfUrl,
    organizer,
    'verify-token-123',
  );
  assert.equal(verificationStatus, 'sent');

  const verifiedOrganizer = { ...organizer, emailVerified: true, updatedAt: now };
  assert.equal(verifiedOrganizer.emailVerified, true);

  const event: EventRecord = {
    id: 'event-1',
    organizerSub: verifiedOrganizer.sub,
    organizerName: verifiedOrganizer.name,
    organizerEmail: verifiedOrganizer.email,
    title: 'Rooftop Film Night',
    description: 'Bring a blanket and a favorite snack.',
    startsAt,
    location: '101 Market Street Roof Deck',
    coverPhotoKey: 'events/event-1/cover/rooftop-film-night.jpg',
    rsvpCount: 0,
    createdAt: now,
    updatedAt: now,
    canceledAt: null,
  };

  assert.match(event.coverPhotoKey ?? '', /^events\/event-1\/cover\/.+\.jpg$/);
  assert.doesNotMatch(event.coverPhotoKey ?? '', /^https?:\/\//);

  const eventUrl = `${selfUrl}/events/${event.id}`;
  const invitation: InvitationRecord = {
    id: 'invitation-1',
    eventId: event.id,
    invitedUserSub: member.sub,
    invitedBySub: verifiedOrganizer.sub,
    invitedUserName: member.name,
    invitedUserEmail: member.email,
    invitedByName: verifiedOrganizer.name,
    invitedByEmail: verifiedOrganizer.email,
    createdAt: now,
    updatedAt: now,
    revokedAt: null,
  };

  const invitationEmail = buildInvitationEmail({ event, invitation, eventUrl });
  await sendEmail(emailConfig, {
    to: member.email,
    subject: invitationEmail.subject,
    html: invitationEmail.html,
    text: invitationEmail.text,
    replyTo: verifiedOrganizer.email,
  });

  const rsvp: RsvpRecord = {
    eventId: event.id,
    memberSub: member.sub,
    status: 'yes',
    memberName: member.name,
    memberEmail: member.email,
    createdAt: now,
    updatedAt: now,
    respondedAt: now,
  };

  const eventAfterRsvp: EventRecord = {
    ...event,
    rsvpCount: 1,
    updatedAt: now,
  };

  const rsvpEmail = buildRsvpConfirmationEmail({
    event: eventAfterRsvp,
    eventUrl,
    rsvp,
  });
  await sendEmail(emailConfig, {
    to: member.email,
    subject: rsvpEmail.subject,
    html: rsvpEmail.html,
    text: rsvpEmail.text,
  });

  const comment: CommentRecord = {
    id: 'comment-1',
    eventId: event.id,
    authorSub: member.sub,
    authorName: member.name,
    authorEmail: member.email,
    authorProfilePhotoKey: member.profilePhotoKey,
    body: 'I will bring popcorn.',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const comments = [comment];
  assert.deepEqual(
    comments.map((entry) => ({
      eventId: entry.eventId,
      authorSub: entry.authorSub,
      avatar: entry.authorProfilePhotoKey,
      body: entry.body,
    })),
    [
      {
        eventId: event.id,
        authorSub: member.sub,
        avatar: 'avatars/member-1.jpg',
        body: 'I will bring popcorn.',
      },
    ],
  );

  const reminderEmail = buildEventReminderEmail({
    event: eventAfterRsvp,
    eventUrl,
    memberName: member.name,
    memberEmail: member.email,
  });
  await sendEmail(emailConfig, {
    to: member.email,
    subject: reminderEmail.subject,
    html: reminderEmail.html,
    text: reminderEmail.text,
  });

  assert.equal(eventAfterRsvp.rsvpCount, 1);
  assert.equal(sentEmails.length, 4);
  assert.deepEqual(
    sentEmails.map((message) => message.body.subject),
    [
      'Verify your email',
      'Avery Host invited you to Rooftop Film Night',
      'RSVP confirmed for Rooftop Film Night',
      'Reminder: Rooftop Film Night is coming up',
    ],
  );

  for (const message of sentEmails) {
    assert.equal(message.url, emailConfig.url);
    assert.equal(message.authorization, `Bearer ${emailConfig.appToken}`);
    assert.equal(message.body.from, undefined);
    assert.ok(message.body.html || message.body.text);
  }

  assert.match(sentEmails[0].body.text ?? '', /verify-token-123/);
  assert.match(
    sentEmails[1].body.text ?? '',
    /View the event: https:\/\/gatherly\.test\/events\/event-1/,
  );
  assert.equal(sentEmails[1].body.reply_to, verifiedOrganizer.email);
  assert.match(sentEmails[2].body.text ?? '', /confirmed as: Yes, I am going/);
  assert.match(sentEmails[3].body.text ?? '', /Rooftop Film Night is coming up soon/);
});
