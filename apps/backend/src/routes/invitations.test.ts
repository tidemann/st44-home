import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';

/**
 * Invitation Management API Tests
 *
 * Tests the invitation CRUD endpoints including:
 * - Creating invitations
 * - Listing sent/received invitations
 * - Accepting/declining invitations
 * - Authorization and data isolation
 */

describe('Invitation API', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let adminToken: string;
  let parentToken: string;
  let inviteeToken: string;
  let outsiderToken: string;
  let householdId: string;
  let adminUserId: number;
  let parentUserId: number;
  let inviteeUserId: number;
  let outsiderUserId: number;
  let inviteeEmail: string;
  let outsiderEmail: string;

  before(async () => {
    // Build Fastify app
    app = await build();
    await app.ready();

    // Get database pool
    pool = new pg.Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'st44',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    // Create test users
    const adminEmail = `test-invite-admin-${Date.now()}@example.com`;
    const parentEmail = `test-invite-parent-${Date.now()}@example.com`;
    inviteeEmail = `test-invite-invitee-${Date.now()}@example.com`;
    outsiderEmail = `test-invite-outsider-${Date.now()}@example.com`;

    const adminResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: adminEmail, password: 'TestPass123!' },
    });

    const parentResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: parentEmail, password: 'TestPass123!' },
    });

    const inviteeResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: inviteeEmail, password: 'TestPass123!' },
    });

    const outsiderResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: outsiderEmail, password: 'TestPass123!' },
    });

    const adminData = JSON.parse(adminResponse.body);
    const parentData = JSON.parse(parentResponse.body);
    const inviteeData = JSON.parse(inviteeResponse.body);
    const outsiderData = JSON.parse(outsiderResponse.body);

    adminToken = adminData.accessToken;
    parentToken = parentData.accessToken;
    inviteeToken = inviteeData.accessToken;
    outsiderToken = outsiderData.accessToken;

    // Get user IDs
    const adminResult = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    const parentResult = await pool.query('SELECT id FROM users WHERE email = $1', [parentEmail]);
    const inviteeResult = await pool.query('SELECT id FROM users WHERE email = $1', [inviteeEmail]);
    const outsiderResult = await pool.query('SELECT id FROM users WHERE email = $1', [
      outsiderEmail,
    ]);

    adminUserId = adminResult.rows[0].id;
    parentUserId = parentResult.rows[0].id;
    inviteeUserId = inviteeResult.rows[0].id;
    outsiderUserId = outsiderResult.rows[0].id;

    // Create household (admin is creator)
    const householdResponse = await app.inject({
      method: 'POST',
      url: '/api/households',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { name: `Invitation Test Household ${Date.now()}` },
    });

    const householdData = JSON.parse(householdResponse.body);
    householdId = householdData.id;

    // Add parent to household
    await pool.query(
      `INSERT INTO household_members (household_id, user_id, role)
       VALUES ($1, $2, 'parent')`,
      [householdId, parentUserId],
    );
  });

  after(async () => {
    // Cleanup
    await pool.query('DELETE FROM invitations WHERE household_id = $1', [householdId]);
    await pool.query('DELETE FROM household_members WHERE household_id = $1', [householdId]);
    await pool.query('DELETE FROM households WHERE id = $1', [householdId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3, $4)', [
      adminUserId,
      parentUserId,
      inviteeUserId,
      outsiderUserId,
    ]);
    await pool.end();
    await app.close();
  });

  describe('POST /api/households/:householdId/invitations', () => {
    test('should create invitation (admin)', async () => {
      const newEmail = `new-invitee-${Date.now()}@example.com`;

      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          email: newEmail,
          role: 'parent',
        },
      });

      assert.strictEqual(response.statusCode, 201);

      const body = JSON.parse(response.body);
      assert.ok(body.id);
      assert.ok(body.token);
      assert.strictEqual(body.email, newEmail.toLowerCase());
      assert.strictEqual(body.role, 'parent');
      assert.strictEqual(body.status, 'pending');
      assert.ok(body.expiresAt);
    });

    test('should create invitation (parent member)', async () => {
      const newEmail = `parent-invited-${Date.now()}@example.com`;

      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${parentToken}` },
        payload: {
          email: newEmail,
          role: 'parent',
        },
      });

      assert.strictEqual(response.statusCode, 201);
    });

    test('should reject invitation by non-member', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
        payload: {
          email: 'someone@example.com',
          role: 'parent',
        },
      });

      assert.strictEqual(response.statusCode, 403);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        payload: {
          email: 'someone@example.com',
          role: 'parent',
        },
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          email: 'not-an-email',
          role: 'parent',
        },
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject empty email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          email: '',
          role: 'parent',
        },
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject invalid role', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          email: 'valid@example.com',
          role: 'invalid-role',
        },
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject invitation to existing member', async () => {
      // Get parent's email from database
      const parentResult = await pool.query('SELECT email FROM users WHERE id = $1', [
        parentUserId,
      ]);
      const parentEmail = parentResult.rows[0].email;

      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          email: parentEmail,
          role: 'parent',
        },
      });

      assert.strictEqual(response.statusCode, 409);
    });

    test('should reject duplicate pending invitation', async () => {
      const duplicateEmail = `duplicate-${Date.now()}@example.com`;

      // Create first invitation
      await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          email: duplicateEmail,
          role: 'parent',
        },
      });

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          email: duplicateEmail,
          role: 'parent',
        },
      });

      assert.strictEqual(response.statusCode, 409);
    });
  });

  describe('GET /api/households/:householdId/invitations', () => {
    before(async () => {
      // Create some invitations for listing
      await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          email: `list-test-1-${Date.now()}@example.com`,
          role: 'parent',
        },
      });
    });

    test('should list sent invitations (admin)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.invitations));
      assert.ok(body.invitations.length >= 1);

      const invitation = body.invitations[0];
      assert.ok(invitation.id);
      assert.ok(invitation.invitedEmail);
      assert.ok(invitation.role);
      assert.ok(invitation.status);
    });

    test('should list sent invitations (parent)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
    });

    test('should reject listing by non-member', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });

      assert.strictEqual(response.statusCode, 403);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/invitations`,
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('GET /api/users/me/invitations', () => {
    let pendingInvitationToken: string;

    before(async () => {
      // Create invitation for invitee
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          email: inviteeEmail,
          role: 'parent',
        },
      });

      const body = JSON.parse(response.body);
      pendingInvitationToken = body.token;
    });

    test('should list received invitations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/me/invitations',
        headers: { Authorization: `Bearer ${inviteeToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.invitations));
      assert.ok(body.invitations.length >= 1);

      const invitation = body.invitations.find(
        (i: { token: string }) => i.token === pendingInvitationToken,
      );
      assert.ok(invitation);
      assert.ok(invitation.householdName);
      assert.ok(invitation.inviterEmail);
    });

    test('should return empty for user with no invitations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/me/invitations',
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.invitations));
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
    let acceptTestToken: string;

    before(async () => {
      // Create a fresh invitation for acceptance testing
      const acceptEmail = `accept-test-${Date.now()}@example.com`;

      // Register user
      const userResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: acceptEmail, password: 'TestPass123!' },
      });

      const userData = JSON.parse(userResponse.body);

      // Create invitation
      const inviteResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          email: acceptEmail,
          role: 'parent',
        },
      });

      const inviteData = JSON.parse(inviteResponse.body);
      acceptTestToken = inviteData.token;

      // Store for acceptance test
      (global as any).acceptTestUserToken = userData.accessToken;
    });

    test('should accept invitation', async () => {
      const userToken = (global as any).acceptTestUserToken;

      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/${acceptTestToken}/accept`,
        headers: { Authorization: `Bearer ${userToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(body.household);
      assert.strictEqual(body.household.id, householdId);
      assert.ok(body.household.name);
      assert.strictEqual(body.household.role, 'parent');
    });

    test('should reject already accepted invitation', async () => {
      const userToken = (global as any).acceptTestUserToken;

      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/${acceptTestToken}/accept`,
        headers: { Authorization: `Bearer ${userToken}` },
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject non-existent token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/invitations/nonexistent-token/accept',
        headers: { Authorization: `Bearer ${inviteeToken}` },
      });

      assert.strictEqual(response.statusCode, 404);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/${acceptTestToken}/accept`,
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject wrong user accepting', async () => {
      // Create invitation for specific email
      const specificEmail = `specific-${Date.now()}@example.com`;

      const inviteResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          email: specificEmail,
          role: 'parent',
        },
      });

      const inviteData = JSON.parse(inviteResponse.body);

      // Try to accept with different user (outsider)
      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/${inviteData.token}/accept`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });

      assert.strictEqual(response.statusCode, 403);
    });
  });

  describe('POST /api/invitations/:token/decline', () => {
    let declineTestToken: string;
    let declineUserToken: string;

    before(async () => {
      // Create a fresh invitation for decline testing
      const declineEmail = `decline-test-${Date.now()}@example.com`;

      // Register user
      const userResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: declineEmail, password: 'TestPass123!' },
      });

      const userData = JSON.parse(userResponse.body);
      declineUserToken = userData.accessToken;

      // Create invitation
      const inviteResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          email: declineEmail,
          role: 'parent',
        },
      });

      const inviteData = JSON.parse(inviteResponse.body);
      declineTestToken = inviteData.token;
    });

    test('should decline invitation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/${declineTestToken}/decline`,
        headers: { Authorization: `Bearer ${declineUserToken}` },
      });

      assert.strictEqual(response.statusCode, 204);
    });

    test('should reject already declined invitation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/${declineTestToken}/decline`,
        headers: { Authorization: `Bearer ${declineUserToken}` },
      });

      assert.strictEqual(response.statusCode, 404);
    });

    test('should reject non-existent token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/invitations/nonexistent-token/decline',
        headers: { Authorization: `Bearer ${inviteeToken}` },
      });

      assert.strictEqual(response.statusCode, 404);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/${declineTestToken}/decline`,
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('DELETE /api/households/:householdId/invitations/:id', () => {
    let cancelInvitationId: string;

    before(async () => {
      // Create invitation to cancel
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          email: `cancel-test-${Date.now()}@example.com`,
          role: 'parent',
        },
      });

      const body = JSON.parse(response.body);
      cancelInvitationId = body.id;
    });

    test('should cancel invitation (admin)', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/invitations/${cancelInvitationId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 204);
    });

    test('should reject cancelling already cancelled invitation', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/invitations/${cancelInvitationId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject cancelling by non-member', async () => {
      // Create another invitation
      const createResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/invitations`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          email: `outsider-cancel-${Date.now()}@example.com`,
          role: 'parent',
        },
      });

      const inviteId = JSON.parse(createResponse.body).id;

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/invitations/${inviteId}`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });

      assert.strictEqual(response.statusCode, 403);
    });

    test('should reject non-existent invitation', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/invitations/00000000-0000-0000-0000-000000000000`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 404);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/invitations/${cancelInvitationId}`,
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });
});
