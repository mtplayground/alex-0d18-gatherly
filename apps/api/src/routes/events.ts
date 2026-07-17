import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import type {
  CreateEventRequest,
  EventListResponse,
  EventResponse,
  UpdateEventRequest,
} from '@app/shared';
import type { Pool } from 'pg';
import type { AuthConfig, ObjectStorageConfig } from '../config';
import { createAuthMiddleware } from '../middleware/authMiddleware';
import type { ObjectStorage } from '../storage/objectStorage';
import { createObjectStorage } from '../storage/objectStorage';
import { toEventProfile, type EventRecord } from '../events/eventModel';
import {
  createEvent,
  deleteEvent,
  findEventById,
  listEvents,
  updateEvent,
  type CreateEventInput,
  type UpdateEventInput,
} from '../events/eventRepository';

export interface CreateEventsRouterOptions {
  auth?: AuthConfig;
  databasePool: Pool;
  objectStorage: ObjectStorageConfig;
}

interface ValidationResult<T> {
  value?: T;
  error?: {
    code: string;
    message: string;
  };
}

const allowedCoverPhotoTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
const maxCoverPhotoBytes = 8 * 1024 * 1024;

const coverPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxCoverPhotoBytes,
    files: 1,
  },
});
const coverPhotoUploadSingle = coverPhotoUpload.single('cover');

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function requiredString(value: unknown, field: string): ValidationResult<string> {
  if (typeof value !== 'string') {
    return {
      error: {
        code: 'invalid_event',
        message: `${field} is required`,
      },
    };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return {
      error: {
        code: 'invalid_event',
        message: `${field} must not be blank`,
      },
    };
  }

  return { value: trimmed };
}

function optionalNullableString(
  value: unknown,
  field: string,
): ValidationResult<string | null | undefined> {
  if (value === undefined) {
    return { value: undefined };
  }

  if (value === null) {
    return { value: null };
  }

  if (typeof value !== 'string') {
    return {
      error: {
        code: 'invalid_event',
        message: `${field} must be a string or null`,
      },
    };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return {
      error: {
        code: 'invalid_event',
        message: `${field} must not be blank`,
      },
    };
  }

  return { value: trimmed };
}

function parseStartsAt(value: unknown, required: boolean): ValidationResult<Date | undefined> {
  if (value === undefined && !required) {
    return { value: undefined };
  }

  if (typeof value !== 'string') {
    return {
      error: {
        code: 'invalid_event',
        message: 'startsAt is required',
      },
    };
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return {
      error: {
        code: 'invalid_event',
        message: 'startsAt must be a valid date/time',
      },
    };
  }

  return { value: parsed };
}

function optionalCoverPhotoKey(value: unknown): ValidationResult<string | null | undefined> {
  const parsed = optionalNullableString(value, 'coverPhotoKey');
  if (parsed.error || parsed.value === undefined || parsed.value === null) {
    return parsed;
  }

  if (parsed.value.startsWith('/') || parsed.value.includes('://')) {
    return {
      error: {
        code: 'invalid_event',
        message: 'coverPhotoKey must be a private object key, not a URL',
      },
    };
  }

  return parsed;
}

function parseCreateEventBody(
  body: unknown,
  organizerSub: string,
): ValidationResult<CreateEventInput> {
  if (!isObject(body)) {
    return {
      error: {
        code: 'invalid_event',
        message: 'Event payload must be an object',
      },
    };
  }

  const title = requiredString(body.title, 'title');
  if (title.error) {
    return { error: title.error };
  }
  if (!title.value) {
    return { error: { code: 'invalid_event', message: 'title is required' } };
  }

  const description = optionalNullableString(body.description, 'description');
  if (description.error) {
    return { error: description.error };
  }

  const startsAt = parseStartsAt(body.startsAt, true);
  if (startsAt.error) {
    return { error: startsAt.error };
  }
  if (!startsAt.value) {
    return { error: { code: 'invalid_event', message: 'startsAt is required' } };
  }

  const location = requiredString(body.location, 'location');
  if (location.error) {
    return { error: location.error };
  }
  if (!location.value) {
    return { error: { code: 'invalid_event', message: 'location is required' } };
  }

  const coverPhotoKey = optionalCoverPhotoKey(body.coverPhotoKey);
  if (coverPhotoKey.error) {
    return { error: coverPhotoKey.error };
  }

  return {
    value: {
      organizerSub,
      title: title.value,
      description: description.value ?? null,
      startsAt: startsAt.value,
      location: location.value,
      coverPhotoKey: coverPhotoKey.value ?? null,
    },
  };
}

