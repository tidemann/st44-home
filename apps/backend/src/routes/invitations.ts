import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { db } from '../database.js';
import { authenticateUser } from '../middleware/auth.js';
import { validateHouseholdMembership } from '../middleware/household-membership.js';
import { validateCanInvite } from '../middleware/invitation-auth.js';
import { getEmailService } from '../services/email.service.js';

interface CreateInvitationRequest {
  Params: {
    householdId: string;
  };
  Body: {
    email: string;
    role?: 'admin' | 'parent';
  };
}

interface ListSentInvitationsRequest {
  Params: {
    householdId: string;
  };
  Querystring: {
    status?: string;
  };
}

interface CancelInvitationRequest {
  Params: {
    householdId: string;
    id: string;
  };
}

interface AcceptInvitationRequest {
  Params: {
    token: string;
  };
}

interface DeclineInvitationRequest {
  Params: {
    token: string;
  };
}

/**
 * Generate secure random token for invitation
 */
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * POST /api/households/:householdId/invitations - Send invitation
 */
async function createInvitation(
  request: FastifyRequest<CreateInvitationRequest>,
  reply: FastifyReply,
) {
  const { householdId } = request.params;
  const { email, role = 'parent' } = request.body;
  const userId = request.user?.userId;

  if (!userId) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Valid email address is required',
    });
  }

  // Validate role
  if (role !== 'admin' && role !== 'parent') {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Role must be "admin" or "parent"',
    });
  }

  try {
    // Check if user is already a household member
    const memberCheck = await db.query(
      `SELECT hm.id FROM household_members hm
       JOIN users u ON hm.user_id = u.id
       WHERE hm.household_id = $1 AND u.email = $2`,
      [householdId, email.toLowerCase()],
    );

    if (memberCheck.rows.length > 0) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'User is already a household member',
      });
    }

    // Check for pending invitation
    const invitationCheck = await db.query(
      `SELECT id FROM invitations
       WHERE household_id = $1 AND invited_email = $2 AND status = 'pending' AND expires_at > NOW()`,
      [householdId, email.toLowerCase()],
    );

    if (invitationCheck.rows.length > 0) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'Pending invitation already exists for this email',
      });
    }

    // Get household name and inviter email for email template
    const householdResult = await db.query(
      `SELECT h.name, u.email as inviter_email
       FROM households h
       JOIN users u ON u.id = $1
       WHERE h.id = $2`,
      [userId, householdId],
    );

    if (householdResult.rows.length === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Household not found',
      });
    }

    const householdName = householdResult.rows[0].name;
    const inviterEmail = householdResult.rows[0].inviter_email;

    // Generate unique token
    const token = generateInvitationToken();

    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Insert invitation
    const result = await db.query(
      `INSERT INTO invitations (household_id, invited_by, invited_email, token, role, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW() + INTERVAL '7 days')
       RETURNING id, invited_email, token, role, status, expires_at, created_at`,
      [householdId, userId, email.toLowerCase(), token, role],
    );

    const invitation = result.rows[0];

    // Send invitation email (non-blocking - log errors but don't fail the request)
    const emailService = getEmailService(request.log);
    emailService
      .sendInvitationEmailSafe(email, {
        householdName,
        inviterEmail,
        token,
        expiresAt: invitation.expires_at,
      })
      .then((success) => {
        if (success) {
          request.log.info({ email, householdId }, 'Invitation email sent successfully');
        } else {
          request.log.warn(
            { email, householdId },
            'Failed to send invitation email - invitation created but email not delivered',
          );
        }
      })
      .catch((error) => {
        // This should never happen with sendInvitationEmailSafe, but handle it just in case
        request.log.error(
          { error, email, householdId },
          'Unexpected error sending invitation email',
        );
      });

    return reply.status(201).send({
      id: invitation.id,
      email: invitation.invited_email,
      token: invitation.token,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expires_at,
      createdAt: invitation.created_at,
    });
  } catch (error) {
    request.log.error(error, 'Failed to create invitation');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to create invitation',
    });
  }
}

