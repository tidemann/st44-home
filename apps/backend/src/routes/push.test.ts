import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.js';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { registerAndLogin } from '../test-helpers/auth.js';
import { PushService } from '../services/push.service.js';

/**
 * Push API Integration Tests (ST-623)
 *
 * The test environment has no VAPID keys, so push is off: subscriptions are
 * stored but nothing is sent.
 */

describe('Push API', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let tokenA: string;
  let tokenB: string;
  let userA: string;

  const endpoint = `https://push.example.com/send/${Date.now()}`;
  const subscription = { endpoint, keys: { p256dh: 'BOr8kLp256dh', auth: 'authsecret' } };

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

    const timestamp = Date.now();
    const emailA = `test-push-a-${timestamp}@example.com`;
    const emailB = `test-push-b-${timestamp}@example.com`;
    tokenA = (await registerAndLogin(app, emailA, 'TestPass123!')).accessToken;
    tokenB = (await registerAndLogin(app, emailB, 'TestPass123!')).accessToken;
    userA = (await pool.query('SELECT id FROM users WHERE email = $1', [emailA])).rows[0].id;
  });

  after(async () => {
    await pool.query(`DELETE FROM users WHERE email LIKE 'test-push-%@example.com'`);
    await pool.end();
    await app.close();
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  test('GET /api/push/config needs a login', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/push/config' });
    assert.strictEqual(response.statusCode, 401);
  });

  test('GET /api/push/config says push is off without VAPID keys', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/push/config',
      headers: auth(tokenA),
    });
    assert.strictEqual(response.statusCode, 200);
    assert.deepStrictEqual(JSON.parse(response.body), { enabled: false, publicKey: null });
  });

  test('POST /api/push/subscriptions stores the subscription for the user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/push/subscriptions',
      headers: { ...auth(tokenA), 'user-agent': 'Safari test' },
      payload: subscription,
    });
    assert.strictEqual(response.statusCode, 201);

    const rows = (
      await pool.query(
        'SELECT user_id, p256dh, auth, user_agent FROM push_subscriptions WHERE endpoint = $1',
        [endpoint],
      )
    ).rows;
    assert.deepStrictEqual(rows, [
      { user_id: userA, p256dh: 'BOr8kLp256dh', auth: 'authsecret', user_agent: 'Safari test' },
    ]);
  });

  test('subscribing the same browser again keeps one row', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/push/subscriptions',
      headers: auth(tokenA),
      payload: subscription,
    });
    const count = (
      await pool.query('SELECT count(*)::int AS n FROM push_subscriptions WHERE endpoint = $1', [
        endpoint,
      ])
    ).rows[0].n;
    assert.strictEqual(count, 1);
  });

  test('POST /api/push/subscriptions rejects a non-https endpoint', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/push/subscriptions',
      headers: auth(tokenA),
      payload: { ...subscription, endpoint: 'http://push.example.com/x' },
    });
    assert.strictEqual(response.statusCode, 400);
  });

  test('another user cannot remove my subscription', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/push/subscriptions',
      headers: auth(tokenB),
      payload: { endpoint },
    });
    assert.strictEqual(response.statusCode, 204);
    const count = (
      await pool.query('SELECT count(*)::int AS n FROM push_subscriptions WHERE endpoint = $1', [
        endpoint,
      ])
    ).rows[0].n;
    assert.strictEqual(count, 1);
  });

  test('POST /api/push/test is refused while push is off', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/push/test',
      headers: auth(tokenA),
    });
    assert.strictEqual(response.statusCode, 400);
  });

  test('DELETE /api/push/subscriptions removes my subscription', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/push/subscriptions',
      headers: auth(tokenA),
      payload: { endpoint },
    });
    assert.strictEqual(response.statusCode, 204);
    const count = (
      await pool.query('SELECT count(*)::int AS n FROM push_subscriptions WHERE endpoint = $1', [
        endpoint,
      ])
    ).rows[0].n;
    assert.strictEqual(count, 0);
  });

  describe('"Påminn nå" (ST-686)', () => {
    let householdId: string;
    let userB: string;
    let assignmentId: string;

    before(async () => {
      // A is the parent; B is the child's login, with a phone that has push on
      const household = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: auth(tokenA),
        payload: { name: `Push remind ${Date.now()}` },
      });
      householdId = JSON.parse(household.body).id;
      userB = (
        await pool.query('SELECT id FROM users WHERE email LIKE $1', ['test-push-b-%@example.com'])
      ).rows[0].id;
      await pool.query(
        `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'child')`,
        [householdId, userB],
      );
      const childId = (
        await pool.query(
          `INSERT INTO children (household_id, user_id, name) VALUES ($1, $2, 'Emma') RETURNING id`,
          [householdId, userB],
        )
      ).rows[0].id;
      const taskId = (
        await pool.query(
          `INSERT INTO tasks (household_id, name, points, rule_type)
           VALUES ($1, 'Gå på do', 5, 'daily') RETURNING id`,
          [householdId],
        )
      ).rows[0].id;
      assignmentId = (
        await pool.query(
          `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
           VALUES ($1, $2, $3, CURRENT_DATE, 'pending') RETURNING id`,
          [householdId, taskId, childId],
        )
      ).rows[0].id;
      await pool.query(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1, $2, 'k', 'a')`,
        [userB, `https://push.example.com/emma/${Date.now()}`],
      );
    });

    after(async () => {
      await pool.query('DELETE FROM households WHERE id = $1', [householdId]);
    });

    const noon = new Date('2026-10-05T12:00:00+02:00');

    /** The real service and SQL, with fake phones instead of a push service */
    function serviceWithFakePhones() {
      const sent: { endpoint: string; payload: Record<string, unknown> }[] = [];
      const service = new PushService(
        { publicKey: 'pub', privateKey: 'priv', subject: 'mailto:x@y.no' },
        pool,
        async (subscription, payload) => {
          sent.push({ endpoint: subscription.endpoint, payload: JSON.parse(payload) });
        },
      );
      return { sent, service };
    }

    test('the route needs a login', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/assignments/${assignmentId}/remind`,
      });
      assert.strictEqual(response.statusCode, 401);
    });

    test('the route is refused while push is off', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/assignments/${assignmentId}/remind`,
        headers: auth(tokenA),
      });
      assert.strictEqual(response.statusCode, 400);
    });

    test('a parent reminds the child, whose phone gets "Påminnelse"', async () => {
      const { sent, service } = serviceWithFakePhones();
      assert.strictEqual(await service.remindAssignment(assignmentId, userA, noon), 1);
      assert.match(sent[0].endpoint, /\/emma\//);
      assert.strictEqual(sent[0].payload.title, 'Påminnelse');
      assert.strictEqual(sent[0].payload.body, 'Husk: Gå på do');
    });

    // ST-691: the retest was at 20:30 and the old quiet-hours rule refused it
    test('a parent reminds at 20:30, and it still goes out', async () => {
      const { sent, service } = serviceWithFakePhones();
      const evening = new Date('2026-10-05T20:30:00+02:00');
      assert.strictEqual(await service.remindAssignment(assignmentId, userA, evening), 1);
      assert.strictEqual(sent[0].payload.body, 'Husk: Gå på do');
    });

    test('the child (not a parent) cannot send it', async () => {
      const { service } = serviceWithFakePhones();
      await assert.rejects(service.remindAssignment(assignmentId, userB, noon), {
        statusCode: 403,
      });
    });
  });
});
