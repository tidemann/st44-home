/**
 * QR Authentication Middleware
 *
 * Validates QR tokens and attaches user session to request.
 * Can be used as an alternative to JWT authentication for child accounts.
 *
 * Usage:
 * - Add as preHandler to routes that accept QR token authentication
 * - QR token should be provided in request body as { qrToken: "..." }
 * - Attaches user info to request.user (same format as JWT auth)
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { validateQrToken } from '../services/qr-token.service.js';

/**
 * QR token authentication middleware
 * Validates QR token from request body and attaches user to request
 *
 * @example
 * fastify.post('/api/child/complete-task', {
 *   preHandler: [authenticateQrToken]
 * }, handler);
 */
export async function authenticateQrToken(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Extract QR token from request body
    const body = request.body as Record<string, unknown> | undefined;
    const qrToken = body?.qrToken;

    if (!qrToken || typeof qrToken !== 'string') {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Missing or invalid QR token',
      });
    }

    // Validate QR token
    const userData = await validateQrToken(qrToken, request.log);

    if (!userData) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid QR token',
      });
    }

    // Attach user info to request (same format as JWT auth)
    request.user = {
      userId: userData.userId,
      email: userData.email,
      role: userData.role,
    };

    // Middleware successful - continue to route handler
  } catch (error: unknown) {
    // Log error but don't expose internal details
    request.log.error(error, 'QR token authentication error');
    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Optional QR token authentication middleware
 * Tries to authenticate with QR token if present, but doesn't fail if missing.
 * Useful for endpoints that support both JWT and QR token auth.
 *
 * @example
 * fastify.get('/api/child/profile', {
 *   preHandler: [optionalQrAuth, authenticateUser]
 * }, handler);
 */
export async function optionalQrAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Extract QR token from request body
    const body = request.body as Record<string, unknown> | undefined;
    const qrToken = body?.qrToken;

    // If no QR token provided, skip authentication (let other middleware handle it)
    if (!qrToken || typeof qrToken !== 'string') {
      return;
    }

    // Validate QR token
    const userData = await validateQrToken(qrToken, request.log);

    if (userData) {
      // Attach user info to request
      request.user = {
        userId: userData.userId,
        email: userData.email,
        role: userData.role,
      };
    }

    // Continue to next middleware regardless of validation result
  } catch (error: unknown) {
    // Log error but continue (optional auth should not block request)
    request.log.warn(error, 'Optional QR token authentication failed');
  }
}
