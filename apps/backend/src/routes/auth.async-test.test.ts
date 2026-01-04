/**
 * Test to isolate async promise issue
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';

describe('Async Promise Double-Resolution Bug', () => {
  let app: FastifyInstance;

  before(async () => {
    app = await build();
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  test.skip('bcrypt.compare should not cause double execution - ESM MODULES CANT BE MOCKED', async () => {
    const bcrypt = await import('bcrypt');

    let compareCount = 0;
    const originalCompare = bcrypt.compare;
    bcrypt.compare = async (password: string, hash: string) => {
      compareCount++;
      return originalCompare(password, hash);
    };

    // Generate a hash
    const hash = await bcrypt.hash('test123', 10);

    // Compare multiple times
    for (let i = 0; i < 3; i++) {
      compareCount = 0;
      await bcrypt.compare('test123', hash);
      assert.strictEqual(
        compareCount,
        1,
        `bcrypt.compare executed ${compareCount} times, expected 1`,
      );
    }

    bcrypt.compare = originalCompare;
  });

  test.skip('jwt.sign should not cause double execution - ESM MODULES CANT BE MOCKED', async () => {
    const jwt = await import('jsonwebtoken');

    let signCount = 0;
    const originalSign = jwt.sign;
    (jwt as any).sign = (payload: any, secret: string, options: any) => {
      signCount++;
      return originalSign(payload, secret, options);
    };

    // Sign multiple tokens
    for (let i = 0; i < 3; i++) {
      signCount = 0;
      jwt.sign({ test: 'data' }, 'secret', { expiresIn: '1h' });
      assert.strictEqual(signCount, 1, `jwt.sign executed ${signCount} times, expected 1`);
    }

    (jwt as any).sign = originalSign;
  });
});
