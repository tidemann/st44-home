import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { registerAndLogin } from '../test-helpers/auth.ts';

/**
 * «Etter tur» chores (ST-2075): the turn, the tick and the scan, undo, history, moving by hand
 */

describe('«Etter tur» chores (ST-2075)', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let parentToken: string;
  let emmaToken: string;
  let jonasToken: string;
  let outsiderToken: string;
  const userIds: string[] = [];
  let householdId: string;
  let emma: string;
  let jonas: string;
  let mathea: string;
  let taskId: string;
  let scanCode: string;

  const stamp = Date.now();
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function turns(token: string) {
    const res = await app.inject({
      method: 'GET',
      url: `/api/households/${householdId}/turns`,
      headers: auth(token),
    });
    assert.strictEqual(res.statusCode, 200, res.body);
    return JSON.parse(res.body).turns as Array<{
      taskId: string;
      assignmentId: string | null;
      turnChildId: string | null;
      order: Array<{ childId: string; name: string }>;
      scanCode: string | null;
    }>;
  }

  async function turnOf(token: string = parentToken) {
    const turn = (await turns(token)).find((t) => t.taskId === taskId);
    assert.ok(turn, 'the chore is in the turns list');
    return turn;
  }

  async function balance(childId: string): Promise<number> {
    const res = await pool.query(
      'SELECT points_balance FROM child_points_balance WHERE child_id = $1',
      [childId],
    );
    return Number(res.rows[0]?.points_balance ?? 0);
  }

  async function signUpChild(name: string, childId: string): Promise<string> {
    const email = `turns-${name.toLowerCase()}-${stamp}@example.com`;
    const data = await registerAndLogin(app, email, 'TestPass123!');
    const user = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    userIds.push(user.rows[0].id);
    await pool.query(
      `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'child')`,
      [householdId, user.rows[0].id],
    );
    await pool.query('UPDATE children SET user_id = $1 WHERE id = $2', [user.rows[0].id, childId]);
    return data.accessToken;
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

    const parentEmail = `turns-parent-${stamp}@example.com`;
    parentToken = (await registerAndLogin(app, parentEmail, 'TestPass123!')).accessToken;
    userIds.push(
      (await pool.query('SELECT id FROM users WHERE email = $1', [parentEmail])).rows[0].id,
    );
    const outsiderEmail = `turns-outsider-${stamp}@example.com`;
    outsiderToken = (await registerAndLogin(app, outsiderEmail, 'TestPass123!')).accessToken;
    userIds.push(
      (await pool.query('SELECT id FROM users WHERE email = $1', [outsiderEmail])).rows[0].id,
    );

    const hh = await app.inject({
      method: 'POST',
      url: '/api/households',
      headers: auth(parentToken),
      payload: { name: `Turns ${stamp}` },
    });
    householdId = JSON.parse(hh.body).id;

    const child = async (name: string) =>
      (
        await pool.query(
          `INSERT INTO children (household_id, name, birth_year) VALUES ($1, $2, 2015) RETURNING id`,
          [householdId, name],
        )
      ).rows[0].id as string;
    emma = await child('Emma');
    jonas = await child('Jonas');
    mathea = await child('Mathea');
    emmaToken = await signUpChild('Emma', emma);
    jonasToken = await signUpChild('Jonas', jonas);
  });

  after(async () => {
    await pool.query('DELETE FROM households WHERE id = $1', [householdId]);
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [userIds]);
    await pool.end();
    await app.close();
  });

  test('a parent makes the chore: the first child has the turn, and it has a code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/households/${householdId}/tasks`,
      headers: auth(parentToken),
      payload: {
        name: 'Tømme oppvaskmaskinen',
        points: 5,
        ruleType: 'next_in_line',
        ruleConfig: { assignedChildren: [emma, jonas, mathea] },
      },
    });
    assert.strictEqual(res.statusCode, 201, res.body);
    const task = JSON.parse(res.body);
    taskId = task.id;
    scanCode = task.scanCode;
    assert.match(scanCode, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);

    const turn = await turnOf();
    assert.strictEqual(turn.turnChildId, emma);
    assert.deepStrictEqual(
      turn.order.map((c) => c.name),
      ['Emma', 'Jonas', 'Mathea'],
    );
    assert.strictEqual(turn.scanCode, scanCode);
  });

  test('one child is not enough for a turn order', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/households/${householdId}/tasks`,
      headers: auth(parentToken),
      payload: {
        name: 'Alone',
        ruleType: 'next_in_line',
        ruleConfig: { assignedChildren: [emma] },
      },
    });
    assert.strictEqual(res.statusCode, 400);
  });

  test('the child home gets the turns and which child is signed in', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/children/me/turns',
      headers: auth(jonasToken),
    });
    assert.strictEqual(res.statusCode, 200, res.body);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.myChildId, jonas);
    assert.strictEqual(body.turns[0].turnChildId, emma);
    assert.strictEqual(body.turns[0].scanCode, null);

    const parent = await app.inject({
      method: 'GET',
      url: '/api/children/me/turns',
      headers: auth(parentToken),
    });
    assert.strictEqual(parent.statusCode, 404);
  });

  test('children see whose turn it is, but not the code', async () => {
    const turn = await turnOf(jonasToken);
    assert.strictEqual(turn.turnChildId, emma);
    assert.strictEqual(turn.scanCode, null);
  });

  test('the open turn is not a dated chore in the day lists', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/households/${householdId}/assignments?days=7`,
      headers: auth(parentToken),
    });
    const rows = JSON.parse(res.body).assignments as Array<{ taskId: string }>;
    assert.strictEqual(rows.filter((r) => r.taskId === taskId).length, 0);
  });

  test('another child cannot tick it; a scan by them says whose turn it is and changes nothing', async () => {
    const { assignmentId } = await turnOf();
    const tick = await app.inject({
      method: 'POST',
      url: `/api/assignments/${assignmentId}/complete`,
      headers: auth(jonasToken),
    });
    assert.strictEqual(tick.statusCode, 403);

    const scan = await app.inject({
      method: 'POST',
      url: `/api/scan/${scanCode.toLowerCase()}`,
      headers: auth(jonasToken),
    });
    assert.strictEqual(scan.statusCode, 200, scan.body);
    assert.deepStrictEqual(JSON.parse(scan.body), {
      result: 'not_your_turn',
      taskId,
      taskName: 'Tømme oppvaskmaskinen',
      points: 5,
      turnChildName: 'Emma',
      youAreNext: true,
    });
    assert.strictEqual((await turnOf()).turnChildId, emma);
  });

  test('the tick: done, points given, the turn moves to the next child', async () => {
    const { assignmentId } = await turnOf();
    const res = await app.inject({
      method: 'POST',
      url: `/api/assignments/${assignmentId}/complete`,
      headers: auth(emmaToken),
    });
    assert.strictEqual(res.statusCode, 200, res.body);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.completion.pointsEarned, 5);
    assert.deepStrictEqual(body.turn, { nextChildName: 'Jonas' });
    assert.strictEqual(await balance(emma), 5);
    assert.strictEqual((await turnOf()).turnChildId, jonas);
  });

  test('«Angre» takes the turn back', async () => {
    const done = await pool.query(
      `SELECT id FROM task_assignments WHERE task_id = $1 AND status = 'completed'`,
      [taskId],
    );
    const res = await app.inject({
      method: 'POST',
      url: `/api/assignments/${done.rows[0].id}/uncomplete`,
      headers: auth(emmaToken),
    });
    assert.strictEqual(res.statusCode, 200, res.body);
    assert.strictEqual(await balance(emma), 0);
    const turn = await turnOf();
    assert.strictEqual(turn.turnChildId, emma);
    assert.strictEqual(turn.assignmentId, done.rows[0].id);
  });

  test('the scan by the child whose turn it is does what the tick does', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/scan/${scanCode}`,
      headers: auth(emmaToken),
    });
    assert.strictEqual(res.statusCode, 200, res.body);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.result, 'done');
    assert.strictEqual(body.pointsEarned, 5);
    assert.strictEqual(body.nextChildName, 'Jonas');
    assert.strictEqual(await balance(emma), 5);
    assert.strictEqual((await turnOf()).turnChildId, jonas);

    // A second tap of the sticker answers with the same scan, it does not say "Jonas' turn"
    const again = await app.inject({
      method: 'POST',
      url: `/api/scan/${scanCode}`,
      headers: auth(emmaToken),
    });
    assert.strictEqual(JSON.parse(again.body).result, 'done');
    assert.strictEqual(await balance(emma), 5);
  });

  test('the code shows its chore name without sign-in; strangers get 404', async () => {
    const info = await app.inject({ method: 'GET', url: `/api/scan/${scanCode}` });
    assert.deepStrictEqual(JSON.parse(info.body), { taskName: 'Tømme oppvaskmaskinen' });
    const junk = await app.inject({ method: 'GET', url: '/api/scan/0000' });
    assert.strictEqual(junk.statusCode, 404);
    const stranger = await app.inject({
      method: 'POST',
      url: `/api/scan/${scanCode}`,
      headers: auth(outsiderToken),
    });
    assert.strictEqual(stranger.statusCode, 404);
    const unsigned = await app.inject({ method: 'POST', url: `/api/scan/${scanCode}` });
    assert.strictEqual(unsigned.statusCode, 401);
  });

  test('a parent moves the turn by hand; children cannot', async () => {
    const byChild = await app.inject({
      method: 'POST',
      url: `/api/households/${householdId}/tasks/${taskId}/turn`,
      headers: auth(jonasToken),
      payload: { childId: mathea },
    });
    assert.strictEqual(byChild.statusCode, 403);

    const res = await app.inject({
      method: 'POST',
      url: `/api/households/${householdId}/tasks/${taskId}/turn`,
      headers: auth(parentToken),
      payload: { childId: mathea },
    });
    assert.strictEqual(res.statusCode, 200, res.body);
    assert.strictEqual(JSON.parse(res.body).turnChildId, mathea);
  });

  test('the history says who, when and how, newest first', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/households/${householdId}/tasks/${taskId}/turn-history`,
      headers: auth(parentToken),
    });
    assert.strictEqual(res.statusCode, 200, res.body);
    const history = JSON.parse(res.body).history as Array<{
      kind: string;
      childName: string;
      points: number;
    }>;
    assert.deepStrictEqual(
      history.map((h) => [h.kind, h.childName, h.points]),
      [
        ['moved', 'Jonas', 0],
        ['scan', 'Emma', 5],
      ],
    );

    const byChild = await app.inject({
      method: 'GET',
      url: `/api/households/${householdId}/tasks/${taskId}/turn-history`,
      headers: auth(emmaToken),
    });
    assert.strictEqual(byChild.statusCode, 403);
  });

  test('the turn comes back to the same child on the same day without a clash', async () => {
    // Mathea is not signed up, so a parent ticks for her; then Emma's turn again today
    let turn = await turnOf();
    await app.inject({
      method: 'POST',
      url: `/api/assignments/${turn.assignmentId}/complete`,
      headers: auth(parentToken),
    });
    turn = await turnOf();
    assert.strictEqual(turn.turnChildId, emma);
    const res = await app.inject({
      method: 'POST',
      url: `/api/assignments/${turn.assignmentId}/complete`,
      headers: auth(emmaToken),
    });
    assert.strictEqual(res.statusCode, 200, res.body);
    assert.strictEqual(await balance(emma), 10);
    assert.strictEqual((await turnOf()).turnChildId, jonas);
  });

  test('a saved order gives the turn to the top child («Den øverste har turen nå»)', async () => {
    const moves = async () =>
      (
        await pool.query(`SELECT count(*)::int AS n FROM task_turn_moves WHERE task_id = $1`, [
          taskId,
        ])
      ).rows[0].n as number;
    const save = (order: string[]) =>
      app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}/tasks/${taskId}`,
        headers: auth(parentToken),
        payload: { ruleType: 'next_in_line', ruleConfig: { assignedChildren: order } },
      });

    // Jonas has the turn and is taken out: Mathea, on top, gets it, and the history says so
    const before = await moves();
    const res = await save([mathea, emma]);
    assert.strictEqual(res.statusCode, 200, res.body);
    assert.strictEqual((await turnOf()).turnChildId, mathea);
    assert.strictEqual(await moves(), before + 1);
    const open = await pool.query(
      `SELECT count(*)::int AS n FROM task_assignments WHERE task_id = $1 AND status = 'pending'`,
      [taskId],
    );
    assert.strictEqual(open.rows[0].n, 1);

    // Saving again with the same child on top (a name change, say) changes nothing
    await save([mathea, emma]);
    assert.strictEqual((await turnOf()).turnChildId, mathea);
    assert.strictEqual(await moves(), before + 1);
  });
});
