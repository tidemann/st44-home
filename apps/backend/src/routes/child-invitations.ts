import { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { db, pool } from '../database.js';
import { authenticateUser } from '../middleware/auth.js';
import {
  validateHouseholdMembership,
  requireHouseholdParent,
} from '../middleware/household-membership.js';
import { withTransaction } from '../utils/index.js';

/**
 * Child invitations (ST-1678)
 *
 * A parent makes a link for a child profile that already exists. The child opens it, sets
 * their own password, and the new login is linked to the same children row, so the points
 * and the history stay where they are. A parent making the link is the parental consent for
 * a child under 13. No e-mail is sent yet (ST-1362): the parent copies the link.
 *
 * Rows live in `invitations` with role 'child' and child_id set (migration 055).
 */

class TransactionValidationError extends Error {
  constructor(
    public statusCode: number,
    public error: string,
    message: string,
  ) {
    super(message);
    this.name = 'TransactionValidationError';
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What a dead or live link looks like to the child */
export type ChildInvitationState = 'valid' | 'expired' | 'cancelled' | 'used';

/** Pending past its date reads as expired; nothing rewrites the row */
function stateOf(status: string, expiresAt: Date): ChildInvitationState {
  if (status === 'accepted') return 'used';
  if (status === 'cancelled' || status === 'declined') return 'cancelled';
  if (status === 'expired' || new Date(expiresAt) < new Date()) return 'expired';
  return 'valid';
}

interface ChildParams {
  householdId: string;
  childId: string;
}

interface TokenParams {
  token: string;
}

interface InvitationRow {
  id: string;
  invited_email: string;
  token: string;
  status: string;
  expires_at: Date;
  accepted_at: Date | null;
  created_at: Date;
}

/** The parent's view: the newest invitation for the child, with the link token */
function toParentView(row: InvitationRow) {
  const state = stateOf(row.status, row.expires_at);
  return {
    id: row.id,
    email: row.invited_email,
    token: row.token,
    status: state === 'valid' ? 'pending' : state === 'used' ? 'accepted' : state,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
  };
}

/**
 * GET /api/households/:householdId/children/:childId/invitation
 * The newest invitation for this child, or null
 */
async function getChildInvitation(
  request: FastifyRequest<{ Params: ChildParams }>,
  reply: FastifyReply,
) {
  const { householdId, childId } = request.params;
  try {
    const result = await db.query<InvitationRow>(
      `SELECT id, invited_email, token, status, expires_at, accepted_at, created_at
       FROM invitations
       WHERE household_id = $1 AND child_id = $2 AND role = 'child'
       ORDER BY created_at DESC
       LIMIT 1`,
      [householdId, childId],
    );
    return reply
      .status(200)
      .send({ invitation: result.rows[0] ? toParentView(result.rows[0]) : null });
  } catch (error) {
    request.log.error(error, 'Failed to get child invitation');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to get child invitation',
    });
  }
}

/**
 * POST /api/households/:householdId/children/:childId/invitation
 * Makes a new 7-day link. Any older pending link for the child is cancelled («Lag ny lenke»).
 */
async function createChildInvitation(
  request: FastifyRequest<{ Params: ChildParams; Body: { email?: string } }>,
  reply: FastifyReply,
) {
  const { householdId, childId } = request.params;
  const userId = request.user?.userId;
  const email = (request.body?.email ?? '').trim().toLowerCase();

  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
  }
  if (!EMAIL_REGEX.test(email) || email.length > 255) {
    return reply
      .status(400)
      .send({ error: 'Bad Request', message: 'Valid email address is required' });
  }

  try {
    const invitation = await withTransaction(pool, async (client) => {
      const childResult = await client.query(
        `SELECT id, user_id FROM children WHERE id = $1 AND household_id = $2 FOR UPDATE`,
        [childId, householdId],
      );
      if (childResult.rows.length === 0) {
        throw new TransactionValidationError(
          404,
          'Not Found',
          'Child not found in this household',
        );
      }
      if (childResult.rows[0].user_id) {
        throw new TransactionValidationError(409, 'Conflict', 'Child already has a user account');
      }

      const emailCheck = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [
        email,
      ]);
      if (emailCheck.rows.length > 0) {
        throw new TransactionValidationError(409, 'Conflict', 'Email already in use');
      }

      await client.query(
        `UPDATE invitations SET status = 'cancelled', updated_at = NOW()
         WHERE child_id = $1 AND role = 'child' AND status = 'pending'`,
        [childId],
      );

      const result = await client.query<InvitationRow>(
        `INSERT INTO invitations (household_id, invited_by, invited_email, token, role, status, expires_at, child_id)
         VALUES ($1, $2, $3, $4, 'child', 'pending', NOW() + INTERVAL '7 days', $5)
         RETURNING id, invited_email, token, status, expires_at, accepted_at, created_at`,
        [householdId, userId, email, crypto.randomBytes(32).toString('hex'), childId],
      );
      return result.rows[0];
    });

    request.log.info({ householdId, childId }, 'Child invitation created');
    return reply.status(201).send({ invitation: toParentView(invitation) });
  } catch (error) {
    if (error instanceof TransactionValidationError) {
      return reply.status(error.statusCode).send({ error: error.error, message: error.message });
    }
    request.log.error(error, 'Failed to create child invitation');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to create child invitation',
    });
  }
}

/**
 * DELETE /api/households/:householdId/children/:childId/invitation
 * Cancels the pending link. The child's profile, points and history are not touched.
 */
