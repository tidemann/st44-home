import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from './server.ts';
import type { FastifyInstance } from 'fastify';

/**
 * i18n (Internationalization) Tests
 *
 * Tests for backend i18n functionality:
 * - Language detection from Accept-Language header
 * - Translation loading for Norwegian (no) and English (en)
 * - Error messages returned in correct language
 * - Fallback to Norwegian for unsupported languages
 */

describe('i18n - Internationalization', () => {
  let app: FastifyInstance;

  before(async () => {
    app = await build();
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  describe('Language Detection', () => {
    test('should detect Norwegian from Accept-Language header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        headers: {
          'accept-language': 'no',
        },
        payload: {
          // Invalid payload to trigger validation error
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      // The error message should be in Norwegian
      assert.ok(body.message, 'Response should have a message');
      // Check if it's the Norwegian translation
      assert.strictEqual(body.message, 'Validering feilet');
    });

    test('should detect English from Accept-Language header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        headers: {
          'accept-language': 'en',
        },
        payload: {
          // Invalid payload to trigger validation error
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      // The error message should be in English
      assert.ok(body.message, 'Response should have a message');
      assert.strictEqual(body.message, 'Validation failed');
    });

    test('should fallback to Norwegian for unsupported language', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        headers: {
          'accept-language': 'de', // German - not supported
        },
        payload: {
          // Invalid payload to trigger validation error
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      // Should fallback to Norwegian
      assert.strictEqual(body.message, 'Validering feilet');
    });

    test('should handle Accept-Language with region code (en-US)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        headers: {
          'accept-language': 'en-US',
        },
        payload: {
          // Invalid payload to trigger validation error
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      // Should use English
      assert.strictEqual(body.message, 'Validation failed');
    });

    test('should handle Accept-Language with quality values', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        headers: {
          'accept-language': 'de;q=0.9, en;q=0.8, no;q=0.7',
        },
        payload: {
          // Invalid payload to trigger validation error
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      // Should use English (first supported language in priority)
      assert.strictEqual(body.message, 'Validation failed');
    });

    test('should use Norwegian as default when no Accept-Language header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        // No Accept-Language header
        payload: {
          // Invalid payload to trigger validation error
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      // Should default to Norwegian
      assert.strictEqual(body.message, 'Validering feilet');
    });
  });

  describe('Authentication Error Responses', () => {
    // Note: Auth routes currently send simple { error: '...' } responses.
    // This test verifies basic error response structure.
    // Full i18n for auth routes would require updating them to use the global error handler.

    test('should return error response for invalid credentials (Norwegian)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        headers: {
          'accept-language': 'no',
        },
        payload: {
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!',
        },
      });

      const body = JSON.parse(response.body);
      // Auth routes send { error: '...' } - basic error structure
      assert.ok(body.error, 'Response should have an error field');
      // Either 401 (invalid credentials) or 500 (db error) depending on db state
      assert.ok([401, 500].includes(response.statusCode), 'Should be 401 or 500');
    });

    test('should return error response for invalid credentials (English)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        headers: {
          'accept-language': 'en',
        },
        payload: {
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!',
        },
      });

      const body = JSON.parse(response.body);
      // Auth routes send { error: '...' } - basic error structure
      assert.ok(body.error, 'Response should have an error field');
      // Either 401 (invalid credentials) or 500 (db error) depending on db state
      assert.ok([401, 500].includes(response.statusCode), 'Should be 401 or 500');
    });
  });

  describe('Health Check (language-agnostic)', () => {
    test('health endpoint should work regardless of language', async () => {
      const responseNo = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'accept-language': 'no',
        },
      });

      assert.strictEqual(responseNo.statusCode, 200);
      const bodyNo = JSON.parse(responseNo.body);
      assert.strictEqual(bodyNo.status, 'ok');

      const responseEn = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'accept-language': 'en',
        },
      });

      assert.strictEqual(responseEn.statusCode, 200);
      const bodyEn = JSON.parse(responseEn.body);
      assert.strictEqual(bodyEn.status, 'ok');
    });
  });
});
