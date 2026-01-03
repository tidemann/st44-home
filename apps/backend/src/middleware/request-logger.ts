/**
 * Request Logger Middleware
 *
 * Provides structured request/response logging with:
 * - Request ID for tracing
 * - User context when authenticated
 * - Response timing
 * - Slow request warnings
 * - Sensitive data filtering
 */

import { FastifyInstance, FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';

/**
 * Slow request threshold in milliseconds
 * Requests taking longer than this will be logged as warnings
 */
const SLOW_REQUEST_THRESHOLD_MS = 1000;

/**
 * Headers to exclude from logging (sensitive data)
 */
const SENSITIVE_HEADERS = new Set(['authorization', 'cookie', 'set-cookie', 'x-api-key']);

/**
 * Body fields to redact from logging
 */
const SENSITIVE_BODY_FIELDS = new Set([
  'password',
  'passwordHash',
  'token',
  'refreshToken',
  'secret',
]);

/**
 * Redact sensitive fields from an object
 */
function redactSensitiveData(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_BODY_FIELDS.has(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * Filter out sensitive headers
 */
function filterHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!SENSITIVE_HEADERS.has(key.toLowerCase())) {
      filtered[key] = value;
    }
  }
  return filtered;
}

/**
 * Request logging context
 */
interface LogContext {
  requestId: string;
  method: string;
  url: string;
  userId?: string;
  userEmail?: string;
  householdId?: string;
  headers?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
}

/**
 * Response logging context
 */
interface ResponseLogContext extends LogContext {
  statusCode: number;
  responseTimeMs: number;
}

/**
 * Build request context for logging
 */
function buildRequestContext(request: FastifyRequest): LogContext {
  const context: LogContext = {
    requestId: request.requestId || 'unknown',
    method: request.method,
    url: request.url,
  };

  // Add user context if authenticated
  if (request.user) {
    context.userId = request.user.userId;
    context.userEmail = request.user.email;
  }

  // Add household ID from params if present
  const params = request.params as Record<string, string> | undefined;
  if (params?.householdId) {
    context.householdId = params.householdId;
  }

  return context;
}

/**
 * Request Logger Plugin
 *
 * Logs all incoming requests and responses with structured context.
 * Use with: fastify.register(requestLoggerPlugin)
 */
export async function requestLoggerPlugin(fastify: FastifyInstance): Promise<void> {
  // Log incoming requests
  fastify.addHook(
    'preHandler',
    (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
      const context = buildRequestContext(request);

      // Add filtered headers for debugging
      context.headers = filterHeaders(request.headers as Record<string, unknown>);

      // Add query params
      if (request.query && Object.keys(request.query).length > 0) {
        context.query = request.query as Record<string, unknown>;
      }

      // Add redacted body for non-GET requests
      if (request.body && request.method !== 'GET') {
        context.body = redactSensitiveData(request.body);
      }

      request.log.info(context, 'Incoming request');

      done();
    },
  );

  // Log responses with timing
  fastify.addHook(
    'onResponse',
    (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
      const responseTimeMs = Date.now() - (request.startTime || Date.now());

      const context: ResponseLogContext = {
        ...buildRequestContext(request),
        statusCode: reply.statusCode,
        responseTimeMs,
      };

      // NOTE: Cannot set headers in onResponse hook (response already sent)
      // Response time is logged in the context instead

      // Log with appropriate level based on status and timing
      if (reply.statusCode >= 500) {
        request.log.error(context, 'Request completed with server error');
      } else if (reply.statusCode >= 400) {
        request.log.warn(context, 'Request completed with client error');
      } else if (responseTimeMs > SLOW_REQUEST_THRESHOLD_MS) {
        request.log.warn(context, 'Slow request completed');
      } else {
        request.log.info(context, 'Request completed');
      }

      done();
    },
  );
}

/**
 * Get request context for use in error handlers and services
 */
export function getRequestContext(request: FastifyRequest): LogContext {
  return buildRequestContext(request);
}

export { SLOW_REQUEST_THRESHOLD_MS, SENSITIVE_HEADERS, SENSITIVE_BODY_FIELDS };