async function cancelChildInvitation(
  request: FastifyRequest<{ Params: ChildParams }>,
  reply: FastifyReply,
) {
  const { householdId, childId } = request.params;
  try {
    const result = await db.query(
      `UPDATE invitations SET status = 'cancelled', updated_at = NOW()
       WHERE household_id = $1 AND child_id = $2 AND role = 'child' AND status = 'pending'
       RETURNING id`,
      [householdId, childId],
    );
    if (result.rows.length === 0) {
      return reply
        .status(404)
        .send({ error: 'Not Found', message: 'No pending invitation for this child' });
    }
    return reply.status(204).send();
  } catch (error) {
    request.log.error(error, 'Failed to cancel child invitation');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to cancel child invitation',
    });
  }
}

/**
 * GET /api/child-invitations/:token  (public — the token is the secret)
 * What the child's page needs: the state, and for a live link the names and the points
 */
async function getChildInvitationByToken(
  request: FastifyRequest<{ Params: TokenParams }>,
  reply: FastifyReply,
) {
  const { token } = request.params;
  try {
    const result = await db.query(
      `SELECT i.status, i.expires_at, i.invited_email,
              c.name AS child_name, h.name AS household_name,
              COALESCE(NULLIF(u.first_name, ''), u.email) AS inviter_name,
              COALESCE(b.points_balance, 0)::int AS points
       FROM invitations i
       JOIN children c ON c.id = i.child_id
       JOIN households h ON h.id = i.household_id
       JOIN users u ON u.id = i.invited_by
       LEFT JOIN child_points_balance b ON b.child_id = c.id
       WHERE i.token = $1 AND i.role = 'child'`,
      [token],
    );
    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Not Found', message: 'Invitation not found' });
    }
    const row = result.rows[0];
    const state = stateOf(row.status, row.expires_at);
    // A dead link tells only what the page says; the names stay with a live link
    return reply.status(200).send({
      state,
      inviterName: row.inviter_name,
      expiresAt: row.expires_at,
      ...(state === 'valid'
        ? {
            email: row.invited_email,
            childName: row.child_name,
            householdName: row.household_name,
            points: row.points,
          }
        : {}),
    });
  } catch (error) {
    request.log.error(error, 'Failed to read child invitation');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to read child invitation',
    });
  }
}

/**
 * POST /api/child-invitations/:token/accept  (public)
 * Body: { password }. Makes the login with the invited e-mail, links it to the existing
 * children row (nothing is copied or reset) and spends the link. The page then logs in
 * with the e-mail and the new password.
 */
async function acceptChildInvitation(
  request: FastifyRequest<{ Params: TokenParams; Body: { password?: string } }>,
  reply: FastifyReply,
) {
  const { token } = request.params;
  const password = request.body?.password ?? '';

  if (password.length < 8 || password.length > 128) {
    return reply
      .status(400)
      .send({ error: 'Bad Request', message: 'Password must be 8 to 128 characters' });
  }

  try {
    const email = await withTransaction(pool, async (client) => {
      const invitationResult = await client.query(
        `SELECT id, household_id, child_id, invited_email, status, expires_at
         FROM invitations WHERE token = $1 AND role = 'child' FOR UPDATE`,
        [token],
      );
      if (invitationResult.rows.length === 0) {
        throw new TransactionValidationError(404, 'Not Found', 'Invitation not found');
      }
      const invitation = invitationResult.rows[0];
      const state = stateOf(invitation.status, invitation.expires_at);
      if (state !== 'valid') {
        throw new TransactionValidationError(410, 'Gone', `Invitation is ${state}`);
      }

      const childResult = await client.query(
        'SELECT user_id FROM children WHERE id = $1 FOR UPDATE',
        [invitation.child_id],
      );
      if (childResult.rows.length === 0) {
        throw new TransactionValidationError(404, 'Not Found', 'Child not found');
      }
      if (childResult.rows[0].user_id) {
        throw new TransactionValidationError(409, 'Conflict', 'Child already has a user account');
      }

      const emailCheck = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [
        invitation.invited_email,
      ]);
      if (emailCheck.rows.length > 0) {
        throw new TransactionValidationError(409, 'Conflict', 'Email already in use');
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
        [invitation.invited_email, passwordHash],
      );
      const newUserId = userResult.rows[0].id;

      // The membership first: the children trigger checks it before user_id is linked
      await client.query(
        `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'child')`,
        [invitation.household_id, newUserId],
      );
      await client.query('UPDATE children SET user_id = $1, updated_at = NOW() WHERE id = $2', [
        newUserId,
        invitation.child_id,
      ]);
      await client.query(
        `UPDATE invitations SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [invitation.id],
      );
      return invitation.invited_email as string;
    });

    request.log.info({ token: token.slice(0, 8) }, 'Child invitation accepted');
    return reply.status(200).send({ email });
  } catch (error) {
    if (error instanceof TransactionValidationError) {
      return reply.status(error.statusCode).send({ error: error.error, message: error.message });
    }
    request.log.error(error, 'Failed to accept child invitation');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to accept child invitation',
    });
  }
}

export async function childInvitationRoutes(fastify: FastifyInstance) {
  const parentOnly = [
    authenticateUser,
    validateHouseholdMembership as preHandlerHookHandler,
    requireHouseholdParent as preHandlerHookHandler,
  ];
  const path = '/api/households/:householdId/children/:childId/invitation';

  fastify.get<{ Params: ChildParams }>(path, { preHandler: parentOnly }, getChildInvitation);
  fastify.post<{ Params: ChildParams; Body: { email?: string } }>(
    path,
    { preHandler: parentOnly },
    createChildInvitation,
  );
  fastify.delete<{ Params: ChildParams }>(path, { preHandler: parentOnly }, cancelChildInvitation);

  fastify.get<{ Params: TokenParams }>('/api/child-invitations/:token', getChildInvitationByToken);
  fastify.post<{ Params: TokenParams; Body: { password?: string } }>(
    '/api/child-invitations/:token/accept',
    acceptChildInvitation,
  );
}
