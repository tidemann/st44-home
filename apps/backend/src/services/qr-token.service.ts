/**
 * QR Token Service
 *
 * Handles QR code authentication tokens for child accounts.
 * Provides cryptographically secure token generation, validation, and regeneration.
 *
 * Security:
 * - Uses crypto.randomBytes for cryptographic randomness (32 bytes = 256-bit security)
 * - Tokens are URL-safe base64 encoded
 * - Parent-only token generation and regeneration
 * - Tokens are long-lived (no expiration by default)
 */

import crypto from 'crypto';
import { pool } from '../database.js';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Token length in bytes (32 bytes = 256-bit security)
 */
const TOKEN_BYTES = 32;

/**
 * Generate a cryptographically secure QR token
 * @returns URL-safe base64 encoded token string
 */
function generateSecureToken(): string {
  const buffer = crypto.randomBytes(TOKEN_BYTES);
  // Use URL-safe base64 encoding (replace +/= with -_~)
  return buffer.toString('base64url');
}

/**
 * Generate a new QR token for a child account
 * @param childId - UUID of the child
 * @param householdId - UUID of the household (for multi-tenant security)
 * @param logger - Fastify logger instance
 * @returns The generated QR token
 * @throws Error if child not found or database error occurs
 */
export async function generateQrToken(
  childId: string,
  householdId: string,
  logger: FastifyBaseLogger,
): Promise<string> {
  const token = generateSecureToken();

  try {
    // Update child record with new QR token
    // Use household_id for multi-tenant security
    const result = await pool.query(
      `UPDATE children
       SET qr_token = $1, updated_at = NOW()
       WHERE id = $2 AND household_id = $3
       RETURNING id`,
      [token, childId, householdId],
    );

    if (result.rowCount === 0) {
      throw new Error(`Child not found: ${childId}`);
    }

    logger.info({ childId, householdId }, 'QR token generated successfully');
    return token;
  } catch (error) {
    logger.error({ error, childId, householdId }, 'Failed to generate QR token');
    throw error;
  }
}

/**
 * Regenerate QR token for a child (invalidates old token)
 * @param childId - UUID of the child
 * @param householdId - UUID of the household
 * @param logger - Fastify logger instance
 * @returns The new QR token
 * @throws Error if child not found or database error occurs
 */
export async function regenerateQrToken(
  childId: string,
  householdId: string,
  logger: FastifyBaseLogger,
): Promise<string> {
  // Regeneration is the same as generation (overwrites old token)
  logger.info({ childId, householdId }, 'Regenerating QR token (invalidates old token)');
  return generateQrToken(childId, householdId, logger);
}

/**
 * Validate a QR token and return the associated child's user account
 * @param token - The QR token to validate
 * @param logger - Fastify logger instance
 * @returns Child user account data if valid, null if invalid
 */
export async function validateQrToken(
  token: string,
  logger: FastifyBaseLogger,
): Promise<{
  userId: string;
  email: string;
  childId: string;
  householdId: string;
  firstName: string | null;
  lastName: string | null;
  role?: string;
} | null> {
  try {
    // Query child by QR token and join with user account
    // Must have user_id set (child account linked to user)
    const result = await pool.query(
      `SELECT
        c.id as child_id,
        c.household_id,
        c.user_id,
        u.email,
        u.first_name,
        u.last_name
       FROM children c
       JOIN users u ON c.user_id = u.id
       WHERE c.qr_token = $1 AND c.user_id IS NOT NULL`,
      [token],
    );

    if (result.rowCount === 0) {
      logger.warn({ token: token.substring(0, 10) + '...' }, 'Invalid QR token');
      return null;
    }

    const child = result.rows[0];

    // Get user's role from household_members
    const roleResult = await pool.query(
      `SELECT role FROM household_members
       WHERE user_id = $1 AND household_id = $2
       LIMIT 1`,
      [child.user_id, child.household_id],
    );

    const role = roleResult.rows.length > 0 ? roleResult.rows[0].role : undefined;

    logger.info(
      {
        userId: child.user_id,
        childId: child.child_id,
        householdId: child.household_id,
      },
      'QR token validated successfully',
    );

    return {
      userId: child.user_id,
      email: child.email,
      childId: child.child_id,
      householdId: child.household_id,
      firstName: child.first_name,
      lastName: child.last_name,
      role,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to validate QR token');
    throw error;
  }
}

/**
 * Get current QR token for a child
 * @param childId - UUID of the child
 * @param householdId - UUID of the household
 * @param logger - Fastify logger instance
 * @returns The current QR token, or null if not set
 * @throws Error if child not found or database error occurs
 */
export async function getQrToken(
  childId: string,
  householdId: string,
  logger: FastifyBaseLogger,
): Promise<string | null> {
  try {
    const result = await pool.query(
      `SELECT qr_token FROM children
       WHERE id = $1 AND household_id = $2`,
      [childId, householdId],
    );

    if (result.rowCount === 0) {
      throw new Error(`Child not found: ${childId}`);
    }

    return result.rows[0].qr_token || null;
  } catch (error) {
    logger.error({ error, childId, householdId }, 'Failed to get QR token');
    throw error;
  }
}
