import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { registerAndLogin } from '../test-helpers/auth.ts';

/**
 * User Profile API Tests
 */

describe('User Profile API', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let userToken: string;
  let userId: string;
  let userEmail: string;

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

    // Create test user
    userEmail = `test-profile-user-${Date.now()}@example.com`;
    const testPassword = 'TestPass123!';

    const userData = await registerAndLogin(app, userEmail, testPassword);
    userToken = userData.accessToken;

    // Get user ID for cleanup
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [userEmail]);
    userId = userResult.rows[0].id;
  });

  after(async () => {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.end();
    await app.close();
  });

  describe('GET /api/user/profile', () => {
    test('should get current user profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/user/profile',
        headers: { Authorization: `Bearer ${userToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.id, userId);
      assert.strictEqual(body.email, userEmail);
      assert.ok(body.createdAt);
      assert.ok(body.updatedAt);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/user/profile',
      });
      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/user/profile',
        headers: { Authorization: 'Bearer invalid-token' },
      });
      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('PUT /api/user/profile', () => {
    test('should update user name', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/user/profile',
        headers: { Authorization: `Bearer ${userToken}` },
        payload: { name: 'John Doe' },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.name, 'John Doe');
      assert.strictEqual(body.email, userEmail);
    });

    test('should reject empty update', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/user/profile',
        headers: { Authorization: `Bearer ${userToken}` },
        payload: {},
      });
      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/user/profile',
        payload: { name: 'Test Name' },
      });
      assert.strictEqual(response.statusCode, 401);
    });

    test('should update user email', async () => {
      const newEmail = `updated-profile-${Date.now()}@example.com`;
      const response = await app.inject({
        method: 'PUT',
        url: '/api/user/profile',
        headers: { Authorization: `Bearer ${userToken}` },
        payload: { email: newEmail },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.email, newEmail);

      // Update our reference for cleanup
      userEmail = newEmail;
    });

    test('should reject duplicate email', async () => {
      // Create another user
      const otherEmail = `other-user-${Date.now()}@example.com`;
      await registerAndLogin(app, otherEmail, 'TestPass123!');

      // Try to update to the other user's email
      const response = await app.inject({
        method: 'PUT',
        url: '/api/user/profile',
        headers: { Authorization: `Bearer ${userToken}` },
        payload: { email: otherEmail },
      });

      assert.strictEqual(response.statusCode, 409);
      const body = JSON.parse(response.body);
      assert.ok(body.message.includes('already in use'));

      // Clean up other user
      await pool.query('DELETE FROM users WHERE email = $1', [otherEmail]);
    });

    test('should reject invalid email format', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/user/profile',
        headers: { Authorization: `Bearer ${userToken}` },
        payload: { email: 'invalid-email' },
      });
      assert.strictEqual(response.statusCode, 400);
    });

    test('should update password with valid format', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/user/profile',
        headers: { Authorization: `Bearer ${userToken}` },
        payload: { password: 'NewSecure123!' },
      });

      assert.strictEqual(response.statusCode, 200);
    });

    test('should reject weak password', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/user/profile',
        headers: { Authorization: `Bearer ${userToken}` },
        payload: { password: 'weak' },
      });
      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject name too long', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/user/profile',
        headers: { Authorization: `Bearer ${userToken}` },
        payload: { name: 'a'.repeat(256) },
      });
      assert.strictEqual(response.statusCode, 400);
    });
  });
});
