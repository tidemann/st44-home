/**
 * errorResponseSchema contract tests (ST-636)
 *
 * The route tests run with NODE_ENV=test, which strips response schemas, so they
 * never see the serializer. These tests compile the schema the way production does.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import Fastify from 'fastify';
import { errorResponseSchema } from './common.ts';

async function replyWith(statusCode: number, payload: Record<string, unknown>) {
  const app = Fastify();
  app.get('/', { schema: { response: { [statusCode]: errorResponseSchema } } }, async (_, reply) =>
    reply.code(statusCode).send(payload),
  );
  const response = await app.inject({ method: 'GET', url: '/' });
  await app.close();
  return response;
}

describe('errorResponseSchema', () => {
  test('serializes a reply that only has an error message', async () => {
    const response = await replyWith(401, { error: 'Invalid email or password' });

    assert.strictEqual(response.statusCode, 401);
    assert.deepStrictEqual(JSON.parse(response.body), { error: 'Invalid email or password' });
  });

  test('keeps message and statusCode when a route sends them', async () => {
    const response = await replyWith(404, {
      error: 'Not Found',
      message: 'Task not found',
      statusCode: 404,
    });

    assert.strictEqual(response.statusCode, 404);
    assert.deepStrictEqual(JSON.parse(response.body), {
      error: 'Not Found',
      message: 'Task not found',
      statusCode: 404,
    });
  });
});
