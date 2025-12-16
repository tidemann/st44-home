/**
 * Invitation Authorization Middleware
 *
 * Validates that users have appropriate permissions to send invitations.
 * Only household admins and parents can invite users.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database.js';

interface HouseholdIdParams {
  Params: {
    householdId: string;
  };
}

/**
 * Validate that user can invite others to the household
 *
 * Checks:
 * 1. User is a member of the household
 * 2. User has admin or parent role
 *
 * @returns 403 Forbidden if user cannot invite
 */
export async function validateCanInvite(
  request: FastifyRequest<HouseholdIdParams>,
  reply: FastifyReply,
): Promise<void> {
  const { householdId } = request.params;
  const userId = request.user?.userId;

  if (!userId) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  try {
    const result = await db.query(
      `SELECT role FROM household_members 
       WHERE household_id = $1 AND user_id = $2`,
      [householdId, userId],
    );

    if (result.rows.length === 0) {
      reply.status(403).send({
        error: 'Forbidden',
        message: 'Not a member of this household',
      });
      return;
    }

    const { role } = result.rows[0] as { role: string };
    if (role !== 'admin' && role !== 'parent') {
      reply.status(403).send({
        error: 'Forbidden',
        message: 'Only admins and parents can invite users',
      });
      return;
    }

    // User is authorized to invite
  } catch (error) {
    request.log.error(error, 'Failed to validate invitation permission');
    reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to validate permissions',
    });
  }
}
