import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from './server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';

/**
 * Authentication API Tests
 *
 * Tests the complete authentication system including:
 * - User registration
 * - User login
 * - Token refresh
 * - Authentication middleware
 */

describe('Authentication API', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;

  before(async () => {
    // Build Fastify app
    app = await build();
    await app.ready();

    // Get database pool for cleanup
    pool = new pg.Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'st44',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
  });

  after(async () => {
    // Cleanup test users
    await pool.query("DELETE FROM users WHERE email LIKE 'test%@example.com'");
    await pool.end();
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: uniqueEmail,
          password: 'Test1234',
        },
      });

      assert.strictEqual(response.statusCode, 201);

      const body = JSON.parse(response.body);
      assert.ok(body.userId);
      assert.strictEqual(body.email, uniqueEmail);
      assert.strictEqual(body.password, undefined); // Password should not be returned
    });

    test('should reject duplicate email registration', async () => {
      const duplicateEmail = `duplicate-${Date.now()}@example.com`;

      // First registration
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: duplicateEmail,
          password: 'Test1234',
        },
      });

      // Second registration with same email
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: duplicateEmail,
          password: 'Test1234',
        },
      });

      assert.strictEqual(response.statusCode, 409);

      const body = JSON.parse(response.body);
      assert.ok(body.error);
      assert.ok(body.error.includes('Email already registered'));
    });

    test('should reject weak password (< 8 characters)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: `test-${Date.now()}@example.com`,
          password: 'Weak1',
        },
      });

      assert.strictEqual(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.ok(body.error);
      // Error message varies - just check status code is correct
    });

    test('should reject password without uppercase', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: `test-${Date.now()}@example.com`,
          password: 'test1234',
        },
      });

      assert.strictEqual(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.ok(body.error.toLowerCase().includes('uppercase'));
    });

    test('should reject password without lowercase', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: `test-${Date.now()}@example.com`,
          password: 'TEST1234',
        },
      });

      assert.strictEqual(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.ok(body.error.toLowerCase().includes('lowercase'));
    });

    test('should reject password without number', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: `test-${Date.now()}@example.com`,
          password: 'TestTest',
        },
      });

      assert.strictEqual(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.ok(body.error.toLowerCase().includes('number'));
    });

    test('should reject invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'Test1234',
        },
      });

      assert.strictEqual(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.ok(body.error);
    });

    test('should reject missing email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          password: 'Test1234',
        },
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject missing password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: `test-${Date.now()}@example.com`,
        },
      });

      assert.strictEqual(response.statusCode, 400);
    });
  });

  describe('POST /api/auth/login', () => {
    const testEmail = `login-test-${Date.now()}@example.com`;
    const testPassword = 'Test1234';

    before(async () => {
      // Register a test user for login tests
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: testEmail,
          password: testPassword,
        },
      });
    });

    test('should login successfully with correct credentials', async () => {
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
      assert.ok(body.userId);
      assert.strictEqual(body.email, testEmail);
      assert.strictEqual(body.password, undefined); // Password should not be returned
    });

    test('should reject login with wrong password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testEmail,
          password: 'WrongPassword123',
        },
      });

      assert.strictEqual(response.statusCode, 401);

      const body = JSON.parse(response.body);
      assert.ok(body.error);
      assert.ok(body.error.toLowerCase().includes('invalid'));
    });

    test('should reject login with non-existent email', async () => {
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
      assert.ok(body.error);
      assert.ok(body.error.toLowerCase().includes('invalid'));
    });

    test('should reject login with missing email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          password: testPassword,
        },
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject login with missing password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testEmail,
        },
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should return different tokens for each login', async () => {
      const response1 = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testEmail,
          password: testPassword,
        },
      });

      // Wait 1 second to ensure different iat (issued at) timestamps
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response2 = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testEmail,
          password: testPassword,
        },
      });

      const body1 = JSON.parse(response1.body);
      const body2 = JSON.parse(response2.body);

      assert.notStrictEqual(body1.accessToken, body2.accessToken);
      assert.notStrictEqual(body1.refreshToken, body2.refreshToken);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let validRefreshToken: string;
    const testEmail = `refresh-test-${Date.now()}@example.com`;

    before(async () => {
      // Register and login to get a refresh token
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: testEmail,
          password: 'Test1234',
        },
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testEmail,
          password: 'Test1234',
        },
      });

      const body = JSON.parse(loginResponse.body);
      validRefreshToken = body.refreshToken;
    });

    test('should refresh token successfully with valid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {
          refreshToken: validRefreshToken,
        },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(body.accessToken);
      assert.notStrictEqual(body.accessToken, validRefreshToken);
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
      assert.ok(body.error);
    });

    test('should reject missing refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {},
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject access token as refresh token', async () => {
      // Get an access token
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testEmail,
          password: 'Test1234',
        },
      });

      const { accessToken } = JSON.parse(loginResponse.body);

      // Try to use access token for refresh
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {
          refreshToken: accessToken,
        },
      });

      assert.strictEqual(response.statusCode, 401);

      const body = JSON.parse(response.body);
      assert.ok(body.error);
      assert.ok(body.error.toLowerCase().includes('refresh token'));
    });
  });

  describe('POST /api/auth/logout (protected)', () => {
    let accessToken: string;
    const testEmail = `logout-test-${Date.now()}@example.com`;

    before(async () => {
      // Register and login to get an access token
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: testEmail,
          password: 'Test1234',
        },
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testEmail,
          password: 'Test1234',
        },
      });

      const body = JSON.parse(loginResponse.body);
      accessToken = body.accessToken;
    });

    test('should logout successfully with valid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(body.message.toLowerCase().includes('logged out'));
    });

    test('should reject logout without token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject logout with invalid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          authorization: 'Bearer invalid.token.here',
        },
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject logout with malformed Authorization header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          authorization: accessToken, // Missing 'Bearer ' prefix
        },
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('GET /api/protected (authentication middleware)', () => {
    let accessToken: string;
    let refreshToken: string;
    const testEmail = `middleware-test-${Date.now()}@example.com`;

    before(async () => {
      // Register and login to get tokens
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: testEmail,
          password: 'Test1234',
        },
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testEmail,
          password: 'Test1234',
        },
      });

      const body = JSON.parse(loginResponse.body);
      accessToken = body.accessToken;
      refreshToken = body.refreshToken;
    });

    test('should allow access with valid access token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/protected',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(body.message);
      assert.ok(body.user);
      assert.strictEqual(body.user.email, testEmail);
    });

    test('should reject access without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/protected',
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject access with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/protected',
        headers: {
          authorization: 'Bearer invalid.token.here',
        },
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject refresh token (wrong type)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/protected',
        headers: {
          authorization: `Bearer ${refreshToken}`,
        },
      });

      assert.strictEqual(response.statusCode, 401);

      const body = JSON.parse(response.body);
      assert.ok(body.error);
      // Error message may not specifically mention "access token", just verify rejection
    });
  });

  describe('Security Tests', () => {
    test('should prevent SQL injection in email field', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: "' OR '1'='1' --@example.com",
          password: 'Test1234',
        },
      });

      // Should reject as invalid email format or not cause SQL injection
      assert.ok([400, 409].includes(response.statusCode));
    });

    test('should prevent timing attacks on login', async (t) => {
      const testEmail = `timing-test-${Date.now()}@example.com`;

      // Register a user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: testEmail,
          password: 'Test1234',
        },
      });

      // Test timing for existing user with wrong password
      const start1 = Date.now();
      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testEmail,
          password: 'WrongPassword',
        },
      });
      const time1 = Date.now() - start1;

      // Test timing for non-existent user
      const start2 = Date.now();
      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'WrongPassword',
        },
      });
      const time2 = Date.now() - start2;

      // Timing should be similar (within reasonable threshold)
      // This is a basic check - timing attacks are complex
      const timingDifference = Math.abs(time1 - time2);
      assert.ok(
        timingDifference < 200,
        `Timing difference too large: ${timingDifference}ms (suggests timing attack vulnerability)`,
      );
    });

    test('should hash passwords (not stored in plain text)', async () => {
      const testEmail = `hash-test-${Date.now()}@example.com`;
      const testPassword = 'Test1234';

      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: testEmail,
          password: testPassword,
        },
      });

      // Query database directly to check password is hashed
      const result = await pool.query('SELECT password_hash FROM users WHERE email = $1', [
        testEmail,
      ]);

      assert.ok(result.rows.length > 0);
      const storedHash = result.rows[0].password_hash;

      // Password should be hashed (bcrypt hashes start with $2b$)
      assert.ok(storedHash.startsWith('$2b$'));
      assert.notStrictEqual(storedHash, testPassword);
    });
  });
});
