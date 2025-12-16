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
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'st44',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
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
      assert.ok(Array.isArray(body.households));
      assert.ok(body.households.length >= 1);
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
      assert.ok(Array.isArray(body.members));
      assert.strictEqual(body.members.length, 2);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/members`,
      });
      assert.strictEqual(response.statusCode, 401);
    });
  });
});
