/**
 * JWT Utilities Unit Tests
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  isTokenExpired,
  getJwtSecret,
} from './jwt.ts';

describe('JWT Utilities', () => {
  const testSecret = 'test-secret-for-unit-tests';
  const testUserId = 'user-123';
  const testEmail = 'test@example.com';

  describe('generateAccessToken', () => {
    test('should generate a valid JWT string', () => {
      const token = generateAccessToken(testUserId, testEmail, testSecret);
      assert.ok(typeof token === 'string');
      assert.ok(token.split('.').length === 3); // JWT has 3 parts
    });

    test('should include user data in payload', () => {
      const token = generateAccessToken(testUserId, testEmail, testSecret);
      const decoded = decodeToken(token) as { userId: string; email: string; type: string };

      assert.strictEqual(decoded.userId, testUserId);
      assert.strictEqual(decoded.email, testEmail);
      assert.strictEqual(decoded.type, 'access');
    });

    test('should use default secret when not provided', () => {
      const token = generateAccessToken(testUserId, testEmail);
      assert.ok(typeof token === 'string');
    });

    test('should generate different tokens for different users', () => {
      const token1 = generateAccessToken('user-1', 'user1@example.com', testSecret);
      const token2 = generateAccessToken('user-2', 'user2@example.com', testSecret);
      assert.notStrictEqual(token1, token2);
    });
  });

  describe('generateRefreshToken', () => {
    test('should generate a valid JWT string', () => {
      const token = generateRefreshToken(testUserId, testSecret);
      assert.ok(typeof token === 'string');
      assert.ok(token.split('.').length === 3);
    });

    test('should include user id and type in payload', () => {
      const token = generateRefreshToken(testUserId, testSecret);
      const decoded = decodeToken(token) as { userId: string; type: string };

      assert.strictEqual(decoded.userId, testUserId);
      assert.strictEqual(decoded.type, 'refresh');
    });

    test('should NOT include email in refresh token', () => {
      const token = generateRefreshToken(testUserId, testSecret);
      const decoded = decodeToken(token) as { email?: string };
      assert.strictEqual(decoded.email, undefined);
    });
  });

  describe('verifyAccessToken', () => {
    test('should verify valid access token', () => {
      const token = generateAccessToken(testUserId, testEmail, testSecret);
      const result = verifyAccessToken(token, testSecret);

      assert.strictEqual(result.valid, true);
      assert.ok(result.payload);
      assert.strictEqual(result.payload.userId, testUserId);
      assert.strictEqual(result.payload.email, testEmail);
    });

    test('should reject invalid token', () => {
      const result = verifyAccessToken('invalid.token.here', testSecret);

      assert.strictEqual(result.valid, false);
      assert.ok(result.error);
    });

    test('should reject token with wrong secret', () => {
      const token = generateAccessToken(testUserId, testEmail, testSecret);
      const result = verifyAccessToken(token, 'wrong-secret');

      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('Invalid token'));
    });

    test('should reject refresh token as access token', () => {
      const refreshToken = generateRefreshToken(testUserId, testSecret);
      const result = verifyAccessToken(refreshToken, testSecret);

      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('expected access token'));
    });

    test('should reject expired token', async () => {
      // Generate token that expires immediately
      const token = generateAccessToken(testUserId, testEmail, testSecret, '1ms');

      // Wait for it to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = verifyAccessToken(token, testSecret);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('expired'));
    });

    test('should reject malformed token', () => {
      const result = verifyAccessToken('not-a-jwt', testSecret);
      assert.strictEqual(result.valid, false);
    });

    test('should reject empty token', () => {
      const result = verifyAccessToken('', testSecret);
      assert.strictEqual(result.valid, false);
    });
  });

  describe('verifyRefreshToken', () => {
    test('should verify valid refresh token', () => {
      const token = generateRefreshToken(testUserId, testSecret);
      const result = verifyRefreshToken(token, testSecret);

      assert.strictEqual(result.valid, true);
      assert.ok(result.payload);
      assert.strictEqual(result.payload.userId, testUserId);
    });

    test('should reject access token as refresh token', () => {
      const accessToken = generateAccessToken(testUserId, testEmail, testSecret);
      const result = verifyRefreshToken(accessToken, testSecret);

      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('expected refresh token'));
    });

    test('should reject invalid token', () => {
      const result = verifyRefreshToken('invalid.token', testSecret);
      assert.strictEqual(result.valid, false);
    });

    test('should reject token with wrong secret', () => {
      const token = generateRefreshToken(testUserId, testSecret);
      const result = verifyRefreshToken(token, 'wrong-secret');

      assert.strictEqual(result.valid, false);
    });
  });

  describe('decodeToken', () => {
    test('should decode token without verification', () => {
      const token = generateAccessToken(testUserId, testEmail, testSecret);
      const decoded = decodeToken(token) as { userId: string; email: string };

      assert.strictEqual(decoded.userId, testUserId);
      assert.strictEqual(decoded.email, testEmail);
    });

    test('should decode token even with wrong secret', () => {
      const token = generateAccessToken(testUserId, testEmail, 'some-secret');
      const decoded = decodeToken(token) as { userId: string };

      assert.strictEqual(decoded.userId, testUserId);
    });

    test('should return null for invalid token', () => {
      const decoded = decodeToken('not-a-valid-jwt');
      assert.strictEqual(decoded, null);
    });
  });

  describe('isTokenExpired', () => {
    test('should return false for valid non-expired token', () => {
      const token = generateAccessToken(testUserId, testEmail, testSecret, '1h');
      assert.strictEqual(isTokenExpired(token), false);
    });

    test('should return true for expired token', async () => {
      const token = generateAccessToken(testUserId, testEmail, testSecret, '1ms');
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.strictEqual(isTokenExpired(token), true);
    });

    test('should return true for invalid token', () => {
      assert.strictEqual(isTokenExpired('invalid-token'), true);
    });

    test('should return true for token without exp claim', () => {
      // This is a manually crafted token without proper structure
      assert.strictEqual(
        isTokenExpired('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMifQ.signature'),
        true,
      );
    });
  });

  describe('getJwtSecret', () => {
    test('should return a string', () => {
      const secret = getJwtSecret();
      assert.ok(typeof secret === 'string');
      assert.ok(secret.length > 0);
    });
  });
});
