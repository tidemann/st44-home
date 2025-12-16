import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';

/**
 * Household Membership Middleware Integration Tests
 *
 * Tests validateHouseholdMembership and requireHouseholdAdmin middleware
 * through actual HTTP requests to verify middleware behavior.
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
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'st44',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    // Create test users
    const adminEmail = `mw-test-admin-${Date.now()}@example.com`;
    const parentEmail = `mw-test-parent-${Date.now()}@example.com`;
    const outsiderEmail = `mw-test-outsider-${Date.now()}@example.com`;

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

    const outsiderResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: outsiderEmail, password: 'TestPass123!' },
    });

    adminToken = JSON.parse(adminResponse.body).accessToken;
    parentToken = JSON.parse(parentResponse.body).accessToken;
    outsiderToken = JSON.parse(outsiderResponse.body).accessToken;

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
      const body = JSON.parse(response.body);
      assert.ok(body.message.includes('not a member'));
    });

    test('should reject invalid UUID format (400)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/households/not-a-uuid',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject non-existent household (403/404)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/households/00000000-0000-0000-0000-000000000000',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      // Middleware returns 403 for non-member (can't tell if doesn't exist)
      assert.ok([403, 404].includes(response.statusCode));
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
      const body = JSON.parse(response.body);
      assert.ok(body.message.includes('Admin'));
    });

    test('should reject non-member from admin actions (403)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
        payload: { name: 'Outsider Update' },
      });

      assert.strictEqual(response.statusCode, 403);
    });
  });

  describe('Middleware Chaining', () => {
    test('should chain auth -> membership -> handler correctly', async () => {
      // This test verifies the full chain works
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/members`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.members));
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
