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
        throw new TransactionValidationError(404, 'Not Found', 'Child not found in this household');
      }
      if (childResult.rows[0].user_id) {
        throw new TransactionValidationError(409, 'Conflict', 'Child already has a user account');
      }

      // ST-2227: an e-mail that already has a Diddit login is fine — that person signs in
      // with Google and accepts on /child-invite/:token. The parent gets the same answer
      // either way, so this endpoint never tells whether an e-mail has an account.

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
        throw new TransactionValidationError(409, 'ACCOUNT_EXISTS', 'Email already in use');
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

/**
 * ST-2227 — an existing Google-backed account accepts a child invitation.
 *
 * The person is already logged in (Google). The account keeps its identity, its Google
 * subject and every other household with its role; it gets the child role in the inviting
 * household only, and is linked to the existing children row (points and history stay).
 *
 * Every rule is checked again under row locks inside one transaction, so a wrong account,
 * a dead link, a profile linked meanwhile, a membership added meanwhile, an inviter who
 * lost parent rights, or a second press commits nothing.
 */
export type ExistingAcceptCode =
  | 'NOT_FOUND'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'USED'
  | 'NOT_GOOGLE'
  | 'WRONG_ACCOUNT'
  | 'ALREADY_MEMBER'
  | 'PROFILE_LINKED';

class LinkRefused extends Error {
  constructor(
    public statusCode: number,
    public code: ExistingAcceptCode,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'LinkRefused';
  }
}

interface Queryable {
  query: typeof db.query;
}

interface LinkCheck {
  invitationId: string;
  householdId: string;
  householdName: string;
  childId: string;
  childName: string;
  points: number;
  inviterName: string;
  invitedEmail: string;
  signedInEmail: string;
}

/**
 * The checks shared by the read (eligibility) and the write (accept). With `lock` the rows
 * are taken FOR UPDATE in a fixed order: invitation, user, child, membership.
 */
async function checkLink(
  client: Queryable,
  token: string,
  userId: string,
  lock: boolean,
): Promise<LinkCheck> {
  const forUpdate = lock ? 'FOR UPDATE' : '';
  const inv = await client.query(
    `SELECT id, household_id, child_id, invited_by, invited_email, status, expires_at
     FROM invitations WHERE token = $1 AND role = 'child' ${forUpdate}`,
    [token],
  );
  if (inv.rows.length === 0) throw new LinkRefused(404, 'NOT_FOUND', 'Invitation not found');
  const invitation = inv.rows[0];

  const names = await client.query(
    `SELECT h.name AS household_name, c.name AS child_name,
            COALESCE(NULLIF(u.first_name, ''), u.email) AS inviter_name,
            COALESCE(b.points_balance, 0)::int AS points
     FROM households h
     JOIN children c ON c.id = $2
     JOIN users u ON u.id = $3
     LEFT JOIN child_points_balance b ON b.child_id = c.id
     WHERE h.id = $1`,
    [invitation.household_id, invitation.child_id, invitation.invited_by],
  );
  const n = names.rows[0] ?? {};
  const base = {
    householdName: n.household_name as string,
    childName: n.child_name as string,
    inviterName: n.inviter_name as string,
  };

  const state = stateOf(invitation.status, invitation.expires_at);
  if (state !== 'valid') {
    const code = state === 'used' ? 'USED' : state === 'cancelled' ? 'CANCELLED' : 'EXPIRED';
    // A dead link tells only what the public page tells: no household or child names
    throw new LinkRefused(410, code, `Invitation is ${state}`, { inviterName: base.inviterName });
  }

  // The inviter must still be a parent or admin there; otherwise the link is dead
  const inviter = await client.query(
    `SELECT role FROM household_members
     WHERE household_id = $1 AND user_id = $2 AND role IN ('admin', 'parent')`,
    [invitation.household_id, invitation.invited_by],
  );
  if (inviter.rows.length === 0) {
    throw new LinkRefused(410, 'CANCELLED', 'Invitation is cancelled', {
      inviterName: base.inviterName,
    });
  }

  const user = await client.query(
    `SELECT email, oauth_provider, oauth_provider_id FROM users WHERE id = $1 ${forUpdate}`,
    [userId],
  );
  if (user.rows.length === 0) throw new LinkRefused(401, 'WRONG_ACCOUNT', 'Unknown account');
  const account = user.rows[0];
  const signedInEmail = account.email as string;
  const invitedEmail = invitation.invited_email as string;

  // Strict: the invited e-mail and the account e-mail match ignoring case — and the
  // account is Google-backed. E-mail alone never links anything.
  if (signedInEmail.trim().toLowerCase() !== invitedEmail.trim().toLowerCase()) {
    throw new LinkRefused(403, 'WRONG_ACCOUNT', 'Invitation email does not match', {
      ...base,
      signedInEmail,
    });
  }
  if (account.oauth_provider !== 'google' || !account.oauth_provider_id) {
    throw new LinkRefused(403, 'NOT_GOOGLE', 'A Google sign-in is required', {
      ...base,
      signedInEmail,
    });
  }

  const child = await client.query(
    `SELECT user_id FROM children WHERE id = $1 AND household_id = $2 ${forUpdate}`,
    [invitation.child_id, invitation.household_id],
  );
  if (child.rows.length === 0) throw new LinkRefused(404, 'NOT_FOUND', 'Child not found');
  if (child.rows[0].user_id) {
    throw new LinkRefused(409, 'PROFILE_LINKED', 'Child already has a user account', base);
  }

  const member = await client.query(
    `SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2 ${forUpdate}`,
    [invitation.household_id, userId],
  );
  if (member.rows.length > 0) {
    throw new LinkRefused(409, 'ALREADY_MEMBER', 'Already a member of this household', {
      ...base,
      householdId: invitation.household_id,
      role: member.rows[0].role,
    });
  }

  return {
    invitationId: invitation.id,
    householdId: invitation.household_id,
    childId: invitation.child_id,
    points: n.points ?? 0,
    invitedEmail,
    signedInEmail,
    ...base,
  };
}

