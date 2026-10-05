import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';

/**
 * Login error replies with response schemas on (ST-636)
 *
 * NODE_ENV=test strips response schemas (schemas/common.ts), so auth.test.ts never
 * runs the serializer that production runs. Live, a wrong email or password came
 * back as 500 ("message" is required!). This file loads the server with the
 * schemas kept. node --test runs each file in its own process, so the override
 * stays here.
 */
process.env.NODE_ENV = 'development';

describe('POST /api/auth/login with response schemas', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  const testEmail = `test-login-errors-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';
  let userId: string | undefined;

  before(async () => {
    // If the runner ever shares a process across files, the schemas may already be
    // stripped; fail here rather than quietly testing without them.
    const { loginSchema } = await import('../schemas/auth.ts');
    assert.ok('response' in loginSchema, 'login response schema was stripped');

    const { build } = await import('../server.ts');
    app = await build();
    await app.ready();

    pool = new pg.Pool({
      host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '55432'),
      database: process.env.TEST_DB_NAME || 'st44_test',
      user: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
    });

    const register = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: testEmail, password: testPassword, firstName: 'Login', lastName: 'Errors' },
    });
    assert.strictEqual(register.statusCode, 201, register.body);
    userId = JSON.parse(register.body).userId;
  });

  after(async () => {
    if (userId) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    await pool.end();
    await app.close();
  });

  test('unknown email returns 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: `nobody-${Date.now()}@example.com`, password: testPassword },
    });

    assert.strictEqual(response.statusCode, 401, response.body);
    assert.strictEqual(JSON.parse(response.body).error, 'Invalid email or password');
  });

  test('wrong password returns 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: testEmail, password: 'WrongPass123!' },
    });

    assert.strictEqual(response.statusCode, 401, response.body);
    assert.strictEqual(JSON.parse(response.body).error, 'Invalid email or password');
  });

  test('correct login still returns 200 with tokens', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: testEmail, password: testPassword },
    });

    assert.strictEqual(response.statusCode, 200, response.body);
    const body = JSON.parse(response.body);
    assert.ok(body.accessToken);
    assert.ok(body.refreshToken);
    assert.strictEqual(body.userId, userId);
  });
});
