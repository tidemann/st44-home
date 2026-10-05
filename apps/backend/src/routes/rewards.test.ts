import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.js';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { registerAndLogin } from '../test-helpers/auth.js';

/**
 * Rewards API Integration Tests (ST-624)
 *
 * A child asks for a reward, a parent says yes or no (with a reason) and can
 * undo the answer for 5 minutes. Points are held while a request waits and
 * come back on a no.
 */

describe('Rewards API', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let parentToken: string;
  let childToken: string;
  let householdId: string;
  let childId: string;
  let cinemaId: string; // 60 points, unlimited
  let stickerId: string; // 30 points, 1 in stock

  const timestamp = Date.now();
  const parentEmail = `test-rewards-parent-${timestamp}@example.com`;
  const childEmail = `test-rewards-child-${timestamp}@example.com`;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function redeem(rewardId: string) {
    return app.inject({
      method: 'POST',
      url: `/api/children/me/rewards/${rewardId}/redeem`,
      headers: auth(childToken),
    });
  }

  async function answer(
    redemptionId: string,
    action: 'approve' | 'reject' | 'fulfill' | 'undo',
    payload?: object,
  ) {
    return app.inject({
      method: 'POST',
      url: `/api/households/${householdId}/redemptions/${redemptionId}/${action}`,
      headers: auth(parentToken),
      ...(payload ? { payload } : {}),
    });
  }

  async function balance(): Promise<number> {
    const response = await app.inject({
      method: 'GET',
      url: '/api/children/me/rewards',
      headers: auth(childToken),
    });
    return JSON.parse(response.body).pointsBalance;
  }

  async function quantity(rewardId: string): Promise<number | null> {
    return (await pool.query('SELECT quantity FROM rewards WHERE id = $1', [rewardId])).rows[0]
      .quantity;
  }

  /** The child finishes a chore worth this many points */
  async function earn(points: number): Promise<void> {
    const taskId = (
      await pool.query(
        `INSERT INTO tasks (household_id, name, points, rule_type)
         VALUES ($1, 'Tøm oppvaskmaskinen', $2, 'daily') RETURNING id`,
        [householdId, points],
      )
    ).rows[0].id;
    const assignmentId = (
      await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, CURRENT_DATE, 'completed') RETURNING id`,
        [householdId, taskId, childId],
      )
    ).rows[0].id;
    await pool.query(
      `INSERT INTO task_completions (household_id, task_assignment_id, child_id, points_earned)
       VALUES ($1, $2, $3, $4)`,
      [householdId, assignmentId, childId, points],
    );
  }

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

    const parent = await registerAndLogin(app, parentEmail, 'TestPass123!');
    const child = await registerAndLogin(app, childEmail, 'TestPass123!');
    parentToken = parent.accessToken;
    childToken = child.accessToken;
    const parentUserId = (await pool.query('SELECT id FROM users WHERE email = $1', [parentEmail]))
      .rows[0].id;
    const childUserId = (await pool.query('SELECT id FROM users WHERE email = $1', [childEmail]))
      .rows[0].id;

    householdId = (
      await pool.query(`INSERT INTO households (name) VALUES ('Familien Test') RETURNING id`)
    ).rows[0].id;
    await pool.query(
      `INSERT INTO household_members (household_id, user_id, role)
       VALUES ($1, $2, 'admin'), ($1, $3, 'child')`,
      [householdId, parentUserId, childUserId],
    );
    childId = (
      await pool.query(
        `INSERT INTO children (household_id, user_id, name, birth_year)
         VALUES ($1, $2, 'Emma', 2016) RETURNING id`,
        [householdId, childUserId],
      )
    ).rows[0].id;

    await earn(100);

    const create = async (payload: object) =>
      JSON.parse(
        (
          await app.inject({
            method: 'POST',
            url: `/api/households/${householdId}/rewards`,
            headers: auth(parentToken),
            payload,
          })
        ).body,
      ).id;
    cinemaId = await create({ name: 'Kino', pointsCost: 60 });
    stickerId = await create({ name: 'Klistremerke', pointsCost: 30, quantity: 1 });
  });

  after(async () => {
    await pool.query('DELETE FROM households WHERE id = $1', [householdId]);
    await pool.query(`DELETE FROM users WHERE email LIKE 'test-rewards-%@example.com'`);
    await pool.end();
    await app.close();
  });

  test('the child sees the rewards and a balance of 100', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/children/me/rewards',
      headers: auth(childToken),
    });
    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.pointsBalance, 100);
    assert.deepStrictEqual(
      body.rewards.map((r: { name: string; canAfford: boolean }) => [r.name, r.canAfford]),
      [
        ['Klistremerke', true],
        ['Kino', true],
      ],
    );
  });

  describe('a no with a reason, undone, then a yes', () => {
    let redemptionId: string;

    test('asking holds the points', async () => {
      const response = await redeem(cinemaId);
      assert.strictEqual(response.statusCode, 201);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.redemption.status, 'pending');
      assert.strictEqual(body.newBalance, 40);
      redemptionId = body.redemption.id;
    });

    test('the child cannot ask for more than the points left', async () => {
      const response = await redeem(cinemaId);
      assert.strictEqual(response.statusCode, 400);
      assert.deepStrictEqual(JSON.parse(response.body).details, { required: 60, available: 40 });
    });

    test('the parent sees the request with names', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/redemptions?status=pending`,
        headers: auth(parentToken),
      });
      assert.strictEqual(response.statusCode, 200);
      const [request] = JSON.parse(response.body).redemptions;
      assert.strictEqual(request.id, redemptionId);
      assert.strictEqual(request.rewardName, 'Kino');
      assert.strictEqual(request.childName, 'Emma');
    });

    test('a child cannot answer a request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/redemptions/${redemptionId}/approve`,
        headers: auth(childToken),
      });
      assert.strictEqual(response.statusCode, 403);
    });

    test('a reason longer than 500 characters is refused', async () => {
      const response = await answer(redemptionId, 'reject', { reason: 'x'.repeat(501) });
      assert.strictEqual(response.statusCode, 400);
    });

    test('a no stores the reason and gives the points back', async () => {
      const response = await answer(redemptionId, 'reject', {
        reason: '  Vi har kino på lørdag uansett.  ',
      });
      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.status, 'rejected');
      assert.strictEqual(body.rejectionReason, 'Vi har kino på lørdag uansett.');
      assert.ok(body.decidedAt);
      assert.strictEqual(await balance(), 100);
    });

    test('the child sees the no and why', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/children/me/redemptions',
        headers: auth(childToken),
      });
      assert.strictEqual(response.statusCode, 200);
      const [request] = JSON.parse(response.body).redemptions;
      assert.strictEqual(request.rewardName, 'Kino');
      assert.strictEqual(request.status, 'rejected');
      assert.strictEqual(request.rejectionReason, 'Vi har kino på lørdag uansett.');
    });

    test('a second no is harmless, a yes after a no is refused', async () => {
      assert.strictEqual((await answer(redemptionId, 'reject')).statusCode, 200);
      assert.strictEqual((await answer(redemptionId, 'approve')).statusCode, 409);
    });

    test('undo puts it back to waiting and holds the points again', async () => {
      const response = await answer(redemptionId, 'undo');
      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.status, 'pending');
      assert.strictEqual(body.rejectionReason, null);
      assert.strictEqual(body.decidedAt, null);
      assert.strictEqual(await balance(), 40);
    });

    test('a waiting request cannot be marked as given', async () => {
      assert.strictEqual((await answer(redemptionId, 'fulfill')).statusCode, 409);
    });

    test('yes, undo, yes again, then given; a given reward cannot be undone', async () => {
      assert.strictEqual(
        JSON.parse((await answer(redemptionId, 'approve')).body).status,
        'approved',
      );
      assert.strictEqual(JSON.parse((await answer(redemptionId, 'undo')).body).status, 'pending');
      assert.strictEqual(
        JSON.parse((await answer(redemptionId, 'approve')).body).status,
        'approved',
      );
      assert.strictEqual(await balance(), 40);

      const fulfilled = await answer(redemptionId, 'fulfill');
      assert.strictEqual(JSON.parse(fulfilled.body).status, 'fulfilled');
      assert.strictEqual((await answer(redemptionId, 'undo')).statusCode, 409);
    });
  });

  describe('limits on undo', () => {
    test('after 5 minutes an answer cannot be undone', async () => {
      // Balance is 40: ask for the sticker (30)
      const redemptionId = JSON.parse((await redeem(stickerId)).body).redemption.id;
      await answer(redemptionId, 'approve');
      await pool.query(
        `UPDATE reward_redemptions SET decided_at = NOW() - INTERVAL '6 minutes' WHERE id = $1`,
        [redemptionId],
      );
      const response = await answer(redemptionId, 'undo');
      assert.strictEqual(response.statusCode, 409);
      assert.strictEqual(JSON.parse(response.body).message, 'Too late to undo this answer');
    });

    test('a no gives the item back, and undo takes it again', async () => {
      // Balance is 10 here: earn 30 and put one sticker back in stock
      await earn(30);
      await pool.query('UPDATE rewards SET quantity = 1 WHERE id = $1', [stickerId]);
      const redemptionId = JSON.parse((await redeem(stickerId)).body).redemption.id;
      assert.strictEqual(await quantity(stickerId), 0);

      await answer(redemptionId, 'reject', { reason: 'Ikke i dag' });
      assert.strictEqual(await quantity(stickerId), 1);

      await answer(redemptionId, 'undo');
      assert.strictEqual(await quantity(stickerId), 0);
      await answer(redemptionId, 'reject');
    });

    test('a no cannot be undone when the points are spent in the meantime', async () => {
      // Balance is 40 here: earn 20, ask for the cinema (60), get a no, then
      // spend the points on the sticker before the undo
      await earn(20);
      assert.strictEqual(await balance(), 60);

      const cinema = JSON.parse((await redeem(cinemaId)).body).redemption.id;
      await answer(cinema, 'reject', { reason: 'Ikke denne uka' });
      assert.strictEqual((await redeem(stickerId)).statusCode, 201);

      const response = await answer(cinema, 'undo');
      assert.strictEqual(response.statusCode, 409);
      assert.strictEqual(JSON.parse(response.body).message, 'Insufficient points');
    });
  });
});
