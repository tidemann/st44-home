/**
 * QR Code Authentication Routes
 *
 * Provides endpoints for QR code-based child authentication:
 * - POST /api/qr-auth/generate/:childId - Generate QR token (parent only)
 * - POST /api/qr-auth/regenerate/:childId - Regenerate QR token (parent only)
 * - POST /api/qr-auth/login - Login with QR token
 * - GET /api/qr-auth/token/:childId - Get current QR token (parent only)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { pool } from '../database.js';
import { authenticateUser } from '../middleware/auth.js';
import { createIpRateLimiter } from '../middleware/rate-limit.js';
import {
  generateQrToken,
  regenerateQrToken,
  validateQrToken,
  getQrToken,
} from '../services/qr-token.service.js';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// QR login rate limiter: 20 attempts per hour per IP (more restrictive than normal login)
const qrLoginRateLimiter = createIpRateLimiter('ratelimit:qr-login:', 20, 3600);

// Request/Response Types
interface ChildIdParams {
  childId: string;
}

interface QrTokenLoginRequest {
  Body: {
    token: string;
  };
}

interface QrTokenResponse {
  token: string;
  childId: string;
  childName: string;
}

interface QrLoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  role?: string;
  householdId: string;
  firstName?: string | null;
  lastName?: string | null;
  childId: string;
}

interface ErrorResponse {
  error: string;
}

/**
 * Generate JWT access token (same format as regular login)
 */
function generateAccessToken(
  userId: string,
  email: string,
  role?: string,
  firstName?: string | null,
  lastName?: string | null,
): string {
  return jwt.sign({ userId, email, role, firstName, lastName, type: 'access' }, JWT_SECRET, {
    expiresIn: '1h',
  });
}

/**
 * Generate JWT refresh token
 */
function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Check if user is a parent or admin in the household
 */
async function isParentOrAdmin(
  userId: string,
  householdId: string,
): Promise<{ isParent: boolean; role?: string }> {
  const result = await pool.query(
    `SELECT role FROM household_members
     WHERE user_id = $1 AND household_id = $2
     LIMIT 1`,
    [userId, householdId],
  );

  if (result.rowCount === 0) {
    return { isParent: false };
  }

  const role = result.rows[0].role;
  return {
    isParent: role === 'admin' || role === 'parent',
    role,
  };
}

/**
 * Register QR authentication routes
 */
