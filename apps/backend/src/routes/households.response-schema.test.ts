import { test, describe } from 'node:test';
import assert from 'node:assert';
import Fastify from 'fastify';
import { zodToOpenAPI } from '@st44/types/generators';
import {
  HouseholdDetailResponseSchema,
  HouseholdListItemResponseSchema,
} from './households.ts';

// stripResponseValidation() drops response schemas under NODE_ENV=test, so the
// route tests never see the serializer. Run the real schemas through one here (ST-1076).
const household = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Familien Dahl',
  role: 'parent',
  memberCount: 2,
  childrenCount: 1,
  createdAt: '2026-10-13T22:00:00.000Z',
  updatedAt: '2026-10-13T22:00:00.000Z',
};

describe('Household response schemas', () => {
  test('detail schema keeps role and counts', async () => {
    const app = Fastify();
    app.get('/h', { schema: { response: { 200: zodToOpenAPI(HouseholdDetailResponseSchema) } } }, async () => household);
    const body = JSON.parse((await app.inject({ method: 'GET', url: '/h' })).body);
    assert.strictEqual(body.role, 'parent');
    assert.strictEqual(body.memberCount, 2);
    assert.strictEqual(body.childrenCount, 1);
    await app.close();
  });

  test('list item schema keeps role and counts', async () => {
    const app = Fastify();
    app.get('/l', { schema: { response: { 200: { type: 'array', items: zodToOpenAPI(HouseholdListItemResponseSchema) } } } }, async () => [{ ...household, adminCount: 1 }]);
    const body = JSON.parse((await app.inject({ method: 'GET', url: '/l' })).body);
    assert.strictEqual(body[0].role, 'parent');
    assert.strictEqual(body[0].adminCount, 1);
    await app.close();
  });
});
