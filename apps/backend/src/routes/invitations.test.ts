import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { registerAndLogin } from '../test-helpers/auth.ts';
import { generateTestEmail } from '../test-helpers/fixtures.ts';

/**
 * Invitation System API Tests
 *
 * Tests cover:
 * - POST /api/households/:householdId/invitations - Send invitation
 * - GET /api/households/:householdId/invitations - List sent invitations
 * - DELETE /api/households/:householdId/invitations/:id - Cancel invitation
 * - GET /api/users/me/invitations - List received invitations
 * - POST /api/invitations/:token/accept - Accept invitation
 * - POST /api/invitations/:token/decline - Decline invitation
 */

describe('Invitation API', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;

  // User 1 - admin who creates household and sends invitations
  let user1Token: string;
  let user1Id: string;
  let user1Email: string;

  // User 2 - receives invitations
  let user2Token: string;
  let user2Id: string;
  let user2Email: string;

  // User 3 - outsider for testing unauthorized access
  let user3Token: string;
  let user3Id: string;

  // Shared household
  let householdId: string;

  before(async () => {
    app = await build();
    await app.ready();

    pool = new pg.Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'st44',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    // Create test users
    user1Email = generateTestEmail('inv-admin');
    user2Email = generateTestEmail('inv-recipient');
    const user3Email = generateTestEmail('inv-outsider');
    const testPassword = 'TestPass123!';

    const user1Data = await registerAndLogin(app, user1Email, testPassword);
    const user2Data = await registerAndLogin(app, user2Email, testPassword);
    const user3Data = await registerAndLogin(app, user3Email, testPassword);

    user1Token = user1Data.accessToken;
    user2Token = user2Data.accessToken;
    user3Token = user3Data.accessToken;

    // Get user IDs
    const user1Result = await pool.query('SELECT id FROM users WHERE email = $1', [user1Email]);
    const user2Result = await pool.query('SELECT id FROM users WHERE email = $1', [user2Email]);
    const user3Result = await pool.query('SELECT id FROM users WHERE email = $1', [user3Email]);

    user1Id = user1Result.rows[0].id;
    user2Id = user2Result.rows[0].id;
    user3Id = user3Result.rows[0].id;

    // Create a household for user1
    const householdResponse = await app.inject({
      method: 'POST',
      url: '/api/households',
      headers: { Authorization: `Bearer ${user1Token}` },
      payload: { name: `Invitation Test Household ${Date.now()}` },
    });
    householdId = JSON.parse(householdResponse.body).id;
  });

  after(async () => {
    // Cleanup invitations first (due to FK constraints)
    await pool.query('DELETE FROM invitations WHERE household_id = $1', [householdId]);
    // Cleanup household members
    await pool.query('DELETE FROM household_members WHERE user_id IN ($1, $2, $3)', [
      user1Id,
      user2Id,
      user3Id,
    ]);
    // Cleanup households
    await pool.query('DELETE FROM households WHERE id = $1', [householdId]);
    // Cleanup users
    await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [user1Id, user2Id, user3Id]);
    await pool.end();
    await app.close();
  });

  describe('POST /api/households/:householdId/invitations', () => {
    test('should create invitation successfully', async () => {
      const targetEmail = generateTestEmail('new-invite');

      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: targetEmail, role: 'parent' },
      });

      assert.strictEqual(response.statusCode, 201);
      const body = JSON.parse(response.body);
      assert.ok(body.id);
      assert.strictEqual(body.email, targetEmail.toLowerCase());
      assert.ok(body.token);
      assert.strictEqual(body.role, 'parent');
      assert.strictEqual(body.status, 'pending');
      assert.ok(body.expiresAt);

      // Cleanup
      await pool.query('DELETE FROM invitations WHERE id = $1', [body.id]);
    });

    test('should create invitation with admin role', async () => {
      const targetEmail = generateTestEmail('admin-invite');

      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: targetEmail, role: 'admin' },
      });

      assert.strictEqual(response.statusCode, 201);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.role, 'admin');

      // Cleanup
      await pool.query('DELETE FROM invitations WHERE id = $1', [body.id]);
    });

    test('should reject invitation without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        payload: { email: 'test@example.com', role: 'parent' },
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject invitation with invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: 'invalid-email', role: 'parent' },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.ok(body.message.includes('email'));
    });

    test('should reject invitation with invalid role', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: 'test@example.com', role: 'invalid' },
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject invitation to existing member', async () => {
      // user1Email is already a member of the household
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: user1Email, role: 'parent' },
      });

      assert.strictEqual(response.statusCode, 409);
      const body = JSON.parse(response.body);
      assert.ok(body.message.includes('already a household member'));
    });

    test('should reject duplicate pending invitation', async () => {
      const targetEmail = generateTestEmail('dup-invite');

      // First invitation
      const response1 = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: targetEmail, role: 'parent' },
      });
      assert.strictEqual(response1.statusCode, 201);
      const invitationId = JSON.parse(response1.body).id;

      // Second invitation to same email
      const response2 = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: targetEmail, role: 'parent' },
      });

      assert.strictEqual(response2.statusCode, 409);
      const body = JSON.parse(response2.body);
      assert.ok(body.message.includes('Pending invitation already exists'));

      // Cleanup
      await pool.query('DELETE FROM invitations WHERE id = $1', [invitationId]);
    });

    test('should reject invitation from non-member', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user3Token}` },
        payload: { email: 'new@example.com', role: 'parent' },
      });

      assert.strictEqual(response.statusCode, 403);
    });
  });

  describe('GET /api/households/:householdId/invitations', () => {
    let testInvitationId: string;

    before(async () => {
      // Create a test invitation
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: generateTestEmail('list-test'), role: 'parent' },
      });
      testInvitationId = JSON.parse(response.body).id;
    });

    after(async () => {
      await pool.query('DELETE FROM invitations WHERE id = $1', [testInvitationId]);
    });

    test('should list sent invitations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.invitations));
      assert.ok(body.invitations.length >= 1);

      const invitation = body.invitations.find((i: any) => i.id === testInvitationId);
      assert.ok(invitation);
      assert.ok(invitation.invitedEmail);
      assert.ok(invitation.inviterEmail);
    });

    test('should filter invitations by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/invitations?status=pending`,
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      body.invitations.forEach((inv: any) => {
        assert.strictEqual(inv.status, 'pending');
      });
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/invitations`,
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject from non-member', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user3Token}` },
      });

      assert.strictEqual(response.statusCode, 403);
    });
  });

  describe('DELETE /api/households/:householdId/invitations/:id', () => {
    test('should cancel pending invitation', async () => {
      // Create invitation
      const createResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: generateTestEmail('cancel-test'), role: 'parent' },
      });
      const invitationId = JSON.parse(createResponse.body).id;

      // Cancel it
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/invitations/${invitationId}`,
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.strictEqual(response.statusCode, 204);

      // Verify status changed
      const checkResult = await pool.query('SELECT status FROM invitations WHERE id = $1', [
        invitationId,
      ]);
      assert.strictEqual(checkResult.rows[0].status, 'cancelled');

      // Cleanup
      await pool.query('DELETE FROM invitations WHERE id = $1', [invitationId]);
    });

    test('should reject cancel from non-member', async () => {
      // Create invitation
      const createResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: generateTestEmail('cancel-unauth'), role: 'parent' },
      });
      const invitationId = JSON.parse(createResponse.body).id;

      // Try to cancel as outsider
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/invitations/${invitationId}`,
        headers: { Authorization: `Bearer ${user3Token}` },
      });

      assert.strictEqual(response.statusCode, 403);

      // Cleanup
      await pool.query('DELETE FROM invitations WHERE id = $1', [invitationId]);
    });

    test('should reject cancel of non-existent invitation', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/invitations/${fakeId}`,
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.strictEqual(response.statusCode, 404);
    });
  });

  describe('GET /api/users/me/invitations', () => {
    let invitationToken: string;
    let invitationId: string;

    before(async () => {
      // Create invitation for user2
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: user2Email, role: 'parent' },
      });
      const body = JSON.parse(response.body);
      invitationToken = body.token;
      invitationId = body.id;
    });

    after(async () => {
      await pool.query('DELETE FROM invitations WHERE id = $1', [invitationId]);
    });

    test('should list received invitations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/me/invitations',
        headers: { Authorization: `Bearer ${user2Token}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.invitations));

      const invitation = body.invitations.find((i: any) => i.id === invitationId);
      assert.ok(invitation);
      assert.ok(invitation.householdName);
      assert.ok(invitation.token);
    });

    test('should not show invitations for other users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/me/invitations',
        headers: { Authorization: `Bearer ${user3Token}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      // user3 should not see user2's invitation
      const invitation = body.invitations.find((i: any) => i.id === invitationId);
      assert.strictEqual(invitation, undefined);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/me/invitations',
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('POST /api/invitations/:token/accept', () => {
    test('should accept valid invitation', async () => {
      // Create new user for this test
      const newUserEmail = generateTestEmail('accept-user');
      const newUserData = await registerAndLogin(app, newUserEmail, 'TestPass123!');

      // Create invitation for new user
      const inviteResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: newUserEmail, role: 'parent' },
      });
      const inviteBody = JSON.parse(inviteResponse.body);

      // Accept invitation
      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/${inviteBody.token}/accept`,
        headers: { Authorization: `Bearer ${newUserData.accessToken}` },
        payload: {},
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(body.household);
      assert.strictEqual(body.household.id, householdId);
      assert.strictEqual(body.household.role, 'parent');

      // Verify membership was created
      const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [newUserEmail]);
      const memberCheck = await pool.query(
        'SELECT * FROM household_members WHERE household_id = $1 AND user_id = $2',
        [householdId, userResult.rows[0].id],
      );
      assert.strictEqual(memberCheck.rows.length, 1);

      // Cleanup
      await pool.query('DELETE FROM household_members WHERE user_id = $1', [
        userResult.rows[0].id,
      ]);
      await pool.query('DELETE FROM invitations WHERE id = $1', [inviteBody.id]);
      await pool.query('DELETE FROM users WHERE id = $1', [userResult.rows[0].id]);
    });

    test('should reject accepting invitation for wrong user', async () => {
      // Create invitation for user2
      const inviteResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: user2Email, role: 'parent' },
      });
      const inviteBody = JSON.parse(inviteResponse.body);

      // Try to accept as user3 (wrong user)
      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/${inviteBody.token}/accept`,
        headers: { Authorization: `Bearer ${user3Token}` },
        payload: {},
      });

      assert.strictEqual(response.statusCode, 403);
      const body = JSON.parse(response.body);
      assert.ok(body.message.includes('not for your email'));

      // Cleanup
      await pool.query('DELETE FROM invitations WHERE id = $1', [inviteBody.id]);
    });

    test('should reject accepting expired invitation', async () => {
      // Create invitation for user2
      const inviteResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: user2Email, role: 'parent' },
      });
      const inviteBody = JSON.parse(inviteResponse.body);

      // Manually expire the invitation (must maintain expires_at > created_at constraint)
      // Set created_at to 10 days ago and expires_at to 2 days ago
      await pool.query(
        `UPDATE invitations 
         SET created_at = NOW() - INTERVAL '10 days', 
             expires_at = NOW() - INTERVAL '2 days' 
         WHERE id = $1`,
        [inviteBody.id],
      );

      // Try to accept
      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/${inviteBody.token}/accept`,
        headers: { Authorization: `Bearer ${user2Token}` },
        payload: {},
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.ok(body.message.includes('expired'));

      // Cleanup
      await pool.query('DELETE FROM invitations WHERE id = $1', [inviteBody.id]);
    });

    test('should reject accepting already accepted invitation', async () => {
      // Create new user
      const newUserEmail = generateTestEmail('double-accept');
      const newUserData = await registerAndLogin(app, newUserEmail, 'TestPass123!');

      // Create invitation
      const inviteResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: newUserEmail, role: 'parent' },
      });
      const inviteBody = JSON.parse(inviteResponse.body);

      // Accept first time
      await app.inject({
        method: 'POST',
        url: `/api/invitations/${inviteBody.token}/accept`,
        headers: { Authorization: `Bearer ${newUserData.accessToken}` },
        payload: {},
      });

      // Try to accept again
      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/${inviteBody.token}/accept`,
        headers: { Authorization: `Bearer ${newUserData.accessToken}` },
        payload: {},
      });

      assert.strictEqual(response.statusCode, 400);

      // Cleanup
      const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [newUserEmail]);
      await pool.query('DELETE FROM household_members WHERE user_id = $1', [
        userResult.rows[0].id,
      ]);
      await pool.query('DELETE FROM invitations WHERE id = $1', [inviteBody.id]);
      await pool.query('DELETE FROM users WHERE id = $1', [userResult.rows[0].id]);
    });

    test('should reject accepting with invalid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/invitations/invalid-token-12345/accept',
        headers: { Authorization: `Bearer ${user2Token}` },
        payload: {},
      });

      assert.strictEqual(response.statusCode, 404);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/invitations/some-token/accept',
        payload: {},
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('POST /api/invitations/:token/decline', () => {
    test('should decline valid invitation', async () => {
      // Create invitation for user2
      const inviteResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: user2Email, role: 'parent' },
      });
      const inviteBody = JSON.parse(inviteResponse.body);

      // Decline invitation
      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/${inviteBody.token}/decline`,
        headers: { Authorization: `Bearer ${user2Token}` },
        payload: {},
      });

      assert.strictEqual(response.statusCode, 204);

      // Verify status changed
      const checkResult = await pool.query('SELECT status FROM invitations WHERE id = $1', [
        inviteBody.id,
      ]);
      assert.strictEqual(checkResult.rows[0].status, 'declined');

      // Cleanup
      await pool.query('DELETE FROM invitations WHERE id = $1', [inviteBody.id]);
    });

    test('should reject declining invitation for wrong user', async () => {
      // Create invitation for user2
      const inviteResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: user2Email, role: 'parent' },
      });
      const inviteBody = JSON.parse(inviteResponse.body);

      // Try to decline as user3 (wrong user)
      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/${inviteBody.token}/decline`,
        headers: { Authorization: `Bearer ${user3Token}` },
        payload: {},
      });

      assert.strictEqual(response.statusCode, 404);

      // Cleanup
      await pool.query('DELETE FROM invitations WHERE id = $1', [inviteBody.id]);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/invitations/some-token/decline',
        payload: {},
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('Security Tests', () => {
    test('should not leak invitation tokens in list response for sent invitations', async () => {
      // Create invitation
      const inviteResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: generateTestEmail('leak-test'), role: 'parent' },
      });
      const inviteBody = JSON.parse(inviteResponse.body);

      // List sent invitations
      const listResponse = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      const listBody = JSON.parse(listResponse.body);
      const invitation = listBody.invitations.find((i: any) => i.id === inviteBody.id);

      // Token should NOT be in sent invitations list
      assert.strictEqual(invitation.token, undefined);

      // Cleanup
      await pool.query('DELETE FROM invitations WHERE id = $1', [inviteBody.id]);
    });

    test('should include token in received invitations for recipient', async () => {
      // Create invitation for user2
      const inviteResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: user2Email, role: 'parent' },
      });
      const inviteBody = JSON.parse(inviteResponse.body);

      // List received invitations
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/users/me/invitations',
        headers: { Authorization: `Bearer ${user2Token}` },
      });

      const listBody = JSON.parse(listResponse.body);
      const invitation = listBody.invitations.find((i: any) => i.id === inviteBody.id);

      // Token SHOULD be present for recipient
      assert.ok(invitation.token);

      // Cleanup
      await pool.query('DELETE FROM invitations WHERE id = $1', [inviteBody.id]);
    });

    test('should prevent accepting invitation after user becomes member', async () => {
      // Create new user
      const newUserEmail = generateTestEmail('already-member');
      const newUserData = await registerAndLogin(app, newUserEmail, 'TestPass123!');
      const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [newUserEmail]);
      const newUserId = userResult.rows[0].id;

      // Create invitation
      const inviteResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { email: newUserEmail, role: 'parent' },
      });
      const inviteBody = JSON.parse(inviteResponse.body);

      // Manually add user as member (simulating another invite was accepted first)
      await pool.query(
        "INSERT INTO household_members (household_id, user_id, role, joined_at) VALUES ($1, $2, 'parent', NOW())",
        [householdId, newUserId],
      );

      // Try to accept the invitation
      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/${inviteBody.token}/accept`,
        headers: { Authorization: `Bearer ${newUserData.accessToken}` },
        payload: {},
      });

      assert.strictEqual(response.statusCode, 409);
      const body = JSON.parse(response.body);
      assert.ok(body.message.includes('already a member'));

      // Cleanup
      await pool.query('DELETE FROM household_members WHERE user_id = $1', [newUserId]);
      await pool.query('DELETE FROM invitations WHERE id = $1', [inviteBody.id]);
      await pool.query('DELETE FROM users WHERE id = $1', [newUserId]);
    });
  });
});