/**
 * GET /api/households/:householdId/invitations - List sent invitations
 */
async function listSentInvitations(
  request: FastifyRequest<ListSentInvitationsRequest>,
  reply: FastifyReply,
) {
  const { householdId } = request.params;
  const { status } = request.query;

  try {
    let query = `
      SELECT i.id, i.invited_email, i.role, i.status, i.expires_at, i.accepted_at, i.created_at,
             u.email as inviter_email
      FROM invitations i
      JOIN users u ON i.invited_by = u.id
      WHERE i.household_id = $1
    `;
    const params: any[] = [householdId];

    if (status) {
      query += ` AND i.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY i.created_at DESC`;

    const result = await db.query(query, params);

    return reply.status(200).send({
      invitations: result.rows.map((row) => ({
        id: row.id,
        invitedEmail: row.invited_email,
        inviterEmail: row.inviter_email,
        role: row.role,
        status: row.status,
        expiresAt: row.expires_at,
        acceptedAt: row.accepted_at,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    request.log.error(error, 'Failed to list invitations');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to list invitations',
    });
  }
}

/**
 * DELETE /api/households/:householdId/invitations/:id - Cancel invitation
 */
async function cancelInvitation(
  request: FastifyRequest<CancelInvitationRequest>,
  reply: FastifyReply,
) {
  const { householdId, id } = request.params;
  const userId = request.user?.userId;

  if (!userId) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  try {
    // Check if invitation exists and is pending
    const invitationCheck = await db.query(
      `SELECT i.id, i.invited_by, hm.role
       FROM invitations i
       LEFT JOIN household_members hm ON hm.household_id = i.household_id AND hm.user_id = $1
       WHERE i.id = $2 AND i.household_id = $3`,
      [userId, id, householdId],
    );

    if (invitationCheck.rows.length === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Invitation not found',
      });
    }

    const invitation = invitationCheck.rows[0];

    // Only admin or inviter can cancel
    if (invitation.invited_by !== userId && invitation.role !== 'admin') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Only admin or inviter can cancel invitation',
      });
    }

    // Update invitation status to cancelled
    const result = await db.query(
      `UPDATE invitations
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Only pending invitations can be cancelled',
      });
    }

    return reply.status(204).send();
  } catch (error) {
    request.log.error(error, 'Failed to cancel invitation');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to cancel invitation',
    });
  }
}

/**
 * GET /api/users/me/invitations - List received invitations
 */
async function listReceivedInvitations(request: FastifyRequest, reply: FastifyReply) {
  const userEmail = request.user?.email;

  if (!userEmail) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  try {
    const result = await db.query(
      `SELECT i.id, i.token, i.role, i.expires_at, i.created_at,
              h.id as household_id, h.name as household_name,
              u.email as inviter_email
       FROM invitations i
       JOIN households h ON i.household_id = h.id
       JOIN users u ON i.invited_by = u.id
       WHERE i.invited_email = $1 AND i.status = 'pending' AND i.expires_at > NOW()
       ORDER BY i.created_at DESC`,
      [userEmail.toLowerCase()],
    );

    return reply.status(200).send({
      invitations: result.rows.map((row) => ({
        id: row.id,
        token: row.token,
        householdId: row.household_id,
        householdName: row.household_name,
        inviterEmail: row.inviter_email,
        role: row.role,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    request.log.error(error, 'Failed to list received invitations');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to list received invitations',
    });
  }
}

/**
 * POST /api/invitations/:token/accept - Accept invitation
 */
async function acceptInvitation(
  request: FastifyRequest<AcceptInvitationRequest>,
  reply: FastifyReply,
) {
  const { token } = request.params;
  const userId = request.user?.userId;
  const userEmail = request.user?.email;

  if (!userId || !userEmail) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  try {
    // Begin transaction
    await db.query('BEGIN');

    // Find invitation by token
    const invitationResult = await db.query(
      `SELECT i.id, i.household_id, i.invited_email, i.role, i.status, i.expires_at,
              h.name as household_name
       FROM invitations i
       JOIN households h ON i.household_id = h.id
       WHERE i.token = $1`,
      [token],
    );

    if (invitationResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Invitation not found',
      });
    }

    const invitation = invitationResult.rows[0];

    // Validate invitation email matches user
    if (invitation.invited_email !== userEmail.toLowerCase()) {
      await db.query('ROLLBACK');
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'This invitation is not for your email address',
      });
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      await db.query('ROLLBACK');
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invitation has expired',
      });
    }

    // Check if already accepted
    if (invitation.status !== 'pending') {
      await db.query('ROLLBACK');
      return reply.status(400).send({
        error: 'Bad Request',
        message: `Invitation has already been ${invitation.status}`,
      });
    }

    // Check if user is already a member
    const memberCheck = await db.query(
      `SELECT id FROM household_members
       WHERE household_id = $1 AND user_id = $2`,
      [invitation.household_id, userId],
    );

    if (memberCheck.rows.length > 0) {
      await db.query('ROLLBACK');
      return reply.status(409).send({
        error: 'Conflict',
        message: 'You are already a member of this household',
      });
    }

    // Insert household member
    await db.query(
      `INSERT INTO household_members (household_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, NOW())`,
      [invitation.household_id, userId, invitation.role],
    );

    // Update invitation status
    await db.query(
      `UPDATE invitations
       SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [invitation.id],
    );

    await db.query('COMMIT');

    return reply.status(200).send({
      household: {
        id: invitation.household_id,
        name: invitation.household_name,
        role: invitation.role,
      },
    });
  } catch (error) {
    await db.query('ROLLBACK');
    request.log.error(error, 'Failed to accept invitation');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to accept invitation',
    });
  }
}

