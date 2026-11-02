import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { registerAndLogin } from '../test-helpers/auth.ts';

/**
 * A part-approved chore gives the child the points of its done sub-tasks, stored in
 * task_completions.points_earned. Fremgang and my-tasks count those, not the chore's full
 * points (ST-2104). The family: a plain 5, two 20s approved in full, two 20s approved with
 * 5 each: 5 + 20 + 20 + 5 + 5 = 55, where the full points would say 85.
 */
describe('Points of part-approved chores (ST-2104)', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let parentToken: string;
  let childToken: string;
  let householdId: string;
  let childId: string;
  const today = new Date().toISOString().split('T')[0];

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

    const stamp = Date.now();
    const parentEmail = `test-st2104-parent-${stamp}@example.com`;
    const childEmail = `test-st2104-child-${stamp}@example.com`;
    parentToken = (await registerAndLogin(app, parentEmail, 'TestPass123!')).accessToken;
    childToken = (await registerAndLogin(app, childEmail, 'TestPass123!')).accessToken;

    const users = await pool.query('SELECT id, email FROM users WHERE email = ANY($1)', [
      [parentEmail, childEmail],
    ]);
    const userId = (email: string) => users.rows.find((u) => u.email === email).id;

    householdId = (
      await pool.query('INSERT INTO households (name) VALUES ($1) RETURNING id', [
        `ST-2104 ${stamp}`,
      ])
    ).rows[0].id;
    await pool.query(
      'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3), ($1, $4, $5)',
      [householdId, userId(parentEmail), 'admin', userId(childEmail), 'child'],
    );
    childId = (
      await pool.query(
        'INSERT INTO children (household_id, user_id, name, birth_year) VALUES ($1, $2, $3, $4) RETURNING id',
        [householdId, userId(childEmail), 'Emma', 2015],
      )
    ).rows[0].id;

    // [full points of the chore, points the child got]
    const chores: Array<[number, number]> = [
      [5, 5],
      [20, 20],
      [20, 20],
      [20, 5],
      [20, 5],
    ];
    for (const [index, [points, earned]] of chores.entries()) {
      const taskId = (
        await pool.query(
          'INSERT INTO tasks (household_id, name, points, rule_type, active) VALUES ($1, $2, $3, $4, true) RETURNING id',
          [householdId, `Oppgave ${index + 1}`, points, 'daily'],
        )
      ).rows[0].id;
      const assignmentId = (
        await pool.query(
          'INSERT INTO task_assignments (household_id, task_id, child_id, date, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [householdId, taskId, childId, today, 'completed'],
        )
      ).rows[0].id;
      await pool.query(
        'INSERT INTO task_completions (household_id, task_assignment_id, child_id, points_earned, completed_at) VALUES ($1, $2, $3, $4, NOW())',
        [householdId, assignmentId, childId, earned],
      );
    }
  });

  after(async () => {
    await pool.query('DELETE FROM households WHERE id = $1', [householdId]);
    await pool.end();
    await app.close();
  });

  test('Fremgang for the household counts 55', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/households/${householdId}/analytics?period=week`,
      headers: { Authorization: `Bearer ${parentToken}` },
    });
    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.periodComparison.current.totalPoints, 55);
    const child = body.childrenProgress.find((c: { childId: string }) => c.childId === childId);
    assert.strictEqual(child.totalPointsEarned, 55);
  });

  test("the child's own Fremgang counts 55", async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/children/me/analytics?period=week',
      headers: { Authorization: `Bearer ${childToken}` },
    });
    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.weekProgress.pointsEarned, 55);
    assert.strictEqual(body.monthProgress.pointsEarned, 55);
    const daily = body.dailyPoints.reduce(
      (sum: number, day: { pointsEarned: number }) => sum + day.pointsEarned,
      0,
    );
    assert.strictEqual(daily, 55);
  });

  test('my-tasks completedPoints counts 55 of 85', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/children/my-tasks?date=${today}`,
      headers: { Authorization: `Bearer ${childToken}` },
    });
    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.totalPointsToday, 85);
    assert.strictEqual(body.completedPoints, 55);
  });

  // Runs last: it adds a sixth chore. A completed chore with no completion row (older data)
  // still counts its full points, as before.
  test('a completed chore without a completion row counts its full points', async () => {
    const taskId = (
      await pool.query(
        'INSERT INTO tasks (household_id, name, points, rule_type, active) VALUES ($1, $2, $3, $4, true) RETURNING id',
        [householdId, 'Oppgave 6', 10, 'daily'],
      )
    ).rows[0].id;
    await pool.query(
      'INSERT INTO task_assignments (household_id, task_id, child_id, date, status) VALUES ($1, $2, $3, $4, $5)',
      [householdId, taskId, childId, today, 'completed'],
    );

    const analytics = await app.inject({
      method: 'GET',
      url: `/api/households/${householdId}/analytics?period=week`,
      headers: { Authorization: `Bearer ${parentToken}` },
    });
    assert.strictEqual(JSON.parse(analytics.body).periodComparison.current.totalPoints, 65);

    const myTasks = await app.inject({
      method: 'GET',
      url: `/api/children/my-tasks?date=${today}`,
      headers: { Authorization: `Bearer ${childToken}` },
    });
    assert.strictEqual(JSON.parse(myTasks.body).completedPoints, 65);
  });
});
