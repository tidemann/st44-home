import { test, describe, before, after, mock } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';

/**
 * Authentication API Tests
 *
 * Tests for registration, login, token refresh, and Google OAuth endpoints.
 */

describe('Authentication API', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  const testEmail = `test-auth-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';
  let userId: string;

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
  });

  after(async () => {
    if (userId) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    await pool.end();
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    test('should register new user with valid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: testEmail,
          password: testPassword,
          firstName: 'Test',
          lastName: 'User',
        },
      });

      assert.strictEqual(response.statusCode, 201);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.email, testEmail);
      assert.strictEqual(body.firstName, 'Test');
      assert.strictEqual(body.lastName, 'User');
      assert.ok(body.userId);

      userId = body.userId;
    });

    test('should reject duplicate email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: testEmail,
          password: testPassword,
          firstName: 'Test',
          lastName: 'User',
        },
      });

      assert.strictEqual(response.statusCode, 409);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'Email already registered');
    });

    test('should reject weak password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: `weak-pass-${Date.now()}@example.com`,
          password: 'weakpassword', // 8+ chars but no uppercase/number
          firstName: 'Test',
          lastName: 'User',
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('Password must contain'));
    });

    test('should reject invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'invalid-email',
          password: testPassword,
          firstName: 'Test',
          lastName: 'User',
        },
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: testEmail,
          password: testPassword,
          // Missing firstName and lastName
        },
      });

      assert.strictEqual(response.statusCode, 400);
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login with correct credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testEmail,
          password: testPassword,
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(body.accessToken);
      assert.ok(body.refreshToken);
      assert.strictEqual(body.email, testEmail);
      assert.strictEqual(body.userId, userId);
      assert.strictEqual(body.firstName, 'Test');
      assert.strictEqual(body.lastName, 'User');
    });

    test('should reject incorrect password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testEmail,
          password: 'WrongPassword123!',
        },
      });

      assert.strictEqual(response.statusCode, 401);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'Invalid email or password');
    });

    test('should reject non-existent email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: testPassword,
        },
      });

      assert.strictEqual(response.statusCode, 401);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'Invalid email or password');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    before(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testEmail,
          password: testPassword,
        },
      });
      const body = JSON.parse(response.body);
      refreshToken = body.refreshToken;
    });

    test('should refresh access token with valid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {
          refreshToken,
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(body.accessToken);
    });

    test('should reject invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {
          refreshToken: 'invalid.token.here',
        },
      });

      assert.strictEqual(response.statusCode, 401);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'Invalid or expired refresh token');
    });

    test('should reject access token used as refresh token', async () => {
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testEmail,
          password: testPassword,
        },
      });
      const loginBody = JSON.parse(loginResponse.body);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {
          refreshToken: loginBody.accessToken,
        },
      });

      assert.strictEqual(response.statusCode, 401);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'Invalid or expired refresh token');
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken: string;

    before(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testEmail,
          password: testPassword,
        },
      });
      const body = JSON.parse(response.body);
      accessToken = body.accessToken;
    });

    test('should logout authenticated user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.message, 'Logged out successfully');
    });

    test('should reject unauthenticated logout', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('POST /api/auth/google', () => {
    test('should reject request without credential', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/google',
        payload: {},
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject invalid Google credential', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/google',
        payload: {
          credential: 'invalid.google.token',
        },
      });

      assert.strictEqual(response.statusCode, 401);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'Google authentication failed');
    });

    // Note: Full Google OAuth flow testing requires mocking google-auth-library
    // or integration tests with actual Google test accounts.
    // For unit tests, we verify proper error handling and endpoint availability.
  });

  describe('GET /api/auth/protected', () => {
    let accessToken: string;

    before(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testEmail,
          password: testPassword,
        },
      });
      const body = JSON.parse(response.body);
      accessToken = body.accessToken;
    });

    test('should access protected route with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/protected',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.message, 'This is protected data');
      assert.ok(body.user);
      assert.strictEqual(body.user.userId, userId);
      assert.strictEqual(body.user.email, testEmail);
    });

    test('should reject protected route without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/protected',
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject protected route with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/protected',
        headers: {
          Authorization: 'Bearer invalid.token.here',
        },
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });
});