/**
 * POST /api/invitations/:token/decline - Decline invitation
 */
async function declineInvitation(
  request: FastifyRequest<DeclineInvitationRequest>,
  reply: FastifyReply,
) {
  const { token } = request.params;
  const userEmail = request.user?.email;

  if (!userEmail) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  try {
    // Find and update invitation
    const result = await db.query(
      `UPDATE invitations
       SET status = 'declined', updated_at = NOW()
       WHERE token = $1 AND invited_email = $2 AND status = 'pending'
       RETURNING id`,
      [token, userEmail.toLowerCase()],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Invitation not found or already processed',
      });
    }

    return reply.status(204).send();
  } catch (error) {
    request.log.error(error, 'Failed to decline invitation');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to decline invitation',
    });
  }
}

/**
 * Register invitation routes
 */
export async function invitationRoutes(fastify: FastifyInstance) {
  // Send invitation (requires household membership)
  fastify.post(
    '/api/households/:householdId/invitations',
    {
      preHandler: [authenticateUser, validateHouseholdMembership as any, validateCanInvite],
    },
    createInvitation,
  );

  // List sent invitations (requires household membership)
  fastify.get(
    '/api/households/:householdId/invitations',
    {
      preHandler: [authenticateUser, validateHouseholdMembership as any],
    },
    listSentInvitations,
  );

  // Cancel invitation (requires household membership)
  fastify.delete(
    '/api/households/:householdId/invitations/:id',
    {
      preHandler: [authenticateUser, validateHouseholdMembership as any],
    },
    cancelInvitation,
  );

  // List received invitations (requires authentication only)
  fastify.get(
    '/api/users/me/invitations',
    {
      preHandler: [authenticateUser],
    },
    listReceivedInvitations,
  );

  // Accept invitation (requires authentication, no household membership check)
  fastify.post(
    '/api/invitations/:token/accept',
    {
      preHandler: [authenticateUser],
    },
    acceptInvitation as any,
  );

  // Decline invitation (requires authentication, no household membership check)
  fastify.post(
    '/api/invitations/:token/decline',
    {
      preHandler: [authenticateUser],
    },
    declineInvitation as any,
  );
}
