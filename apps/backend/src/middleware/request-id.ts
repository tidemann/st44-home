/**
 * Request ID Middleware
 *
 * Generates or forwards a unique request ID for distributed tracing.
 * The request ID is:
 * - Forwarded from X-Request-ID header if provided (for distributed systems)
 * - Generated using UUID v4 if not provided
 * - Added to request context for logging
 * - Returned in X-Request-ID response header
 */

import { FastifyInstance, FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { randomUUID } from 'crypto';

// Extend FastifyRequest to include requestId
declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    startTime: number;
  }
}

/**
 * Request ID Plugin
 *
 * Adds request ID tracking to all requests.
 * Use with: fastify.register(requestIdPlugin)
 */
export async function requestIdPlugin(fastify: FastifyInstance): Promise<void> {
  // Add hook to assign request ID before any processing
  fastify.addHook(
    'onRequest',
    (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
      // Get request ID from header or generate new one
      const existingId = request.headers['x-request-id'];
      const requestId = typeof existingId === 'string' ? existingId : randomUUID();

      // Attach to request object
      request.requestId = requestId;

      // Record start time for performance tracking
      request.startTime = Date.now();

      // Add to response headers
      reply.header('X-Request-ID', requestId);

      done();
    },
  );
}

/**
 * Generate a new request ID
 */
export function generateRequestId(): string {
  return randomUUID();
}