export default async function qrAuthRoutes(fastify: FastifyInstance) {
  /**
   * POST /generate/:childId
   * Generate a new QR token for a child account (parent only)
   */
  fastify.post<{ Params: ChildIdParams; Reply: QrTokenResponse | ErrorResponse }>(
    '/generate/:childId',
    {
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      const { childId } = request.params;
      const userId = request.user!.userId;

      try {
        // Get child's household
        const childResult = await pool.query(
          `SELECT household_id, name FROM children WHERE id = $1`,
          [childId],
        );

        if (childResult.rowCount === 0) {
          return reply.code(404).send({ error: 'Child not found' });
        }

        const { household_id: householdId, name: childName } = childResult.rows[0];

        // Check if user is parent/admin in this household
        const { isParent } = await isParentOrAdmin(userId, householdId);
        if (!isParent) {
          return reply.code(403).send({ error: 'Only parents can generate QR tokens' });
        }

        // Generate QR token
        const token = await generateQrToken(childId, householdId, fastify.log);

        return reply.code(201).send({
          token,
          childId,
          childName,
        });
      } catch (error: unknown) {
        fastify.log.error({ error, childId, userId }, 'Failed to generate QR token');
        return reply.code(500).send({ error: 'Failed to generate QR token' });
      }
    },
  );

  /**
   * POST /regenerate/:childId
   * Regenerate QR token for a child (invalidates old token, parent only)
   */
  fastify.post<{ Params: ChildIdParams; Reply: QrTokenResponse | ErrorResponse }>(
    '/regenerate/:childId',
    {
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      const { childId } = request.params;
      const userId = request.user!.userId;

      try {
        // Get child's household
        const childResult = await pool.query(
          `SELECT household_id, name FROM children WHERE id = $1`,
          [childId],
        );

        if (childResult.rowCount === 0) {
          return reply.code(404).send({ error: 'Child not found' });
        }

        const { household_id: householdId, name: childName } = childResult.rows[0];

        // Check if user is parent/admin in this household
        const { isParent } = await isParentOrAdmin(userId, householdId);
        if (!isParent) {
          return reply.code(403).send({ error: 'Only parents can regenerate QR tokens' });
        }

        // Regenerate QR token (invalidates old one)
        const token = await regenerateQrToken(childId, householdId, fastify.log);

        fastify.log.info({ childId, userId }, 'QR token regenerated');

        return reply.code(200).send({
          token,
          childId,
          childName,
        });
      } catch (error: unknown) {
        fastify.log.error({ error, childId, userId }, 'Failed to regenerate QR token');
        return reply.code(500).send({ error: 'Failed to regenerate QR token' });
      }
    },
  );

  /**
   * POST /login
   * Login using a QR token (public endpoint with rate limiting)
   */
  fastify.post<QrTokenLoginRequest, { Reply: QrLoginResponse | ErrorResponse }>(
    '/login',
    {
      preHandler: [qrLoginRateLimiter],
    },
    async (request, reply) => {
      const { token } = request.body;

      // Validate token format (should be non-empty)
      if (!token || token.trim().length === 0) {
        return reply.code(400).send({ error: 'Token is required' });
      }

      try {
        // Validate QR token and get user data
        const userData = await validateQrToken(token, fastify.log);

        if (!userData) {
          return reply.code(401).send({ error: 'Invalid QR token' });
        }

        // Generate JWT tokens (same as regular login)
        const accessToken = generateAccessToken(
          userData.userId,
          userData.email,
          userData.role,
          userData.firstName,
          userData.lastName,
        );
        const refreshToken = generateRefreshToken(userData.userId);

        fastify.log.info(
          {
            userId: userData.userId,
            childId: userData.childId,
            householdId: userData.householdId,
          },
          'Successful QR login',
        );

        return reply.code(200).send({
          accessToken,
          refreshToken,
          userId: userData.userId,
          email: userData.email,
          role: userData.role,
          householdId: userData.householdId,
          firstName: userData.firstName,
          lastName: userData.lastName,
          childId: userData.childId,
        });
      } catch (error: unknown) {
        fastify.log.error({ error }, 'QR login error');
        return reply.code(500).send({ error: 'Authentication failed' });
      }
    },
  );

  /**
   * GET /token/:childId
   * Get current QR token for a child (parent only)
   */
  fastify.get<{ Params: ChildIdParams; Reply: QrTokenResponse | ErrorResponse }>(
    '/token/:childId',
    {
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      const { childId } = request.params;
      const userId = request.user!.userId;

      try {
        // Get child's household and name
        const childResult = await pool.query(
          `SELECT household_id, name FROM children WHERE id = $1`,
          [childId],
        );

        if (childResult.rowCount === 0) {
          return reply.code(404).send({ error: 'Child not found' });
        }

        const { household_id: householdId, name: childName } = childResult.rows[0];

        // Check if user is parent/admin in this household
        const { isParent } = await isParentOrAdmin(userId, householdId);
        if (!isParent) {
          return reply.code(403).send({ error: 'Only parents can view QR tokens' });
        }

        // Get current QR token
        const token = await getQrToken(childId, householdId, fastify.log);

        if (!token) {
          return reply.code(404).send({ error: 'No QR token found for this child' });
        }

        return reply.code(200).send({
          token,
          childId,
          childName,
        });
      } catch (error: unknown) {
        fastify.log.error({ error, childId, userId }, 'Failed to get QR token');
        return reply.code(500).send({ error: 'Failed to get QR token' });
      }
    },
  );
}
