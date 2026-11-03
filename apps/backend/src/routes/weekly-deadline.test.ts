import { test, describe, before, after, afterEach } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { build } from '../server.js';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { registerAndLogin } from '../test-helpers/auth.js';
import { todayInTimeZone } from '../services/assignment-scheduler.js';
import { generateAssignments } from '../services/assignment-generator.js';

const MIGRATION = readFileSync(
  new URL('../../../../docker/postgres/migrations/060_weekly_due_day.sql', import.meta.url),
  'utf8',
);

/**
 * Weekly chores have a «Frist» day (ST-2143): one row a week, dated on that day. The child's
 * «I dag» list shows it all week up to the day; «Forfalt» only the day after.
 * Week 45 of 2026: Monday 2 ... Sunday 8 November.
 */
describe('Weekly chore deadline day', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let parentToken: string;
  let childToken: string;
  let householdId: string;
  let childId: string;

  async function api(method: 'GET' | 'POST', url: string, token: string, payload?: object) {
    const response = await app.inject({
      method,
      url,
      headers: { Authorization: `Bearer ${token}` },
      ...(payload && { payload }),
    });
    return { status: response.statusCode, body: JSON.parse(response.body || 'null') };
  }

  async function createTask(ruleType: string, ruleConfig: object) {
    const created = await api('POST', `/api/households/${householdId}/tasks`, parentToken, {
      name: `Tømme oppvaskmaskinen ${ruleType}`,
      points: 5,
      ruleType,
      ruleConfig,
    });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));
    // Rows made for the real today (for every chore in the household) are not part of these
    // fixed-date cases
    await pool.query('DELETE FROM task_assignments WHERE household_id = $1', [householdId]);
    return created.body.id as string;
  }

  async function addRow(taskId: string, date: string, status = 'pending') {
    await pool.query(
      `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [householdId, taskId, childId, date, status],
    );
  }

  async function myDates(query: string): Promise<string[]> {
    const mine = await api('GET', `/api/children/me/tasks?${query}`, childToken);
    assert.strictEqual(mine.status, 200, JSON.stringify(mine.body));
    return mine.body.tasks.map(
      (t: { date: string; ruleType: string }) => `${t.ruleType} ${t.date}`,
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

    const stamp = Date.now();
    const password = 'TestPass123!';
    parentToken = (await registerAndLogin(app, `test-frist-parent-${stamp}@example.com`, password))
      .accessToken;
    const child = await registerAndLogin(app, `test-frist-child-${stamp}@example.com`, password);
    childToken = child.accessToken;

    const household = await api('POST', '/api/households', parentToken, { name: `Frist ${stamp}` });
    householdId = household.body.id;

    const user = await pool.query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [
      `test-frist-child-${stamp}@example.com`,
    ]);
    await pool.query(
      `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'child')`,
      [householdId, user.rows[0].id],
    );
    childId = (
      await pool.query<{ id: string }>(
        `INSERT INTO children (household_id, name, birth_year, user_id)
         VALUES ($1, 'Emma', 2015, $2) RETURNING id`,
        [householdId, user.rows[0].id],
      )
    ).rows[0].id;
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
    await pool.query(`DELETE FROM users WHERE email LIKE 'test-frist-%@example.com'`);
    await pool.end();
    await app.close();
  });

  test('the generator makes one row a week, on the chosen day', async () => {
    const sunday = await createTask('weekly_rotation', {
      rotationType: 'odd_even_week',
      assignedChildren: [childId],
    });
    const wednesday = await createTask('weekly_rotation', {
      rotationType: 'odd_even_week',
      assignedChildren: [childId],
      dueDay: 3,
    });

    await generateAssignments(householdId, new Date('2026-11-04T00:00:00Z'), 14);

    const rows = await pool.query<{ task_id: string; date: string }>(
      `SELECT task_id, date::text FROM task_assignments WHERE household_id = $1 ORDER BY date`,
      [householdId],
    );
    const datesOf = (id: string) => rows.rows.filter((r) => r.task_id === id).map((r) => r.date);
    assert.deepStrictEqual(datesOf(sunday), ['2026-11-08', '2026-11-15']);
    assert.deepStrictEqual(datesOf(wednesday), ['2026-11-04', '2026-11-11']);
  });

  test("the child's «I dag» list shows the week's chore from Monday to the deadline day", async () => {
    const weekly = await createTask('weekly_rotation', {
      rotationType: 'odd_even_week',
      assignedChildren: [childId],
    });
    const daily = await createTask('daily', { assignedChildren: [childId] });
    await addRow(weekly, '2026-11-08');
    await addRow(daily, '2026-11-05');

    // Monday and Wednesday: due Sunday, so it is on today's list
    assert.deepStrictEqual(await myDates('date=2026-11-02&week=true'), [
      'weekly_rotation 2026-11-08',
    ]);
    assert.deepStrictEqual(await myDates('date=2026-11-04&week=true'), [
      'weekly_rotation 2026-11-08',
    ]);
    // A daily chore stays on its own day: Wednesday's list did not show Thursday's, Thursday's does
    assert.deepStrictEqual((await myDates('date=2026-11-05&week=true')).sort(), [
      'daily 2026-11-05',
      'weekly_rotation 2026-11-08',
    ]);
    // The deadline day itself
    assert.deepStrictEqual(await myDates('date=2026-11-08&week=true'), [
      'weekly_rotation 2026-11-08',
    ]);
    // Monday after: a new week, last week's row is not on today's list
    assert.deepStrictEqual(await myDates('date=2026-11-09&week=true'), []);
  });

  test('«Forfalt» reads one exact day: the deadline day, the day after it', async () => {
    const weekly = await createTask('weekly_rotation', {
      rotationType: 'odd_even_week',
      assignedChildren: [childId],
    });
    await addRow(weekly, '2026-11-08');

    // The overdue list asks for yesterday without week: Saturday's ask does not see Sunday's row
    assert.deepStrictEqual(await myDates('date=2026-11-07'), []);
    // On Monday it asks for Sunday: the forgotten week shows as «Forfalt i går»
    assert.deepStrictEqual(await myDates('date=2026-11-08'), ['weekly_rotation 2026-11-08']);
    // On Tuesday it asks for Monday: gone
    assert.deepStrictEqual(await myDates('date=2026-11-09'), []);
  });

  test("Oslo midnight decides the day, not the server's UTC day", () => {
    // Sunday 23:59 in Oslo (UTC+1 in November) is still Sunday: the chore is «Frist i dag»
    assert.strictEqual(
      todayInTimeZone(new Date('2026-11-08T22:59:00Z')).toISOString().slice(0, 10),
      '2026-11-08',
    );
    // Monday 00:30 in Oslo, though UTC is still Sunday: the row is now yesterday, «Forfalt»
    assert.strictEqual(
      todayInTimeZone(new Date('2026-11-08T23:30:00Z')).toISOString().slice(0, 10),
      '2026-11-09',
    );
  });

  test('migration 060: existing weekly chores get Sunday and keep one row a week', async () => {
    // Old weekly chores were saved without dueDay and made a row every day
    const insertOld = async (name: string) =>
      (
        await pool.query<{ id: string }>(
          `INSERT INTO tasks (household_id, name, points, rule_type, rule_config, active)
           VALUES ($1, $2, 5, 'weekly_rotation', $3, true) RETURNING id`,
          [householdId, name, { rotationType: 'odd_even_week', assignedChildren: [childId] }],
        )
      ).rows[0].id;
    const open = await insertOld('Old weekly');
    const doneWeek = await insertOld('Old weekly, done this week');

    // Next week, so every row is on or after CURRENT_DATE - 1 whatever day the test runs
    const { rows } = await pool.query<{ d: string }>(
      `SELECT (date_trunc('week', CURRENT_DATE) + interval '7 days')::date::text AS d`,
    );
    const day = (offset: number) => {
      const date = new Date(`${rows[0].d}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + offset);
      return date.toISOString().slice(0, 10);
    };
    for (let i = 0; i < 7; i++) await addRow(open, day(i));
    await pool.query(
      `UPDATE task_assignments SET submitted_at = NOW() WHERE task_id = $1 AND date = $2`,
      [open, day(1)],
    );
    await addRow(doneWeek, day(0), 'completed');
    await addRow(doneWeek, day(6));

    await pool.query(MIGRATION);
    await pool.query(MIGRATION); // safe to run again

    const config = await pool.query(`SELECT rule_config FROM tasks WHERE id = ANY($1)`, [
      [open, doneWeek],
    ]);
    for (const row of config.rows) assert.strictEqual(row.rule_config.dueDay, 0);

    const left = await pool.query<{ task_id: string; date: string; status: string }>(
      `SELECT task_id, date::text, status FROM task_assignments WHERE task_id = ANY($1) ORDER BY date`,
      [[open, doneWeek]],
    );
    const of = (id: string) =>
      left.rows.filter((r) => r.task_id === id).map((r) => `${r.date} ${r.status}`);
    // The Sunday row stays, and so does the row the child already sent for approval
    assert.deepStrictEqual(of(open), [`${day(1)} pending`, `${day(6)} pending`]);
    // A week ticked off under the old rows is done: no new open row that week
    assert.deepStrictEqual(of(doneWeek), [`${day(0)} completed`]);
  });
});