function sendRefusal(reply: FastifyReply, error: LinkRefused) {
  return reply.status(error.statusCode).send({
    error: error.code,
    code: error.code,
    message: error.message,
    ...error.extra,
  });
}

/**
 * GET /api/child-invitations/:token/existing  (logged in)
 * What the consent page shows for the signed-in account. Reads only; changes nothing.
 */
async function getExistingEligibility(
  request: FastifyRequest<{ Params: TokenParams }>,
  reply: FastifyReply,
) {
  const userId = request.user?.userId;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
  }
  try {
    const check = await checkLink(db, request.params.token, userId, false);
    return reply.status(200).send({
      householdName: check.householdName,
      childName: check.childName,
      points: check.points,
      inviterName: check.inviterName,
      signedInEmail: check.signedInEmail,
      role: 'child',
    });
  } catch (error) {
    if (error instanceof LinkRefused) return sendRefusal(reply, error);
    request.log.error(error, 'Failed to check child invitation for existing account');
    return reply
      .status(500)
      .send({ error: 'Internal Server Error', message: 'Failed to check invitation' });
  }
}

/**
 * POST /api/child-invitations/:token/accept-existing  (logged in)
 * Body: { consent: true }. Links the signed-in Google account to the child profile.
 */
async function acceptExistingChildInvitation(
  request: FastifyRequest<{ Params: TokenParams; Body: { consent?: boolean } }>,
  reply: FastifyReply,
) {
  const userId = request.user?.userId;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
  }
  if (request.body?.consent !== true) {
    return reply
      .status(400)
      .send({ error: 'Bad Request', message: 'Explicit consent is required' });
  }

  try {
    const linked = await withTransaction(pool, async (client) => {
      const check = await checkLink(client, request.params.token, userId, true);

      // Membership first: the children trigger checks it before user_id is linked
      await client.query(
        `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'child')`,
        [check.householdId, userId],
      );
      const updated = await client.query(
        `UPDATE children SET user_id = $1, updated_at = NOW()
         WHERE id = $2 AND user_id IS NULL RETURNING id`,
        [userId, check.childId],
      );
      if (updated.rows.length !== 1) {
        throw new LinkRefused(409, 'PROFILE_LINKED', 'Child already has a user account');
      }
      const spent = await client.query(
        `UPDATE invitations SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND status = 'pending' RETURNING id`,
        [check.invitationId],
      );
      if (spent.rows.length !== 1) {
        throw new LinkRefused(410, 'USED', 'Invitation is used');
      }
      return check;
    });

    request.log.info(
      { userId, householdId: linked.householdId, childId: linked.childId },
      'Existing account linked to child profile',
    );
    return reply.status(200).send({
      householdId: linked.householdId,
      householdName: linked.householdName,
      childId: linked.childId,
      childName: linked.childName,
      role: 'child',
    });
  } catch (error) {
    if (error instanceof LinkRefused) return sendRefusal(reply, error);
    // A unique violation means a parallel press won; nothing of ours was committed
    if ((error as { code?: string })?.code === '23505') {
      return reply
        .status(409)
        .send({ error: 'USED', code: 'USED', message: 'Invitation was just used' });
    }
    request.log.error(error, 'Failed to link existing account to child');
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
  fastify.get<{ Params: TokenParams }>(
    '/api/child-invitations/:token/existing',
    { preHandler: [authenticateUser] },
    getExistingEligibility,
  );
  fastify.post<{ Params: TokenParams; Body: { consent?: boolean } }>(
    '/api/child-invitations/:token/accept-existing',
    { preHandler: [authenticateUser] },
    acceptExistingChildInvitation,
  );
}