function parseUpdateEventBody(body: unknown): ValidationResult<UpdateEventInput> {
  if (!isObject(body)) {
    return {
      error: {
        code: 'invalid_event',
        message: 'Event payload must be an object',
      },
    };
  }

  const input: UpdateEventInput = {};

  if ('title' in body) {
    const title = requiredString(body.title, 'title');
    if (title.error) {
      return { error: title.error };
    }
    if (!title.value) {
      return { error: { code: 'invalid_event', message: 'title is required' } };
    }
    input.title = title.value;
  }

  if ('description' in body) {
    const description = optionalNullableString(body.description, 'description');
    if (description.error) {
      return { error: description.error };
    }
    input.description = description.value ?? null;
  }

  if ('startsAt' in body) {
    const startsAt = parseStartsAt(body.startsAt, false);
    if (startsAt.error) {
      return { error: startsAt.error };
    }
    if (!startsAt.value) {
      return { error: { code: 'invalid_event', message: 'startsAt is required' } };
    }
    input.startsAt = startsAt.value;
  }

  if ('location' in body) {
    const location = requiredString(body.location, 'location');
    if (location.error) {
      return { error: location.error };
    }
    if (!location.value) {
      return { error: { code: 'invalid_event', message: 'location is required' } };
    }
    input.location = location.value;
  }

  if ('coverPhotoKey' in body) {
    const coverPhotoKey = optionalCoverPhotoKey(body.coverPhotoKey);
    if (coverPhotoKey.error) {
      return { error: coverPhotoKey.error };
    }
    input.coverPhotoKey = coverPhotoKey.value ?? null;
  }

  if (Object.keys(input).length === 0) {
    return {
      error: {
        code: 'invalid_event',
        message: 'At least one event field must be provided',
      },
    };
  }

  return { value: input };
}

function requireOrganizer(req: Request): ValidationResult<string> {
  const user = req.auth?.user;
  if (!user) {
    return {
      error: {
        code: 'not_authenticated',
        message: 'Not authenticated',
      },
    };
  }

  if (user.role !== 'Organizer') {
    return {
      error: {
        code: 'organizer_required',
        message: 'Only Organizers can modify events',
      },
    };
  }

  return { value: user.sub };
}

function sendValidationError(res: Response, error: { code: string; message: string }) {
  const status = error.code === 'organizer_required' ? 403 : 400;
  res.status(status).json({ error });
}

function requireEventId(req: Request): string {
  const eventId = req.params.eventId;
  if (!eventId) {
    throw new Error('Event route missing eventId parameter');
  }

  return eventId;
}

function buildCoverPhotoKey(eventId: string, contentType: string): string {
  const extension = allowedCoverPhotoTypes.get(contentType);
  if (!extension) {
    throw new Error(`Unsupported event cover photo content type: ${contentType}`);
  }

  return `events/${eventId}/cover/${Date.now()}-${randomUUID()}.${extension}`;
}

function handleCoverPhotoUpload(req: Request, res: Response, next: NextFunction) {
  coverPhotoUploadSingle(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: {
          code: 'cover_photo_too_large',
          message: 'Event cover photo must be 8 MB or smaller',
        },
      });
      return;
    }

    if (err) {
      next(err);
      return;
    }

    next();
  });
}

async function toSignedEvent(storage: ObjectStorage, event: EventRecord) {
  const profile = toEventProfile(event);
  if (!event.coverPhotoKey) {
    return profile;
  }

  return {
    ...profile,
    coverPhotoUrl: await storage.getSignedReadUrl(event.coverPhotoKey),
  };
}

async function ensureOwnedOrganizerEvent(
  pool: Pool,
  eventId: string,
  organizerSub: string,
): Promise<EventRecord | null | 'forbidden'> {
  const event = await findEventById(pool, eventId);
  if (!event) {
    return null;
  }

  if (event.organizerSub !== organizerSub) {
    return 'forbidden';
  }

  return event;
}

