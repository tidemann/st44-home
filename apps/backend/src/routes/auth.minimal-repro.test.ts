/**
 * Minimal Reproduction Test for Login Double-Execution Issue
 *
 * This test isolates the "Reply was already sent" error to understand
 * why the login handler appears to execute twice in CI.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';

describe('Auth Login Double-Execution Bug Reproduction', () => {
  let app: FastifyInstance;
  const testEmail = `repro-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';

  before(async () => {
    app = await build();
    await app.ready();

    // Register a user first
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: testEmail,
        password: testPassword,
        firstName: 'Repro',
        lastName: 'Test',
      },
    });
  });

  after(async () => {
    await app.close();
  });

  test('login should only execute handler once', async () => {
    let handlerExecutionCount = 0;

    // Intercept logs to count "Successful login" messages
    const originalInfo = app.log.info;
    app.log.info = function (obj: any, msg?: string) {
      if (msg === 'Successful login') {
        handlerExecutionCount++;
        console.log(`[REPRO] Successful login logged (count: ${handlerExecutionCount})`);
      }
      return originalInfo.call(this, obj, msg);
    } as any;

    // Perform login
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: testEmail,
        password: testPassword,
      },
    });

    // Restore original log function
    app.log.info = originalInfo;

    console.log(`[REPRO] Handler executed ${handlerExecutionCount} times`);
    console.log(`[REPRO] Response status: ${response.statusCode}`);
    console.log(`[REPRO] Response body: ${response.body}`);

    // Handler should execute exactly once
    assert.strictEqual(
      handlerExecutionCount,
      1,
      `Handler executed ${handlerExecutionCount} times, expected 1`,
    );

    // Response should be successful
    assert.strictEqual(response.statusCode, 200);

    // Response should contain valid tokens
    const body = JSON.parse(response.body);
    assert.ok(body.accessToken, 'accessToken should be present');
    assert.ok(body.refreshToken, 'refreshToken should be present');
  });

  test('multiple sequential logins should each execute once', async () => {
    const executionCounts: number[] = [];

    for (let i = 0; i < 3; i++) {
      let count = 0;

      const originalInfo = app.log.info;
      app.log.info = function (obj: any, msg?: string) {
        if (msg === 'Successful login') {
          count++;
        }
        return originalInfo.call(this, obj, msg);
      } as any;

      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testEmail,
          password: testPassword,
        },
      });

      app.log.info = originalInfo;
      executionCounts.push(count);
    }

    console.log(`[REPRO] Sequential execution counts: ${executionCounts.join(', ')}`);

    // Each login should execute exactly once
    for (let i = 0; i < executionCounts.length; i++) {
      assert.strictEqual(
        executionCounts[i],
        1,
        `Login ${i + 1} executed ${executionCounts[i]} times, expected 1`,
      );
    }
  });
});
