import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { registerAndLogin } from '../test-helpers/auth.ts';

/**
 * Household Management API Tests
 */

describe('Household API', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let user1Token: string;
  let user2Token: string;
  let user1Id: number;
  let user2Id: number;

  before(async () => {
    app = await build();
    await app.ready();

    pool = new pg.Pool({
      host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '55432'),
      database: process.env.TEST_DB_NAME || 'st44_test',
      user: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
    });

    // Create test users (register + login to get tokens)
    const user1Email = `test-household-user1-${Date.now()}@example.com`;
    const user2Email = `test-household-user2-${Date.now()}@example.com`;
    const testPassword = 'TestPass123!';

    const user1Data = await registerAndLogin(app, user1Email, testPassword);
    const user2Data = await registerAndLogin(app, user2Email, testPassword);

    user1Token = user1Data.accessToken;
    user2Token = user2Data.accessToken;

    // Get user IDs for cleanup
    const user1Result = await pool.query('SELECT id FROM users WHERE email = $1', [user1Email]);
    const user2Result = await pool.query('SELECT id FROM users WHERE email = $1', [user2Email]);

    user1Id = user1Result.rows[0].id;
    user2Id = user2Result.rows[0].id;
  });

  after(async () => {
    await pool.query(
      'DELETE FROM households WHERE id IN (SELECT household_id FROM household_members WHERE user_id IN ($1, $2))',
      [user1Id, user2Id],
    );
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [user1Id, user2Id]);
    await pool.end();
    await app.close();
  });

  describe('POST /api/households', () => {
    test('should create a new household', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { name: `Test Household ${Date.now()}` },
      });

      assert.strictEqual(response.statusCode, 201);
      const body = JSON.parse(response.body);
      assert.ok(body.id);
      assert.ok(body.name);
      assert.strictEqual(body.role, 'admin');
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/households',
        payload: { name: 'Unauthenticated Household' },
      });
      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject empty name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { name: '' },
      });
      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject name too long', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { name: 'a'.repeat(101) },
      });
      assert.strictEqual(response.statusCode, 400);
    });
  });

  describe('GET /api/households', () => {
    let testHouseholdId: string;

    before(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { name: `List Test Household ${Date.now()}` },
      });
      testHouseholdId = JSON.parse(response.body).id;
    });

    test('should list user households', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/households',
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body));
      assert.ok(body.length >= 1);

      // Verify household list item structure
      const household = body[0];
      assert.ok(household.id);
      assert.ok(household.name);
      assert.ok(household.role);
      assert.strictEqual(typeof household.memberCount, 'number');
      assert.strictEqual(typeof household.childrenCount, 'number');
      assert.strictEqual(typeof household.adminCount, 'number');
      assert.ok(household.adminCount >= 1, 'adminCount should be at least 1');
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/households',
      });
      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('GET /api/households/:id', () => {
    let user1HouseholdId: string;
    let user2HouseholdId: string;

    before(async () => {
      const response1 = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { name: `User1 Detail Household ${Date.now()}` },
      });
      user1HouseholdId = JSON.parse(response1.body).id;

      const response2 = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: { Authorization: `Bearer ${user2Token}` },
        payload: { name: `User2 Detail Household ${Date.now()}` },
      });
      user2HouseholdId = JSON.parse(response2.body).id;
    });

    test('should get household details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${user1HouseholdId}`,
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.id, user1HouseholdId);
    });

    test('should prevent access to other user household', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${user2HouseholdId}`,
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.strictEqual(response.statusCode, 403);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${user1HouseholdId}`,
      });
      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('PUT /api/households/:id', () => {
    let adminHouseholdId: string;

    before(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { name: `Update Test Household ${Date.now()}` },
      });
      adminHouseholdId = JSON.parse(response.body).id;

      await pool.query(
        `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'parent')`,
        [adminHouseholdId, user2Id],
      );
    });

    test('should update household (admin)', async () => {
      const newName = `Updated Household ${Date.now()}`;
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${adminHouseholdId}`,
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { name: newName },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.name, newName);
    });

    test('should reject update by parent', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${adminHouseholdId}`,
        headers: { Authorization: `Bearer ${user2Token}` },
        payload: { name: 'Unauthorized Update' },
      });
      assert.strictEqual(response.statusCode, 403);
    });
  });

  describe('GET /api/households/:id/members', () => {
    let householdId: string;

    before(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { name: `Members Test Household ${Date.now()}` },
      });
      householdId = JSON.parse(response.body).id;

      await pool.query(
        `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'parent')`,
        [householdId, user2Id],
      );
    });

    test('should list household members', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/members`,
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body)); // Now returns array directly
      assert.strictEqual(body.length, 2);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/members`,
      });
      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('GET /api/households/:id/dashboard', () => {
    let householdId: string;

    before(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: { Authorization: `Bearer ${user1Token}` },
        payload: { name: `Dashboard Test Household ${Date.now()}` },
      });
      householdId = JSON.parse(response.body).id;
    });

    test('should return dashboard with empty state', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/dashboard`,
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      // Check household info
      assert.ok(body.household);
      assert.strictEqual(body.household.id, householdId);
      assert.ok(body.household.name);

      // Check week summary structure
      assert.ok(body.weekSummary);
      assert.strictEqual(typeof body.weekSummary.total, 'number');
      assert.strictEqual(typeof body.weekSummary.completed, 'number');
      assert.strictEqual(typeof body.weekSummary.pending, 'number');
      assert.strictEqual(typeof body.weekSummary.overdue, 'number');
      assert.strictEqual(typeof body.weekSummary.completionRate, 'number');

      // Check children array (empty for new household)
      assert.ok(Array.isArray(body.children));
    });

    test('should return dashboard with children', async () => {
      // Add a child to the household
      await pool.query(
        `INSERT INTO children (household_id, name, birth_year) VALUES ($1, 'Test Child', 2015)`,
        [householdId],
      );

      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/dashboard`,
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      // Check children list
      assert.ok(body.children.length >= 1);
      const child = body.children.find((c: { name: string }) => c.name === 'Test Child');
      assert.ok(child);
      assert.ok(child.id);
      assert.strictEqual(child.name, 'Test Child');
      assert.strictEqual(typeof child.tasksTotal, 'number');
      assert.strictEqual(typeof child.tasksCompleted, 'number');
      assert.strictEqual(typeof child.completionRate, 'number');
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/dashboard`,
      });
      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject non-member access', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/dashboard`,
        headers: { Authorization: `Bearer ${user2Token}` },
      });
      assert.strictEqual(response.statusCode, 403);
    });
  });

  describe('DELETE /api/households/:id/members/me (Leave Household)', () => {
    let leaveHouseholdId: string;
    let adminToken: string;
    let memberToken: string;
    let memberId: string;

    before(async () => {
      // Create a new household for leave tests
      const adminEmail = `leave-test-admin-${Date.now()}@example.com`;
      const memberEmail = `leave-test-member-${Date.now()}@example.com`;
      const testPassword = 'TestPass123!';

      const adminData = await registerAndLogin(app, adminEmail, testPassword);
      const memberData = await registerAndLogin(app, memberEmail, testPassword);

      adminToken = adminData.accessToken;
      memberToken = memberData.accessToken;

      // Get member user ID
      const memberResult = await pool.query('SELECT id FROM users WHERE email = $1', [memberEmail]);
      memberId = memberResult.rows[0].id;

      // Create household with admin
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { name: `Leave Test Household ${Date.now()}` },
      });
      leaveHouseholdId = JSON.parse(createResponse.body).id;

      // Add member as parent
      await pool.query(
        `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'parent')`,
        [leaveHouseholdId, memberId],
      );
    });

    test('should allow member to leave household', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${leaveHouseholdId}/members/me`,
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      assert.strictEqual(response.statusCode, 204);

      // Verify member was removed
      const checkResult = await pool.query(
        'SELECT * FROM household_members WHERE household_id = $1 AND user_id = $2',
        [leaveHouseholdId, memberId],
      );
      assert.strictEqual(checkResult.rows.length, 0);
    });

    test('should return ONLY_ADMIN error when user is the only admin', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${leaveHouseholdId}/members/me`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.code, 'ONLY_ADMIN');
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${leaveHouseholdId}/members/me`,
      });
      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject non-member', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${leaveHouseholdId}/members/me`,
        headers: { Authorization: `Bearer ${user2Token}` },
      });
      assert.strictEqual(response.statusCode, 403);
    });
  });

  describe('DELETE /api/households/:id (Delete Household)', () => {
    let deleteHouseholdId: string;
    let adminToken: string;
    let parentToken: string;
    let parentId: string;

    before(async () => {
      // Create a new household for delete tests
      const adminEmail = `delete-test-admin-${Date.now()}@example.com`;
      const parentEmail = `delete-test-parent-${Date.now()}@example.com`;
      const testPassword = 'TestPass123!';

      const adminData = await registerAndLogin(app, adminEmail, testPassword);
      const parentData = await registerAndLogin(app, parentEmail, testPassword);

      adminToken = adminData.accessToken;
      parentToken = parentData.accessToken;

      // Get parent user ID
      const parentResult = await pool.query('SELECT id FROM users WHERE email = $1', [parentEmail]);
      parentId = parentResult.rows[0].id;

      // Create household with admin
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { name: `Delete Test Household ${Date.now()}` },
      });
      deleteHouseholdId = JSON.parse(createResponse.body).id;

      // Add parent member
      await pool.query(
        `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'parent')`,
        [deleteHouseholdId, parentId],
      );

      // Add a child for cascade delete testing
      await pool.query(
        `INSERT INTO children (household_id, name, birth_year) VALUES ($1, 'Delete Test Child', 2018)`,
        [deleteHouseholdId],
      );
    });

    test('should reject non-admin from deleting household', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${deleteHouseholdId}`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 403);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${deleteHouseholdId}`,
      });
      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject non-member', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${deleteHouseholdId}`,
        headers: { Authorization: `Bearer ${user2Token}` },
      });
      assert.strictEqual(response.statusCode, 403);
    });

    test('should allow admin to delete household', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${deleteHouseholdId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 204);

      // Verify household was deleted
      const householdCheck = await pool.query('SELECT * FROM households WHERE id = $1', [
        deleteHouseholdId,
      ]);
      assert.strictEqual(householdCheck.rows.length, 0);

      // Verify members were cascade deleted
      const membersCheck = await pool.query(
        'SELECT * FROM household_members WHERE household_id = $1',
        [deleteHouseholdId],
      );
      assert.strictEqual(membersCheck.rows.length, 0);

      // Verify children were cascade deleted
      const childrenCheck = await pool.query('SELECT * FROM children WHERE household_id = $1', [
        deleteHouseholdId,
      ]);
      assert.strictEqual(childrenCheck.rows.length, 0);
    });
  });
});
