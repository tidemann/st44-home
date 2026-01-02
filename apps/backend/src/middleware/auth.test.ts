import { test, describe } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { authenticateUser } from './auth.ts';

/**
 * Authentication Middleware Unit Tests
 */

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function createMockRequest(authHeader?: string) {
  return {
    headers: { authorization: authHeader },
    log: { warn: () => {}, error: () => {}, info: () => {} },
    user: undefined,
  } as any;
}

function createMockReply() {
  let statusCode = 200;
  let responseBody: any = null;
  let sent = false;

  return {
    code: function (code: number) {
      statusCode = code;
      return this;
    },
    send: function (body: any) {
      responseBody = body;
      sent = true;
      return this;
    },
    getStatus: () => statusCode,
    getBody: () => responseBody,
    wasSent: () => sent,
  } as any;
}

function generateValidToken(userId: string, email: string): string {
  return jwt.sign({ userId, email, type: 'access' }, JWT_SECRET, { expiresIn: '1h' });
}

function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
}

function generateExpiredToken(userId: string, email: string): string {
  return jwt.sign({ userId, email, type: 'access' }, JWT_SECRET, { expiresIn: '-1s' });
}

describe('authenticateUser Middleware', () => {
  describe('Authorization Header Validation', () => {
    test('should return 401 when Authorization header is missing', async () => {
      const request = createMockRequest(undefined);
      const reply = createMockReply();

      await authenticateUser(request, reply);

      assert.strictEqual(reply.getStatus(), 401);
      assert.strictEqual(reply.getBody().message, 'Missing or invalid authorization header');
    });

    test('should return 401 when header does not start with Bearer', async () => {
      const request = createMockRequest('Basic token');
      const reply = createMockReply();

      await authenticateUser(request, reply);

      assert.strictEqual(reply.getStatus(), 401);
    });
  });

  describe('Token Validation', () => {
    test('should return 401 for malformed token', async () => {
      const request = createMockRequest('Bearer not-a-valid-jwt');
      const reply = createMockReply();

      await authenticateUser(request, reply);

      assert.strictEqual(reply.getStatus(), 401);
      assert.strictEqual(reply.getBody().message, 'Invalid token');
    });

    test('should return 401 for expired token', async () => {
      const expiredToken = generateExpiredToken('user-123', 'test@example.com');
      const request = createMockRequest(`Bearer ${expiredToken}`);
      const reply = createMockReply();

      await authenticateUser(request, reply);

      assert.strictEqual(reply.getStatus(), 401);
      assert.strictEqual(reply.getBody().message, 'Token expired');
    });

    test('should return 401 for token with wrong secret', async () => {
      const badToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', type: 'access' },
        'wrong-secret',
        { expiresIn: '1h' },
      );
      const request = createMockRequest(`Bearer ${badToken}`);
      const reply = createMockReply();

      await authenticateUser(request, reply);

      assert.strictEqual(reply.getStatus(), 401);
    });

    test('should return 401 for refresh token (wrong type)', async () => {
      const refreshToken = generateRefreshToken('user-123');
      const request = createMockRequest(`Bearer ${refreshToken}`);
      const reply = createMockReply();

      await authenticateUser(request, reply);

      assert.strictEqual(reply.getStatus(), 401);
      assert.strictEqual(reply.getBody().message, 'Invalid token type');
    });
  });

  describe('Successful Authentication', () => {
    test('should authenticate valid access token', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const validToken = generateValidToken(userId, email);
      const request = createMockRequest(`Bearer ${validToken}`);
      const reply = createMockReply();

      await authenticateUser(request, reply);

      assert.strictEqual(reply.wasSent(), false);
      assert.ok(request.user);
      assert.strictEqual(request.user.userId, userId);
      assert.strictEqual(request.user.email, email);
    });

    test('should handle UUID user IDs', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const email = 'uuid@example.com';
      const validToken = generateValidToken(userId, email);
      const request = createMockRequest(`Bearer ${validToken}`);
      const reply = createMockReply();

      await authenticateUser(request, reply);

      assert.strictEqual(reply.wasSent(), false);
      assert.strictEqual(request.user?.userId, userId);
    });
  });
});
