import { test, describe, before, after, afterEach } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.js';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { registerAndLogin } from '../test-helpers/auth.js';

/**
 * Chores with sub-tasks (ST-2074): the parent's form, the child's ticks and "not possible",
 * sending for approval, and the points a parent's approval gives.
 */
describe('Chores with sub-tasks', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let parentToken: string;
  let childToken: string;
  let otherChildToken: string;
  let householdId: string;
  let childId: string;

  const today = new Date().toISOString().slice(0, 10);

  async function api(method: 'GET' | 'POST' | 'PUT', url: string, token: string, payload?: object) {
    const response = await app.inject({
      method,
      url,
      headers: { Authorization: `Bearer ${token}` },
      ...(payload && { payload }),
    });
    return { status: response.statusCode, body: JSON.parse(response.body || 'null') };
  }

  async function createChore(subtasks: { name: string; points: number }[]) {
    const created = await api('POST', `/api/households/${householdId}/tasks`, parentToken, {
      name: 'Rydd rommet',
      points: 7,
      ruleType: 'daily',
      ruleConfig: { assignedChildren: [childId] },
      subtasks,
    });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));
    const assignment = await pool.query<{ id: string }>(
      `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
       VALUES ($1, $2, $3, $4, 'pending')
       ON CONFLICT (task_id, child_id, date) WHERE child_id IS NOT NULL
       DO UPDATE SET status = 'pending'
       RETURNING id`,
      [householdId, created.body.id, childId, today],
    );
    return { task: created.body, assignmentId: assignment.rows[0].id };
  }

  async function myChore(assignmentId: string) {
    const mine = await api('GET', `/api/children/me/tasks?date=${today}`, childToken);
    assert.strictEqual(mine.status, 200, JSON.stringify(mine.body));
    return mine.body.tasks.find((t: { id: string }) => t.id === assignmentId);
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

    const stamp = Date.now();
    const password = 'TestPass123!';
    parentToken = (
      await registerAndLogin(app, `test-subtasks-parent-${stamp}@example.com`, password)
    ).accessToken;
    const child = await registerAndLogin(app, `test-subtasks-child-${stamp}@example.com`, password);
    const other = await registerAndLogin(app, `test-subtasks-other-${stamp}@example.com`, password);
    childToken = child.accessToken;
    otherChildToken = other.accessToken;

    const household = await api('POST', '/api/households', parentToken, {
      name: `Subtasks ${stamp}`,
    });
    householdId = household.body.id;

    const users = await pool.query<{ id: string; email: string }>(
      `SELECT id, email FROM users WHERE email = ANY($1)`,
      [[`test-subtasks-child-${stamp}@example.com`, `test-subtasks-other-${stamp}@example.com`]],
    );
    const idOf = (prefix: string) => users.rows.find((u) => u.email.includes(prefix))!.id;
    for (const userId of [idOf('-child-'), idOf('-other-')]) {
      await pool.query(
        `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'child')`,
        [householdId, userId],
      );
    }
    childId = (
      await pool.query<{ id: string }>(
        `INSERT INTO children (household_id, name, birth_year, user_id)
         VALUES ($1, 'Emma', 2015, $2) RETURNING id`,
        [householdId, idOf('-child-')],
      )
    ).rows[0].id;
    await pool.query(
      `INSERT INTO children (household_id, name, birth_year, user_id) VALUES ($1, 'Jonas', 2016, $2)`,
      [householdId, idOf('-other-')],
    );
  });

  afterEach(async () => {
    await pool.query('DELETE FROM task_completions WHERE household_id = $1', [householdId]);
    await pool.query('DELETE FROM task_assignments WHERE household_id = $1', [householdId]);
    await pool.query('DELETE FROM tasks WHERE household_id = $1', [householdId]);
  });

  after(async () => {
    if (householdId) {
      await pool.query('DELETE FROM children WHERE household_id = $1', [householdId]);
      await pool.query('DELETE FROM household_members WHERE household_id = $1', [householdId]);
      await pool.query('DELETE FROM households WHERE id = $1', [householdId]);
    }
    await pool.query(`DELETE FROM users WHERE email LIKE 'test-subtasks-%@example.com'`);
    await pool.end();
    await app.close();
  });

  test('the form saves sub-tasks in order, and the chore is worth their sum', async () => {
    const { task } = await createChore([
      { name: 'Re opp sengen', points: 5 },
      { name: 'Rydd pulten', points: 5 },
      { name: 'Støvsug gulvet', points: 10 },
    ]);
    assert.strictEqual(task.points, 20);
    assert.deepStrictEqual(
      task.subtasks.map((s: { name: string; position: number }) => [s.name, s.position]),
      [
        ['Re opp sengen', 0],
        ['Rydd pulten', 1],
        ['Støvsug gulvet', 2],
      ],
    );
  });

  test('editing reorders, renames, adds and removes, and keeps the ids of kept rows', async () => {
    const { task } = await createChore([
      { name: 'Re opp sengen', points: 5 },
      { name: 'Rydd pulten', points: 5 },
      { name: 'Støvsug gulvet', points: 10 },
    ]);
    const [bed, desk] = task.subtasks;
    const edited = await api(
      'PUT',
      `/api/households/${householdId}/tasks/${task.id}`,
      parentToken,
      {
        subtasks: [
          { id: desk.id, name: 'Rydd pulten', points: 3 },
          { id: bed.id, name: 'Re opp sengen og legg pysjen', points: 5 },
          { name: 'Tøm søpla', points: 2 },
        ],
      },
    );
    assert.strictEqual(edited.status, 200, JSON.stringify(edited.body));
    assert.strictEqual(edited.body.points, 10);
    assert.deepStrictEqual(
      edited.body.subtasks.map((s: { id: string; name: string }) => s.name),
      ['Rydd pulten', 'Re opp sengen og legg pysjen', 'Tøm søpla'],
    );
    assert.strictEqual(edited.body.subtasks[0].id, desk.id);
    assert.strictEqual(edited.body.subtasks[1].id, bed.id);

    // The last sub-task removed: a normal chore again, with the points the form sends
    const cleared = await api(
      'PUT',
      `/api/households/${householdId}/tasks/${task.id}`,
      parentToken,
      {
        points: 15,
        subtasks: [],
      },
    );
    assert.strictEqual(cleared.status, 200);
    assert.strictEqual(cleared.body.points, 15);
    assert.deepStrictEqual(cleared.body.subtasks, []);
  });

  test('a chore without sub-tasks works as before', async () => {
    const { task, assignmentId } = await createChore([]);
    assert.strictEqual(task.points, 7);
    assert.deepStrictEqual(task.subtasks, []);
    const chore = await myChore(assignmentId);
    assert.deepStrictEqual(chore.subtasks, []);
    assert.strictEqual(chore.submittedAt, null);
    const done = await api('POST', `/api/assignments/${assignmentId}/complete`, childToken);
    assert.strictEqual(done.status, 200);
    assert.strictEqual(done.body.completion.pointsEarned, 7);
    const tick = await api(
      'PUT',
      `/api/assignments/${assignmentId}/subtasks/${assignmentId}`,
      parentToken,
      { state: 'done' },
    );
    assert.strictEqual(tick.status, 400);
  });

  test('all sub-tasks ticked: the child finishes the chore and gets every point', async () => {
    const { task, assignmentId } = await createChore([
      { name: 'Re opp sengen', points: 5 },
      { name: 'Støvsug gulvet', points: 10 },
    ]);
    const first = await api(
      'PUT',
      `/api/assignments/${assignmentId}/subtasks/${task.subtasks[0].id}`,
      childToken,
      { state: 'done' },
    );
    assert.strictEqual(first.status, 200, JSON.stringify(first.body));
    assert.strictEqual(first.body.subtasks[0].state, 'done');
    assert.ok(first.body.subtasks[0].updatedAt);
    assert.strictEqual(first.body.subtasks[1].state, null);

    // Not all done: the child cannot finish it, and no points yet
    const early = await api('POST', `/api/assignments/${assignmentId}/complete`, childToken);
    assert.strictEqual(early.status, 400);

    await api(
      'PUT',
      `/api/assignments/${assignmentId}/subtasks/${task.subtasks[1].id}`,
      childToken,
      {
        state: 'done',
      },
    );
    const done = await api('POST', `/api/assignments/${assignmentId}/complete`, childToken);
    assert.strictEqual(done.status, 200, JSON.stringify(done.body));
    assert.strictEqual(done.body.completion.pointsEarned, 15);
  });

  test('sent with one not possible: a parent approval gives only the done points', async () => {
    const { task, assignmentId } = await createChore([
      { name: 'Re opp sengen', points: 5 },
      { name: 'Rydd pulten', points: 5 },
      { name: 'Støvsug gulvet', points: 10 },
    ]);
    const [bed, , floor] = task.subtasks;
    await api('PUT', `/api/assignments/${assignmentId}/subtasks/${bed.id}`, childToken, {
      state: 'done',
    });
    await api('PUT', `/api/assignments/${assignmentId}/subtasks/${floor.id}`, childToken, {
      state: 'not_possible',
    });

    const sent = await api('POST', `/api/assignments/${assignmentId}/submit`, childToken);
    assert.strictEqual(sent.status, 200, JSON.stringify(sent.body));
    assert.ok(sent.body.submittedAt);
    const again = await api('POST', `/api/assignments/${assignmentId}/submit`, childToken);
    assert.strictEqual(again.body.submittedAt, sent.body.submittedAt);

    // Waiting for a parent: the rows are locked
    const locked = await api(
      'PUT',
      `/api/assignments/${assignmentId}/subtasks/${bed.id}`,
      childToken,
      {
        state: null,
      },
    );
    assert.strictEqual(locked.status, 400);

    const list = await api(
      'GET',
      `/api/households/${householdId}/assignments?date=${today}&days=1`,
      parentToken,
    );
    const row = list.body.assignments.find((a: { id: string }) => a.id === assignmentId);
    assert.ok(row.submittedAt);
    assert.deepStrictEqual(
      row.subtasks.map((s: { state: string | null }) => s.state),
      ['done', null, 'not_possible'],
    );

    const approved = await api('POST', `/api/assignments/${assignmentId}/complete`, parentToken);
    assert.strictEqual(approved.status, 200, JSON.stringify(approved.body));
    assert.strictEqual(approved.body.completion.pointsEarned, 5);
  });

  test('nothing done: the approval gives 0 points', async () => {
    const { assignmentId } = await createChore([
      { name: 'Re opp sengen', points: 5 },
      { name: 'Rydd pulten', points: 15 },
    ]);
    await api('POST', `/api/assignments/${assignmentId}/submit`, childToken);
    const approved = await api('POST', `/api/assignments/${assignmentId}/complete`, parentToken);
    assert.strictEqual(approved.status, 200);
    assert.strictEqual(approved.body.completion.pointsEarned, 0);
  });

  test("another child cannot tick or send someone else's chore", async () => {
    const { task, assignmentId } = await createChore([{ name: 'Re opp sengen', points: 5 }]);
    const tick = await api(
      'PUT',
      `/api/assignments/${assignmentId}/subtasks/${task.subtasks[0].id}`,
      otherChildToken,
      { state: 'done' },
    );
    assert.strictEqual(tick.status, 403);
    const sent = await api('POST', `/api/assignments/${assignmentId}/submit`, otherChildToken);
    assert.strictEqual(sent.status, 403);
  });

  test('a sub-task of another chore is not found on this one', async () => {
    const { assignmentId } = await createChore([{ name: 'Re opp sengen', points: 5 }]);
    const other = await api('POST', `/api/households/${householdId}/tasks`, parentToken, {
      name: 'Annen',
      ruleType: 'daily',
      subtasks: [{ name: 'X', points: 1 }],
    });
    const tick = await api(
      'PUT',
      `/api/assignments/${assignmentId}/subtasks/${other.body.subtasks[0].id}`,
      childToken,
      { state: 'done' },
    );
    assert.strictEqual(tick.status, 404);
  });
});
