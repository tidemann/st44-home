import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';

/**
 * QR Authentication API Tests
 *
 * Tests for QR code authentication endpoints:
 * - POST /api/qr-auth/generate/:childId
 * - POST /api/qr-auth/regenerate/:childId
 * - POST /api/qr-auth/login
 * - GET /api/qr-auth/token/:childId
 */

describe('QR Authentication API', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let parentUserId: string;
  let parentAccessToken: string;
  let childUserId: string;
  let childId: string;
  let householdId: string;
  let qrToken: string;

  const parentEmail = `test-qr-parent-${Date.now()}@example.com`;
  const childEmail = `test-qr-child-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';

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

    // Create parent user and household
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: parentEmail,
        password: testPassword,
        firstName: 'Parent',
        lastName: 'Test',
      },
    });

    const registerBody = JSON.parse(registerResponse.body);
    parentUserId = registerBody.userId;

    // Login as parent to get access token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: parentEmail,
        password: testPassword,
      },
    });

    const loginBody = JSON.parse(loginResponse.body);
    parentAccessToken = loginBody.accessToken;
    householdId = loginBody.householdId;

    // Create child user (for linking to child profile)
    const childRegisterResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: childEmail,
        password: testPassword,
        firstName: 'Child',
        lastName: 'Test',
      },
    });

    const childRegisterBody = JSON.parse(childRegisterResponse.body);
    childUserId = childRegisterBody.userId;

    // Add child user to parent's household with 'child' role
    await pool.query(
      `INSERT INTO household_members (household_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [householdId, childUserId, 'child'],
    );

    // Create child profile linked to user account
    const childResult = await pool.query(
      `INSERT INTO children (household_id, user_id, name, birth_year)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [householdId, childUserId, 'Test Child', 2015],
    );

    childId = childResult.rows[0].id;
  });

  after(async () => {
    // Cleanup: Delete children first (has foreign keys)
    if (childId) {
      await pool.query('DELETE FROM children WHERE id = $1', [childId]);
    }

    // Delete users (cascades to household_members)
    if (parentUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [parentUserId]);
    }
    if (childUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [childUserId]);
    }

    // Delete household
    if (householdId) {
      await pool.query('DELETE FROM households WHERE id = $1', [householdId]);
    }

    await pool.end();
    await app.close();
  });

  describe('POST /api/qr-auth/generate/:childId', () => {
    test('should generate QR token for child (parent auth)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/qr-auth/generate/${childId}`,
        headers: {
          authorization: `Bearer ${parentAccessToken}`,
        },
      });

      assert.strictEqual(response.statusCode, 201);
      const body = JSON.parse(response.body);
      assert.ok(body.token);
      assert.strictEqual(body.childId, childId);
      assert.strictEqual(body.childName, 'Test Child');
      assert.strictEqual(typeof body.token, 'string');
      assert.ok(body.token.length > 32); // Should be cryptographically secure

      qrToken = body.token;

      // Verify token stored in database
      const dbResult = await pool.query('SELECT qr_token FROM children WHERE id = $1', [childId]);
      assert.strictEqual(dbResult.rows[0].qr_token, qrToken);
    });

    test('should reject unauthenticated request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/qr-auth/generate/${childId}`,
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject non-existent child', async () => {
      const fakeChildId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject({
        method: 'POST',
        url: `/api/qr-auth/generate/${fakeChildId}`,
        headers: {
          authorization: `Bearer ${parentAccessToken}`,
        },
      });

      assert.strictEqual(response.statusCode, 404);
    });
  });

  describe('POST /api/qr-auth/login', () => {
    test('should login successfully with valid QR token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/qr-auth/login',
        payload: {
          token: qrToken,
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(body.accessToken);
      assert.ok(body.refreshToken);
      assert.strictEqual(body.userId, childUserId);
      assert.strictEqual(body.email, childEmail);
      assert.strictEqual(body.householdId, householdId);
      assert.strictEqual(body.childId, childId);
      assert.strictEqual(body.firstName, 'Child');
      assert.strictEqual(body.lastName, 'Test');
    });

    test('should reject empty token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/qr-auth/login',
        payload: {
          token: '',
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'Token is required');
    });

    test('should reject invalid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/qr-auth/login',
        payload: {
          token: 'invalid-token-12345',
        },
      });

      assert.strictEqual(response.statusCode, 401);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'Invalid QR token');
    });
  });

  describe('POST /api/qr-auth/regenerate/:childId', () => {
    test('should regenerate QR token and invalidate old token', async () => {
      const oldToken = qrToken;

      const response = await app.inject({
        method: 'POST',
        url: `/api/qr-auth/regenerate/${childId}`,
        headers: {
          authorization: `Bearer ${parentAccessToken}`,
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(body.token);
      assert.strictEqual(body.childId, childId);
      assert.notStrictEqual(body.token, oldToken); // Should be different

      qrToken = body.token;

      // Verify old token is invalid
      const oldTokenResponse = await app.inject({
        method: 'POST',
        url: '/api/qr-auth/login',
        payload: {
          token: oldToken,
        },
      });

      assert.strictEqual(oldTokenResponse.statusCode, 401);

      // Verify new token works
      const newTokenResponse = await app.inject({
        method: 'POST',
        url: '/api/qr-auth/login',
        payload: {
          token: qrToken,
        },
      });

      assert.strictEqual(newTokenResponse.statusCode, 200);
    });

    test('should reject unauthenticated request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/qr-auth/regenerate/${childId}`,
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('GET /api/qr-auth/token/:childId', () => {
    test('should get current QR token (parent auth)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/qr-auth/token/${childId}`,
        headers: {
          authorization: `Bearer ${parentAccessToken}`,
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.token, qrToken);
      assert.strictEqual(body.childId, childId);
      assert.strictEqual(body.childName, 'Test Child');
    });

    test('should reject unauthenticated request', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/qr-auth/token/${childId}`,
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject non-existent child', async () => {
      const fakeChildId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject({
        method: 'GET',
        url: `/api/qr-auth/token/${fakeChildId}`,
        headers: {
          authorization: `Bearer ${parentAccessToken}`,
        },
      });

      assert.strictEqual(response.statusCode, 404);
    });
  });

  describe('Security: Token uniqueness and cryptographic strength', () => {
    test('should generate unique tokens for each child', async () => {
      // First, generate a token for the first child
      const firstResponse = await app.inject({
        method: 'POST',
        url: `/api/qr-auth/generate/${childId}`,
        headers: {
          authorization: `Bearer ${parentAccessToken}`,
        },
      });
      const firstBody = JSON.parse(firstResponse.body);
      const firstToken = firstBody.token;

      // Create second child user (different from first child)
      const child2Email = `test-qr-child2-${Date.now()}@example.com`;
      const child2RegisterResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: child2Email,
          password: testPassword,
          firstName: 'Child2',
          lastName: 'Test',
        },
      });

      const child2RegisterBody = JSON.parse(child2RegisterResponse.body);
      const child2UserId = child2RegisterBody.userId;

      // Add second child user to parent's household
      await pool.query(
        `INSERT INTO household_members (household_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [householdId, child2UserId, 'child'],
      );

      // Create second child profile
      const childResult2 = await pool.query(
        `INSERT INTO children (household_id, user_id, name, birth_year)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [householdId, child2UserId, 'Test Child 2', 2016],
      );

      const childId2 = childResult2.rows[0].id;

      // Generate token for second child
      const response = await app.inject({
        method: 'POST',
        url: `/api/qr-auth/generate/${childId2}`,
        headers: {
          authorization: `Bearer ${parentAccessToken}`,
        },
      });

      const body = JSON.parse(response.body);
      assert.notStrictEqual(body.token, firstToken); // Should be different from first child's token

      // Cleanup
      await pool.query('DELETE FROM children WHERE id = $1', [childId2]);
      await pool.query('DELETE FROM household_members WHERE user_id = $1', [child2UserId]);
      await pool.query('DELETE FROM users WHERE id = $1', [child2UserId]);
    });

    test('should generate tokens with sufficient entropy (32+ bytes)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/qr-auth/generate/${childId}`,
        headers: {
          authorization: `Bearer ${parentAccessToken}`,
        },
      });

      assert.strictEqual(
        response.statusCode,
        201,
        `Expected 201 but got ${response.statusCode}: ${response.body}`,
      );
      const body = JSON.parse(response.body);
      // Base64url encoding of 32 bytes = 43 characters (without padding)
      assert.ok(body.token, 'Token should exist in response');
      assert.ok(body.token.length >= 43, 'Token should be at least 43 characters (32 bytes)');
    });
  });
});
