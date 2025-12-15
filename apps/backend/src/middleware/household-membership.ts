import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../database.js';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

// Extend FastifyRequest to include household context
declare module 'fastify' {
  interface FastifyRequest {
    household?: {
      role: 'admin' | 'parent';
      householdId: string;
    };
  }
}

interface HouseholdRouteParams {
  Params: {
    id?: string;
    householdId?: string;
  };
}

/**
 * Validates that authenticated user is a member of the household
 * specified in route params (:id or :householdId).
 * Attaches household role to request context for downstream use.
 */
export async function validateHouseholdMembership(
  request: FastifyRequest<HouseholdRouteParams>,
  reply: FastifyReply,
) {
  // Prioritize householdId param (for nested routes), fallback to id (for direct household routes)
  const householdId = request.params.householdId || request.params.id;
  const userId = request.user?.userId;

  if (!userId) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  if (!householdId) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Household ID required in route',
    });
  }

  if (!isValidUuid(householdId)) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Invalid household ID format',
    });
  }

  try {
    const result = await pool.query(
      'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
      [householdId, userId],
    );

    if (result.rows.length === 0) {
      request.log.warn(
        { userId, householdId },
        'User attempted to access household they are not a member of',
      );
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You are not a member of this household',
      });
    }

    // Attach household context to request
    request.household = {
      role: result.rows[0].role,
      householdId,
    };

    // Middleware successful - continue to route handler
  } catch (error) {
    request.log.error(error, 'Failed to validate household membership');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Membership validation failed',
    });
  }
}

/**
 * Requires user to have admin role in the household.
 * Must be used AFTER validateHouseholdMembership middleware.
 */
export async function requireHouseholdAdmin(request: FastifyRequest, reply: FastifyReply) {
  const role = request.household?.role;

  if (!role) {
    request.log.error('requireHouseholdAdmin called without household context');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Household context missing',
    });
  }

  if (role !== 'admin') {
    request.log.warn(
      { userId: request.user?.userId, role },
      'User attempted admin-only action without admin role',
    );
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Admin role required for this action',
    });
  }

  // Middleware successful - continue to route handler
}

/**
 * Requires user to have parent or admin role in the household.
 * Must be used AFTER validateHouseholdMembership middleware.
 */
export async function requireHouseholdParent(request: FastifyRequest, reply: FastifyReply) {
  const role = request.household?.role;

  if (!role) {
    request.log.error('requireHouseholdParent called without household context');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Household context missing',
    });
  }

  if (role !== 'admin' && role !== 'parent') {
    request.log.warn(
      { userId: request.user?.userId, role },
      'User attempted parent-level action without sufficient role',
    );
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Parent or admin role required for this action',
    });
  }

  // Middleware successful - continue to route handler
}
