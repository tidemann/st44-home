import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { registerAndLogin } from '../test-helpers/auth.ts';
import { generateTestEmail } from '../test-helpers/fixtures.ts';

/**
 * Child invitation API tests (ST-1678)
 *
 * - GET/POST/DELETE /api/households/:householdId/children/:childId/invitation (parent)
 * - GET /api/child-invitations/:token (public)
 * - POST /api/child-invitations/:token/accept (public)
 */
describe('Child invitation API', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let parentToken: string;
  let parentId: string;
  let outsiderToken: string;
  let outsiderId: string;
  let householdId: string;
  const childUserEmails: string[] = [];

  async function addChild(name: string): Promise<string> {
    const response = await app.inject({
      method: 'POST',
      url: `/api/households/${householdId}/children`,
      headers: { Authorization: `Bearer ${parentToken}` },
      payload: { name, birthYear: 2014 },
    });
    assert.strictEqual(response.statusCode, 201, response.body);
    return JSON.parse(response.body).id;
  }

  async function invite(childId: string, email: string) {
    return app.inject({
      method: 'POST',
      url: `/api/households/${householdId}/children/${childId}/invitation`,
      headers: { Authorization: `Bearer ${parentToken}` },
      payload: { email },
    });
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

    const parentEmail = generateTestEmail('cinv-parent');
    const outsiderEmail = generateTestEmail('cinv-outsider');
    parentToken = (await registerAndLogin(app, parentEmail, 'TestPass123!')).accessToken;
    outsiderToken = (await registerAndLogin(app, outsiderEmail, 'TestPass123!')).accessToken;
    parentId = (await pool.query('SELECT id FROM users WHERE email = $1', [parentEmail])).rows[0]
      .id;
    outsiderId = (await pool.query('SELECT id FROM users WHERE email = $1', [outsiderEmail]))
      .rows[0].id;

    const householdResponse = await app.inject({
      method: 'POST',
      url: '/api/households',
      headers: { Authorization: `Bearer ${parentToken}` },
      payload: { name: `Child Invite Household ${Date.now()}` },
    });
    householdId = JSON.parse(householdResponse.body).id;
  });

  after(async () => {
    await pool.query('DELETE FROM invitations WHERE household_id = $1', [householdId]);
    await pool.query('DELETE FROM children WHERE household_id = $1', [householdId]);
    await pool.query('DELETE FROM household_members WHERE household_id = $1', [householdId]);
    await pool.query('DELETE FROM households WHERE id = $1', [householdId]);
    if (childUserEmails.length > 0) {
      await pool.query('DELETE FROM users WHERE email = ANY($1)', [childUserEmails]);
    }
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [parentId, outsiderId]);
    await pool.end();
    await app.close();
  });

  test('no invitation yet reads as null', async () => {
    const childId = await addChild('Ingen');
    const response = await app.inject({
      method: 'GET',
      url: `/api/households/${householdId}/children/${childId}/invitation`,
      headers: { Authorization: `Bearer ${parentToken}` },
    });
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(JSON.parse(response.body).invitation, null);
  });

  test('a parent makes a 7-day link tied to the child', async () => {
    const childId = await addChild('Mathea');
    const email = generateTestEmail('cinv-mathea');
    const response = await invite(childId, email.toUpperCase());
    assert.strictEqual(response.statusCode, 201, response.body);
    const { invitation } = JSON.parse(response.body);
    assert.strictEqual(invitation.email, email.toLowerCase());
    assert.strictEqual(invitation.status, 'pending');
    assert.match(invitation.token, /^[0-9a-f]{64}$/);
    const days = (new Date(invitation.expiresAt).getTime() - Date.now()) / 86_400_000;
    assert.ok(days > 6.9 && days <= 7.01, `expires in ${days} days`);

    const row = await pool.query('SELECT role, child_id FROM invitations WHERE id = $1', [
      invitation.id,
    ]);
    assert.strictEqual(row.rows[0].role, 'child');
    assert.strictEqual(row.rows[0].child_id, childId);
  });

  test('a wrong e-mail is refused', async () => {
    const childId = await addChild('Feil');
    const response = await invite(childId, 'mathea@eksempel');
    assert.strictEqual(response.statusCode, 400);
  });

  test('someone outside the household cannot invite', async () => {
    const childId = await addChild('Utenfor');
    const response = await app.inject({
      method: 'POST',
      url: `/api/households/${householdId}/children/${childId}/invitation`,
      headers: { Authorization: `Bearer ${outsiderToken}` },
      payload: { email: generateTestEmail('cinv-x') },
    });
    assert.strictEqual(response.statusCode, 403);
  });

  test('«Lag ny lenke» kills the old link', async () => {
    const childId = await addChild('Ny lenke');
    const email = generateTestEmail('cinv-renew');
    const first = JSON.parse((await invite(childId, email)).body).invitation;
    const second = JSON.parse((await invite(childId, email)).body).invitation;
    assert.notStrictEqual(first.token, second.token);

    const old = await app.inject({ method: 'GET', url: `/api/child-invitations/${first.token}` });
    assert.strictEqual(JSON.parse(old.body).state, 'cancelled');
    const live = await app.inject({ method: 'GET', url: `/api/child-invitations/${second.token}` });
    assert.strictEqual(JSON.parse(live.body).state, 'valid');
  });

  test('cancelling stops the link and touches nothing else', async () => {
    const childId = await addChild('Avbryt');
    const { token } = JSON.parse(
      (await invite(childId, generateTestEmail('cinv-cancel'))).body,
    ).invitation;
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/households/${householdId}/children/${childId}/invitation`,
      headers: { Authorization: `Bearer ${parentToken}` },
    });
    assert.strictEqual(response.statusCode, 204);

    const page = await app.inject({ method: 'GET', url: `/api/child-invitations/${token}` });
    const body = JSON.parse(page.body);
    assert.strictEqual(body.state, 'cancelled');
    assert.strictEqual(body.childName, undefined);

    const child = await pool.query('SELECT name, user_id FROM children WHERE id = $1', [childId]);
    assert.strictEqual(child.rows[0].name, 'Avbryt');
    assert.strictEqual(child.rows[0].user_id, null);

    const accept = await app.inject({
      method: 'POST',
      url: `/api/child-invitations/${token}/accept`,
      payload: { password: 'Passord123' },
    });
    assert.strictEqual(accept.statusCode, 410);
  });

  test('an expired link reads as expired and cannot be used', async () => {
    const childId = await addChild('Utløpt');
    const { id, token } = JSON.parse(
      (await invite(childId, generateTestEmail('cinv-expired'))).body,
    ).invitation;
    await pool.query(
      `UPDATE invitations SET created_at = NOW() - INTERVAL '8 days',
         expires_at = NOW() - INTERVAL '1 day' WHERE id = $1`,
      [id],
    );

    const parentView = await app.inject({
      method: 'GET',
      url: `/api/households/${householdId}/children/${childId}/invitation`,
      headers: { Authorization: `Bearer ${parentToken}` },
    });
    assert.strictEqual(JSON.parse(parentView.body).invitation.status, 'expired');

    const page = await app.inject({ method: 'GET', url: `/api/child-invitations/${token}` });
    assert.strictEqual(JSON.parse(page.body).state, 'expired');

    const accept = await app.inject({
      method: 'POST',
      url: `/api/child-invitations/${token}/accept`,
      payload: { password: 'Passord123' },
    });
    assert.strictEqual(accept.statusCode, 410);
  });

  test('the child sets a password, logs in, and keeps the same child row', async () => {
    const childId = await addChild('Emma');
    const email = generateTestEmail('cinv-emma');
    childUserEmails.push(email.toLowerCase());
    const { token } = JSON.parse((await invite(childId, email)).body).invitation;

    const pointsBefore = await pool.query(
      'SELECT COALESCE(points_balance, 0)::int AS p FROM child_points_balance WHERE child_id = $1',
      [childId],
    );

    const page = await app.inject({ method: 'GET', url: `/api/child-invitations/${token}` });
    const info = JSON.parse(page.body);
    assert.strictEqual(info.state, 'valid');
    assert.strictEqual(info.childName, 'Emma');
    assert.strictEqual(info.email, email.toLowerCase());
    assert.strictEqual(typeof info.points, 'number');

    const short = await app.inject({
      method: 'POST',
      url: `/api/child-invitations/${token}/accept`,
      payload: { password: 'kort' },
    });
    assert.strictEqual(short.statusCode, 400);

    const accept = await app.inject({
      method: 'POST',
      url: `/api/child-invitations/${token}/accept`,
      payload: { password: 'Passord123' },
    });
    assert.strictEqual(accept.statusCode, 200, accept.body);
    assert.strictEqual(JSON.parse(accept.body).email, email.toLowerCase());

    const child = await pool.query(
      `SELECT c.id, c.user_id, hm.role FROM children c
       JOIN household_members hm ON hm.user_id = c.user_id AND hm.household_id = c.household_id
       WHERE c.id = $1`,
      [childId],
    );
    assert.strictEqual(child.rows.length, 1);
    assert.strictEqual(child.rows[0].role, 'child');
    const pointsAfter = await pool.query(
      'SELECT COALESCE(points_balance, 0)::int AS p FROM child_points_balance WHERE child_id = $1',
      [childId],
    );
    assert.deepStrictEqual(pointsAfter.rows, pointsBefore.rows);

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: email.toLowerCase(), password: 'Passord123' },
    });
    assert.strictEqual(login.statusCode, 200, login.body);
    assert.strictEqual(JSON.parse(login.body).role, 'child');

    const used = await app.inject({ method: 'GET', url: `/api/child-invitations/${token}` });
    assert.strictEqual(JSON.parse(used.body).state, 'used');
    const again = await app.inject({
      method: 'POST',
      url: `/api/child-invitations/${token}/accept`,
      payload: { password: 'Passord123' },
    });
    assert.strictEqual(again.statusCode, 410);

    const parentView = await app.inject({
      method: 'GET',
      url: `/api/households/${householdId}/children/${childId}/invitation`,
      headers: { Authorization: `Bearer ${parentToken}` },
    });
    const accepted = JSON.parse(parentView.body).invitation;
    assert.strictEqual(accepted.status, 'accepted');
    assert.ok(accepted.acceptedAt);

    const blocked = await invite(childId, generateTestEmail('cinv-emma2'));
    assert.strictEqual(blocked.statusCode, 409);
  });

  test('an unknown token is 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/child-invitations/${'0'.repeat(64)}`,
    });
    assert.strictEqual(response.statusCode, 404);
  });
});
