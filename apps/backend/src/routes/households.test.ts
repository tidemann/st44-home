import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';

/**
 * Household Management API Tests
 *
 * Tests the household CRUD endpoints including:
 * - Creating households
 * - Listing user's households
 * - Getting household details
 * - Updating household name
 * - Getting household members
 * - Authorization and data isolation
 */

describe('Household API', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let user1Token: string;
  let user2Token: string;
  let user1Id: number;
  let user2Id: number;

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
    const user1Email = `test-household-user1-${Date.now()}@example.com`;
    const user2Email = `test-household-user2-${Date.now()}@example.com`;

    const user1Response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: user1Email,
        password: 'TestPass123!',
      },
    });

    const user2Response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: user2Email,
        password: 'TestPass123!',
      },
    });

    const user1Data = JSON.parse(user1Response.body);
    const user2Data = JSON.parse(user2Response.body);

    user1Token = user1Data.accessToken;
    user2Token = user2Data.accessToken;

    // Get user IDs for cleanup
    const user1Result = await pool.query('SELECT id FROM users WHERE email = $1', [user1Email]);
    const user2Result = await pool.query('SELECT id FROM users WHERE email = $1', [user2Email]);

    user1Id = user1Result.rows[0].id;
    user2Id = user2Result.rows[0].id;
  });

  after(async () => {
    // Cleanup: Delete households and users created during tests
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
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
        payload: {
          name: `Test Household ${Date.now()}`,
        },
      });

      assert.strictEqual(response.statusCode, 201);

      const body = JSON.parse(response.body);
      assert.ok(body.id);
      assert.ok(body.name);
      assert.strictEqual(body.role, 'admin');
    });

    test('should reject household creation without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/households',
        payload: {
          name: 'Unauthenticated Household',
        },
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject household creation with invalid name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
        payload: {
          name: '',
        },
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject household creation with too long name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
        payload: {
          name: 'a'.repeat(101),
        },
      });

      assert.strictEqual(response.statusCode, 400);
    });
  });

  describe('GET /api/households', () => {
    let testHouseholdId: string;

    before(async () => {
      // Create a household for user1
      const response = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
        payload: {
          name: `List Test Household ${Date.now()}`,
        },
      });

      const body = JSON.parse(response.body);
      testHouseholdId = body.id;
    });

    test('should list all user households', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/households',
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.households));
      assert.ok(body.households.length >= 1);

      const household = body.households.find((h: { id: string }) => h.id === testHouseholdId);
      assert.ok(household);
      assert.ok(household.name);
      assert.ok(household.role);
    });

    test('should reject household listing without authentication', async () => {
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
      // Create household for user1
      const response1 = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
        payload: {
          name: `User1 Detail Household ${Date.now()}`,
        },
      });

      const body1 = JSON.parse(response1.body);
      user1HouseholdId = body1.id;

      // Create household for user2
      const response2 = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: {
          Authorization: `Bearer ${user2Token}`,
        },
        payload: {
          name: `User2 Detail Household ${Date.now()}`,
        },
      });

      const body2 = JSON.parse(response2.body);
      user2HouseholdId = body2.id;
    });

    test('should get household details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${user1HouseholdId}`,
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.id, user1HouseholdId);
      assert.ok(body.name);
      assert.ok(typeof body.memberCount === 'number');
      assert.ok(typeof body.childrenCount === 'number');
      assert.ok(body.createdAt);
    });

    test('should prevent access to other user household', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${user2HouseholdId}`,
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
      });

      assert.strictEqual(response.statusCode, 403);
    });

    test('should reject request without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${user1HouseholdId}`,
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should return 404 for non-existent household', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/households/00000000-0000-0000-0000-000000000000',
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
      });

      assert.strictEqual(response.statusCode, 404);
    });
  });

  describe('PUT /api/households/:id', () => {
    let adminHouseholdId: string;
    let parentToken: string;

    before(async () => {
      // Create household (user1 is admin)
      const response = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
        payload: {
          name: `Update Test Household ${Date.now()}`,
        },
      });

      const body = JSON.parse(response.body);
      adminHouseholdId = body.id;

      // Add user2 as parent
      await pool.query(
        `INSERT INTO household_members (household_id, user_id, role)
         VALUES ($1, $2, 'parent')`,
        [adminHouseholdId, user2Id],
      );

      parentToken = user2Token;
    });

    test('should update household name (admin)', async () => {
      const newName = `Updated Household ${Date.now()}`;

      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${adminHouseholdId}`,
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
        payload: {
          name: newName,
        },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.name, newName);
      assert.ok(body.updatedAt);
    });

    test('should reject update by non-admin (parent role)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${adminHouseholdId}`,
        headers: {
          Authorization: `Bearer ${parentToken}`,
        },
        payload: {
          name: 'Unauthorized Update',
        },
      });

      assert.strictEqual(response.statusCode, 403);
    });

    test('should reject invalid household name', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${adminHouseholdId}`,
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
        payload: {
          name: '',
        },
      });

      assert.strictEqual(response.statusCode, 400);
    });
  });

  describe('GET /api/households/:id/members', () => {
    let householdId: string;

    before(async () => {
      // Create household
      const response = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
        payload: {
          name: `Members Test Household ${Date.now()}`,
        },
      });

      const body = JSON.parse(response.body);
      householdId = body.id;

      // Add user2 as parent
      await pool.query(
        `INSERT INTO household_members (household_id, user_id, role)
         VALUES ($1, $2, 'parent')`,
        [householdId, user2Id],
      );
    });

    test('should list household members', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/members`,
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.members));
      assert.strictEqual(body.members.length, 2);

      // Check that both users are in the members list
      const user1Member = body.members.find((m: { user_id: number }) => m.user_id === user1Id);
      const user2Member = body.members.find((m: { user_id: number }) => m.user_id === user2Id);

      assert.ok(user1Member);
      assert.strictEqual(user1Member.role, 'admin');

      assert.ok(user2Member);
      assert.strictEqual(user2Member.role, 'parent');
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/members`,
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  after(async () => {
    // Cleanup test data
    await pool.query(
      "DELETE FROM household_members WHERE household_id IN (SELECT id FROM households WHERE name LIKE 'Test Household%')",
    );
    await pool.query("DELETE FROM households WHERE name LIKE 'Test Household%'");
    await pool.query("DELETE FROM users WHERE email LIKE 'household-test%@example.com'");
    await pool.end();
    await app.close();
  });
});
