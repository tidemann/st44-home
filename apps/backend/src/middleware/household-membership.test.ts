import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { registerAndLogin } from '../test-helpers/auth.ts';

/**
 * Household Membership Middleware Integration Tests
 */

describe('Household Membership Middleware', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let adminToken: string;
  let parentToken: string;
  let outsiderToken: string;
  let householdId: string;
  let adminUserId: number;
  let parentUserId: number;
  let outsiderUserId: number;

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

    const adminEmail = `mw-test-admin-${Date.now()}@example.com`;
    const parentEmail = `mw-test-parent-${Date.now()}@example.com`;
    const outsiderEmail = `mw-test-outsider-${Date.now()}@example.com`;
    const testPassword = 'TestPass123!';

    const adminData = await registerAndLogin(app, adminEmail, testPassword);
    const parentData = await registerAndLogin(app, parentEmail, testPassword);
    const outsiderData = await registerAndLogin(app, outsiderEmail, testPassword);

    adminToken = adminData.accessToken;
    parentToken = parentData.accessToken;
    outsiderToken = outsiderData.accessToken;

    const adminResult = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    const parentResult = await pool.query('SELECT id FROM users WHERE email = $1', [parentEmail]);
    const outsiderResult = await pool.query('SELECT id FROM users WHERE email = $1', [
      outsiderEmail,
    ]);

    adminUserId = adminResult.rows[0].id;
    parentUserId = parentResult.rows[0].id;
    outsiderUserId = outsiderResult.rows[0].id;

    // Create household
    const householdResponse = await app.inject({
      method: 'POST',
      url: '/api/households',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { name: `Middleware Test Household ${Date.now()}` },
    });
    householdId = JSON.parse(householdResponse.body).id;

    // Add parent
    await pool.query(
      `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'parent')`,
      [householdId, parentUserId],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM household_members WHERE household_id = $1', [householdId]);
    await pool.query('DELETE FROM households WHERE id = $1', [householdId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [
      adminUserId,
      parentUserId,
      outsiderUserId,
    ]);
    await pool.end();
    await app.close();
  });

  describe('validateHouseholdMembership', () => {
    test('should allow admin to access household', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(response.statusCode, 200);
    });

    test('should allow parent to access household', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });
      assert.strictEqual(response.statusCode, 200);
    });

    test('should reject non-member access (403)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });
      assert.strictEqual(response.statusCode, 403);
    });

    test('should reject invalid UUID format (400)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/households/not-a-uuid',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject without authentication (401)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}`,
      });
      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('requireHouseholdAdmin', () => {
    test('should allow admin to update household', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { name: `Updated Name ${Date.now()}` },
      });
      assert.strictEqual(response.statusCode, 200);
    });

    test('should reject parent from admin actions (403)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}`,
        headers: { Authorization: `Bearer ${parentToken}` },
        payload: { name: 'Unauthorized Update' },
      });
      assert.strictEqual(response.statusCode, 403);
    });
  });

  describe('Middleware Chaining', () => {
    test('should chain auth -> membership -> handler correctly', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/members`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body)); // Now returns array directly
    });

    test('should fail at auth middleware first', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/members`,
      });
      assert.strictEqual(response.statusCode, 401);
    });

    test('should fail at membership middleware second', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/members`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });
      assert.strictEqual(response.statusCode, 403);
    });
  });
});