export function createEventsRouter(options: CreateEventsRouterOptions): Router {
  const router = Router();
  const objectStorage = createObjectStorage(options.objectStorage);
  const { requireAuth } = createAuthMiddleware({
    databasePool: options.databasePool,
    ...(options.auth ? { auth: options.auth } : {}),
  });

  router.get('/', async (_req, res, next) => {
    try {
      const events = await listEvents(options.databasePool);
      const body: EventListResponse = {
        events: await Promise.all(events.map((event) => toSignedEvent(objectStorage, event))),
      };

      res.json(body);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', requireAuth, async (req, res, next) => {
    try {
      const organizer = requireOrganizer(req);
      if (organizer.error || !organizer.value) {
        sendValidationError(
          res,
          organizer.error ?? { code: 'not_authenticated', message: 'Not authenticated' },
        );
        return;
      }

      const parsed = parseCreateEventBody(req.body as CreateEventRequest, organizer.value);
      if (parsed.error || !parsed.value) {
        sendValidationError(
          res,
          parsed.error ?? { code: 'invalid_event', message: 'Invalid event' },
        );
        return;
      }

      const event = await createEvent(options.databasePool, parsed.value);
      const body: EventResponse = {
        event: await toSignedEvent(objectStorage, event),
      };

      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:eventId', async (req, res, next) => {
    try {
      const event = await findEventById(options.databasePool, requireEventId(req));
      if (!event) {
        res.status(404).json({ error: { code: 'event_not_found', message: 'Event not found' } });
        return;
      }

      const body: EventResponse = {
        event: await toSignedEvent(objectStorage, event),
      };

      res.json(body);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:eventId', requireAuth, async (req, res, next) => {
    try {
      const organizer = requireOrganizer(req);
      if (organizer.error || !organizer.value) {
        sendValidationError(
          res,
          organizer.error ?? { code: 'not_authenticated', message: 'Not authenticated' },
        );
        return;
      }

      const existing = await ensureOwnedOrganizerEvent(
        options.databasePool,
        requireEventId(req),
        organizer.value,
      );
      if (!existing) {
        res.status(404).json({ error: { code: 'event_not_found', message: 'Event not found' } });
        return;
      }
      if (existing === 'forbidden') {
        res.status(403).json({
          error: { code: 'event_forbidden', message: 'Event is owned by another organizer' },
        });
        return;
      }

      const parsed = parseUpdateEventBody(req.body as UpdateEventRequest);
      if (parsed.error || !parsed.value) {
        sendValidationError(
          res,
          parsed.error ?? { code: 'invalid_event', message: 'Invalid event' },
        );
        return;
      }

      const event = await updateEvent(options.databasePool, existing.id, parsed.value);
      if (!event) {
        res.status(404).json({ error: { code: 'event_not_found', message: 'Event not found' } });
        return;
      }

      const body: EventResponse = {
        event: await toSignedEvent(objectStorage, event),
      };

      res.json(body);
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/:eventId/cover-photo',
    requireAuth,
    handleCoverPhotoUpload,
    async (req, res, next) => {
      try {
        const organizer = requireOrganizer(req);
        if (organizer.error || !organizer.value) {
          sendValidationError(
            res,
            organizer.error ?? { code: 'not_authenticated', message: 'Not authenticated' },
          );
          return;
        }

        const eventId = requireEventId(req);
        const existing = await ensureOwnedOrganizerEvent(
          options.databasePool,
          eventId,
          organizer.value,
        );
        if (!existing) {
          res.status(404).json({ error: { code: 'event_not_found', message: 'Event not found' } });
          return;
        }
        if (existing === 'forbidden') {
          res.status(403).json({
            error: { code: 'event_forbidden', message: 'Event is owned by another organizer' },
          });
          return;
        }

        const file = req.file;
        if (!file) {
          res
            .status(400)
            .json({ error: { code: 'cover_photo_required', message: 'Cover photo is required' } });
          return;
        }

        if (!allowedCoverPhotoTypes.has(file.mimetype)) {
          res.status(400).json({
            error: {
              code: 'unsupported_cover_photo_type',
              message: 'Cover photo must be a JPEG, PNG, or WebP image',
            },
          });
          return;
        }

        const coverPhotoKey = buildCoverPhotoKey(existing.id, file.mimetype);
        await objectStorage.uploadBuffer({
          relativeKey: coverPhotoKey,
          contentType: file.mimetype,
          body: file.buffer,
        });

        const event = await updateEvent(options.databasePool, existing.id, { coverPhotoKey });
        if (!event) {
          res.status(404).json({ error: { code: 'event_not_found', message: 'Event not found' } });
          return;
        }

        const body: EventResponse = {
          event: await toSignedEvent(objectStorage, event),
        };

        res.json(body);
      } catch (err) {
        next(err);
      }
    },
  );

  router.delete('/:eventId', requireAuth, async (req, res, next) => {
    try {
      const organizer = requireOrganizer(req);
      if (organizer.error || !organizer.value) {
        sendValidationError(
          res,
          organizer.error ?? { code: 'not_authenticated', message: 'Not authenticated' },
        );
        return;
      }

      const existing = await ensureOwnedOrganizerEvent(
        options.databasePool,
        requireEventId(req),
        organizer.value,
      );
      if (!existing) {
        res.status(404).json({ error: { code: 'event_not_found', message: 'Event not found' } });
        return;
      }
      if (existing === 'forbidden') {
        res.status(403).json({
          error: { code: 'event_forbidden', message: 'Event is owned by another organizer' },
        });
        return;
      }

      await deleteEvent(options.databasePool, existing.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
