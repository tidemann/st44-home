import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  PushConfigResponseSchema,
  PushSubscriptionRequestSchema,
  PushTestResponseSchema,
  PushUnsubscribeRequestSchema,
} from '@st44/types';
import { zodToOpenAPI, CommonErrors } from '@st44/types/generators';
import { authenticateUser } from '../middleware/auth.js';
import { z } from 'zod';
import { validateParams, validateRequest } from '../utils/validation.js';
import { uuidSchema } from '../schemas/validation.js';
import { stripResponseValidation } from '../schemas/common.js';
import { AuthenticationError, ValidationError } from '../errors/index.js';
import { pushService, type PushService } from '../services/push.service.js';

/**
 * Web push routes (ST-623)
 *
 * GET    /api/push/config         - is push on, and the VAPID public key
 * POST   /api/push/subscriptions  - save this browser's subscription
 * DELETE /api/push/subscriptions  - remove this browser's subscription
 * POST   /api/push/test           - send a test notification to my browsers
 * POST   /api/assignments/:assignmentId/remind - parent sends "Påminn nå" (ST-686)
 */

function requireUserId(request: FastifyRequest): string {
  const userId = request.user?.userId;
  if (!userId) throw new AuthenticationError('Authentication required');
  return userId;
}

const getConfigSchema = stripResponseValidation({
  summary: 'Push notification config',
  description: 'Whether the server sends push notifications, and the VAPID public key',
  tags: ['push'],
  security: [{ bearerAuth: [] }],
  response: {
    200: { description: 'Push config', ...zodToOpenAPI(PushConfigResponseSchema) },
    ...CommonErrors.Unauthorized,
  },
});

const subscribeSchema = stripResponseValidation({
  summary: 'Turn on push for this browser',
  description: "Stores the browser's PushSubscription for the current user",
  tags: ['push'],
  security: [{ bearerAuth: [] }],
  body: zodToOpenAPI(PushSubscriptionRequestSchema),
  response: {
    201: { description: 'Subscription stored', type: 'null' },
    ...CommonErrors.BadRequest,
    ...CommonErrors.Unauthorized,
    ...CommonErrors.InternalServerError,
  },
});

const unsubscribeSchema = stripResponseValidation({
  summary: 'Turn off push for this browser',
  tags: ['push'],
  security: [{ bearerAuth: [] }],
  body: zodToOpenAPI(PushUnsubscribeRequestSchema),
  response: {
    204: { description: 'Subscription removed', type: 'null' },
    ...CommonErrors.BadRequest,
    ...CommonErrors.Unauthorized,
    ...CommonErrors.InternalServerError,
  },
});

const testSchema = stripResponseValidation({
  summary: 'Send a test notification',
  description: "Sends a test notification to the current user's browsers",
  tags: ['push'],
  security: [{ bearerAuth: [] }],
  response: {
    200: { description: 'Number of messages sent', ...zodToOpenAPI(PushTestResponseSchema) },
    ...CommonErrors.BadRequest,
    ...CommonErrors.Unauthorized,
    ...CommonErrors.InternalServerError,
  },
});

const remindSchema = stripResponseValidation({
  summary: 'Remind a child of one open chore now',
  description:
    'A parent sends the "due" reminder for one pending assignment to the child\'s phones, ' +
    'at any hour. sent = 0 when the child has no phone with notifications on. ' +
    '409 when the chore is not open, 500 when the push service refused every phone.',
  tags: ['push'],
  security: [{ bearerAuth: [] }],
  response: {
    200: { description: 'Number of phones reached', ...zodToOpenAPI(PushTestResponseSchema) },
    ...CommonErrors.BadRequest,
    ...CommonErrors.Unauthorized,
    ...CommonErrors.Forbidden,
    ...CommonErrors.NotFound,
    ...CommonErrors.Conflict,
    ...CommonErrors.InternalServerError,
  },
});

const assignmentParamsSchema = z.object({ assignmentId: uuidSchema });

export function createPushRoutes(service: PushService = pushService) {
  return async function pushRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.get('/api/push/config', {
      preHandler: [authenticateUser],
      schema: getConfigSchema,
      handler: async (_request: FastifyRequest, reply: FastifyReply) =>
        reply.send({ enabled: service.enabled, publicKey: service.publicKey }),
    });

    fastify.post('/api/push/subscriptions', {
      preHandler: [authenticateUser],
      schema: subscribeSchema,
      handler: async (request: FastifyRequest, reply: FastifyReply) => {
        const userId = requireUserId(request);
        const subscription = validateRequest(PushSubscriptionRequestSchema, request.body);
        const userAgent = request.headers['user-agent']?.slice(0, 500) ?? null;
        await service.saveSubscription(userId, subscription, userAgent);
        return reply.code(201).send();
      },
    });

    fastify.delete('/api/push/subscriptions', {
      preHandler: [authenticateUser],
      schema: unsubscribeSchema,
      handler: async (request: FastifyRequest, reply: FastifyReply) => {
        const userId = requireUserId(request);
        const { endpoint } = validateRequest(PushUnsubscribeRequestSchema, request.body);
        await service.deleteSubscription(userId, endpoint);
        return reply.code(204).send();
      },
    });

    fastify.post('/api/push/test', {
      preHandler: [authenticateUser],
      schema: testSchema,
      handler: async (request: FastifyRequest, reply: FastifyReply) => {
        const userId = requireUserId(request);
        if (!service.enabled) {
          throw new ValidationError('Push notifications are not configured on the server', []);
        }
        const sent = await service.sendTest(userId);
        return reply.send({ sent });
      },
    });

    fastify.post('/api/assignments/:assignmentId/remind', {
      preHandler: [authenticateUser],
      schema: remindSchema,
      handler: async (request: FastifyRequest, reply: FastifyReply) => {
        const userId = requireUserId(request);
        const { assignmentId } = validateParams(assignmentParamsSchema, request);
        if (!service.enabled) {
          throw new ValidationError('Push notifications are not configured on the server', []);
        }
        const sent = await service.remindAssignment(assignmentId, userId);
        request.log.info({ assignmentId, sent }, 'Manual reminder sent');
        return reply.send({ sent });
      },
    });
  };
}

export default createPushRoutes();
