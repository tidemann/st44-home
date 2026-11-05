import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { registerAndLogin } from '../test-helpers/auth.ts';
import { generateTestEmail } from '../test-helpers/fixtures.ts';
import { generateAccessToken } from '../utils/jwt.ts';

/**
 * ST-2227 — an existing Google-backed account accepts a child invitation.
 *
 * - GET  /api/child-invitations/:token/existing        (logged in, read only)
 * - POST /api/child-invitations/:token/accept-existing (logged in, { consent: true })
 *
 * Covers: strict e-mail match, Google-only, consent, household-scoped child rights,
 * preservation of the child row and of unrelated memberships, conflicts, dead links,
 * inviter revalidation, rollback and concurrent presses.
 */
describe('Child invitation — existing Google account', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let parentToken: string;
  let parentId: string;
  let familyId: string;
  const userIds: string[] = [];
  const householdIds: string[] = [];

  /** A Google-backed user made straight in the database, with a token like a real login */
  async function googleUser(email: string) {
    const result = await pool.query(
      `INSERT INTO users (email, oauth_provider, oauth_provider_id, first_name)
       VALUES ($1, 'google', $2, 'Jonas') RETURNING id`,
      [email, `g-${crypto.randomBytes(8).toString('hex')}`],
    );
    const id = result.rows[0].id as string;
    userIds.push(id);
    return { id, email, token: generateAccessToken(id, email) };
  }

  /** The user's own household where they are admin (the «Jonas sin husstand» case) */
  async function ownHousehold(token: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/households',
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: `Own ${Date.now()}` },
    });
    assert.strictEqual(response.statusCode, 201, response.body);
    const id = JSON.parse(response.body).id as string;
    householdIds.push(id);
    return id;
  }

  async function addChild(name: string): Promise<string> {
    const response = await app.inject({
      method: 'POST',
      url: `/api/households/${familyId}/children`,
      headers: { Authorization: `Bearer ${parentToken}` },
      payload: { name, birthYear: 2012 },
    });
    assert.strictEqual(response.statusCode, 201, response.body);
    return JSON.parse(response.body).id;
  }

  async function invite(childId: string, email: string): Promise<string> {
    const response = await app.inject({
      method: 'POST',
      url: `/api/households/${familyId}/children/${childId}/invitation`,
      headers: { Authorization: `Bearer ${parentToken}` },
      payload: { email },
    });
    assert.strictEqual(response.statusCode, 201, response.body);
    return JSON.parse(response.body).invitation.token;
  }

  function accept(token: string, auth: string, consent: unknown = true) {
    return app.inject({
      method: 'POST',
      url: `/api/child-invitations/${token}/accept-existing`,
      headers: { Authorization: `Bearer ${auth}` },
      payload: { consent },
    });
  }

  async function snapshot(userId: string, childId: string) {
    const members = await pool.query(
      'SELECT household_id, role FROM household_members WHERE user_id = $1 ORDER BY household_id',
      [userId],
    );
    const child = await pool.query('SELECT user_id FROM children WHERE id = $1', [childId]);
    const user = await pool.query(
      'SELECT email, oauth_provider, oauth_provider_id FROM users WHERE id = $1',
      [userId],
    );
    return { members: members.rows, child: child.rows[0], user: user.rows[0] };
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

    const parentEmail = generateTestEmail('cex-parent');
    parentToken = (await registerAndLogin(app, parentEmail, 'TestPass123!')).accessToken;
    parentId = (await pool.query('SELECT id FROM users WHERE email = $1', [parentEmail])).rows[0]
      .id;
    userIds.push(parentId);
    const response = await app.inject({
      method: 'POST',
      url: '/api/households',
      headers: { Authorization: `Bearer ${parentToken}` },
      payload: { name: `Familien Nordmann ${Date.now()}` },
    });
    familyId = JSON.parse(response.body).id;
    householdIds.push(familyId);
  });

  after(async () => {
    await pool.query('DELETE FROM invitations WHERE household_id = ANY($1)', [householdIds]);
    await pool.query('DELETE FROM children WHERE household_id = ANY($1)', [householdIds]);
    await pool.query('DELETE FROM household_members WHERE household_id = ANY($1)', [householdIds]);
    await pool.query('DELETE FROM households WHERE id = ANY($1)', [householdIds]);
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [userIds]);
    await pool.end();
    await app.close();
  });

  test('admin elsewhere becomes child here; profile, points and other household kept', async () => {
    // Mixed case on the account: the match ignores case
    const jonas = await googleUser(generateTestEmail('Cex-Jonas').replace('@example', '@Example'));
    const ownId = await ownHousehold(jonas.token);
    const childId = await addChild('Jonas');
    // History and points on the profile: one done chore worth 34
    const task = await pool.query(
      `INSERT INTO tasks (household_id, name, description, points, rule_type, active)
       VALUES ($1, 'Rydde', '', 34, 'daily', true) RETURNING id`,
      [familyId],
    );
    const assignment = await pool.query(
      `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
       VALUES ($1, $2, $3, CURRENT_DATE, 'completed') RETURNING id`,
      [familyId, task.rows[0].id, childId],
    );
    await pool.query(
      `INSERT INTO task_completions (household_id, task_assignment_id, child_id, points_earned, completed_at)
       VALUES ($1, $2, $3, 34, NOW())`,
      [familyId, assignment.rows[0].id, childId],
    );
    const pointsBefore = await pool.query(
      'SELECT COALESCE(points_balance, 0)::int AS p FROM child_points_balance WHERE child_id = $1',
      [childId],
    );
    const token = await invite(childId, jonas.email.toLowerCase());
    const usersBefore = (await pool.query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n;
    const householdsBefore = (await pool.query('SELECT COUNT(*)::int AS n FROM households')).rows[0]
      .n;
    const before = await snapshot(jonas.id, childId);

    const check = await app.inject({
      method: 'GET',
      url: `/api/child-invitations/${token}/existing`,
      headers: { Authorization: `Bearer ${jonas.token}` },
    });
    assert.strictEqual(check.statusCode, 200, check.body);
    assert.strictEqual(JSON.parse(check.body).childName, 'Jonas');
    assert.strictEqual(JSON.parse(check.body).role, 'child');

    // Consent must be explicit
    const noConsent = await accept(token, jonas.token, undefined);
    assert.strictEqual(noConsent.statusCode, 400);
    assert.deepStrictEqual(await snapshot(jonas.id, childId), before);

    const response = await accept(token, jonas.token);
    assert.strictEqual(response.statusCode, 200, response.body);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.householdId, familyId);
    assert.strictEqual(body.childId, childId);
    assert.strictEqual(body.role, 'child');

    const after = await snapshot(jonas.id, childId);
    assert.strictEqual(after.child.user_id, jonas.id, 'the same children row is linked');
    assert.deepStrictEqual(after.user, before.user, 'identity and Google subject unchanged');
    const roles = Object.fromEntries(after.members.map((m) => [m.household_id, m.role]));
    assert.strictEqual(roles[familyId], 'child');
    assert.strictEqual(roles[ownId], 'admin', 'unrelated admin role kept');
    assert.strictEqual(after.members.length, before.members.length + 1);
    assert.strictEqual(
      (await pool.query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n,
      usersBefore,
      'no account made',
    );
    assert.strictEqual(
      (await pool.query('SELECT COUNT(*)::int AS n FROM households')).rows[0].n,
      householdsBefore,
      'no household made',
    );
    const pointsAfter = await pool.query(
      'SELECT COALESCE(points_balance, 0)::int AS p FROM child_points_balance WHERE child_id = $1',
      [childId],
    );
    assert.deepStrictEqual(pointsAfter.rows, pointsBefore.rows, 'points unchanged');
    assert.strictEqual(pointsAfter.rows[0].p, 34);
    const history = await pool.query(
      'SELECT COUNT(*)::int AS n FROM task_completions WHERE child_id = $1',
      [childId],
    );
    assert.strictEqual(history.rows[0].n, 1, 'history kept');

    // Child rights only in the family: no invitations, no sibling management
    const manage = await app.inject({
      method: 'GET',
      url: `/api/households/${familyId}/children/${childId}/invitation`,
      headers: { Authorization: `Bearer ${jonas.token}` },
    });
    assert.strictEqual(manage.statusCode, 403);
    const sibling = await app.inject({
      method: 'POST',
      url: `/api/households/${familyId}/children`,
      headers: { Authorization: `Bearer ${jonas.token}` },
      payload: { name: 'Søsken', birthYear: 2015 },
    });
    assert.strictEqual(sibling.statusCode, 403);
    const adultInvite = await app.inject({
      method: 'POST',
      url: `/api/households/${familyId}/invitations`,
      headers: { Authorization: `Bearer ${jonas.token}` },
      payload: { email: generateTestEmail('cex-x'), role: 'parent' },
    });
    assert.strictEqual(adultInvite.statusCode, 403);

    // Admin rights stay in the own household only
    const ownChild = await app.inject({
      method: 'POST',
      url: `/api/households/${ownId}/children`,
      headers: { Authorization: `Bearer ${jonas.token}` },
      payload: { name: 'Eget barn', birthYear: 2016 },
    });
    assert.strictEqual(ownChild.statusCode, 201, ownChild.body);

    // Replay: the link is spent and nothing changes
    const replay = await accept(token, jonas.token);
    assert.strictEqual(replay.statusCode, 410);
    assert.strictEqual(JSON.parse(replay.body).code, 'USED');
  });

  test('a different signed-in account is refused and nothing changes', async () => {
    const other = await googleUser(generateTestEmail('cex-other'));
    const childId = await addChild('Feil');
    const token = await invite(childId, generateTestEmail('cex-right'));
    const before = await snapshot(other.id, childId);
    const response = await accept(token, other.token);
    assert.strictEqual(response.statusCode, 403);
    assert.strictEqual(JSON.parse(response.body).code, 'WRONG_ACCOUNT');
    assert.deepStrictEqual(await snapshot(other.id, childId), before);
    const status = await pool.query('SELECT status FROM invitations WHERE token = $1', [token]);
    assert.strictEqual(status.rows[0].status, 'pending', 'the link is not spent');
  });

  test('a password-only account with the right e-mail is refused', async () => {
    const email = generateTestEmail('cex-pw');
    const login = await registerAndLogin(app, email, 'TestPass123!');
    const id = (await pool.query('SELECT id FROM users WHERE email = $1', [email])).rows[0].id;
    userIds.push(id);
    const childId = await addChild('Passord');
    const token = await invite(childId, email);
    const response = await accept(token, login.accessToken);
    assert.strictEqual(response.statusCode, 403);
    assert.strictEqual(JSON.parse(response.body).code, 'NOT_GOOGLE');
    assert.strictEqual((await snapshot(id, childId)).child.user_id, null);
  });

  test('a parent already in the family is refused and keeps the parent role', async () => {
    const kari = await googleUser(generateTestEmail('cex-kari'));
    await pool.query(
      `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'parent')`,
      [familyId, kari.id],
    );
    const childId = await addChild('Medlem');
    const token = await invite(childId, kari.email);
    const response = await accept(token, kari.token);
    assert.strictEqual(response.statusCode, 409);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.code, 'ALREADY_MEMBER');
    assert.strictEqual(body.role, 'parent');
    const after = await snapshot(kari.id, childId);
    assert.deepStrictEqual(after.members, [{ household_id: familyId, role: 'parent' }]);
    assert.strictEqual(after.child.user_id, null);
  });

  test('an already linked profile is refused, never replaced', async () => {
    const first = await googleUser(generateTestEmail('cex-first'));
    const second = await googleUser(generateTestEmail('cex-second'));
    const childId = await addChild('Koblet');
    const token1 = await invite(childId, first.email);
    assert.strictEqual((await accept(token1, first.token)).statusCode, 200);
    // A stray pending link for the same child (made before the link, say)
    const stray = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `INSERT INTO invitations (household_id, invited_by, invited_email, token, role, status, expires_at, child_id)
       VALUES ($1, $2, $3, $4, 'child', 'pending', NOW() + INTERVAL '7 days', $5)`,
      [familyId, parentId, second.email, stray, childId],
    );
    const response = await accept(stray, second.token);
    assert.strictEqual(response.statusCode, 409);
    assert.strictEqual(JSON.parse(response.body).code, 'PROFILE_LINKED');
    assert.strictEqual((await snapshot(second.id, childId)).child.user_id, first.id);
    assert.deepStrictEqual((await snapshot(second.id, childId)).members, []);
  });

  test('expired and cancelled links change nothing', async () => {
    const jo = await googleUser(generateTestEmail('cex-dead'));
    const childId = await addChild('Utløpt');
    const token = await invite(childId, jo.email);
    await pool.query(
      `UPDATE invitations SET expires_at = NOW() - INTERVAL '1 day' WHERE token = $1`,
      [token],
    );
    const expired = await accept(token, jo.token);
    assert.strictEqual(expired.statusCode, 410);
    assert.strictEqual(JSON.parse(expired.body).code, 'EXPIRED');

    const token2 = await invite(childId, jo.email);
    await app.inject({
      method: 'DELETE',
      url: `/api/households/${familyId}/children/${childId}/invitation`,
      headers: { Authorization: `Bearer ${parentToken}` },
    });
    const cancelled = await accept(token2, jo.token);
    assert.strictEqual(cancelled.statusCode, 410);
    assert.strictEqual(JSON.parse(cancelled.body).code, 'CANCELLED');
    const after = await snapshot(jo.id, childId);
    assert.deepStrictEqual(after.members, []);
    assert.strictEqual(after.child.user_id, null);
  });

  test('an inviter who is no longer a parent there makes the link dead', async () => {
    const helper = await googleUser(generateTestEmail('cex-helper'));
    await pool.query(
      `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'parent')`,
      [familyId, helper.id],
    );
    const childId = await addChild('Tilbakekalt');
    const response = await app.inject({
      method: 'POST',
      url: `/api/households/${familyId}/children/${childId}/invitation`,
      headers: { Authorization: `Bearer ${helper.token}` },
      payload: { email: generateTestEmail('cex-revoked') },
    });
    assert.strictEqual(response.statusCode, 201, response.body);
    const { token, email } = JSON.parse(response.body).invitation;
    await pool.query('DELETE FROM household_members WHERE household_id = $1 AND user_id = $2', [
      familyId,
      helper.id,
    ]);
    const jo = await googleUser(email);
    const refused = await accept(token, jo.token);
    assert.strictEqual(refused.statusCode, 410);
    assert.strictEqual(JSON.parse(refused.body).code, 'CANCELLED');
    assert.strictEqual((await snapshot(jo.id, childId)).child.user_id, null);
  });

  test('a failure late in the transaction rolls every write back', async () => {
    const jo = await googleUser(generateTestEmail('cex-rollback'));
    const childId = await addChild('Rull');
    const token = await invite(childId, jo.email);
    const fn = `st2227_fail_${crypto.randomBytes(4).toString('hex')}`;
    await pool.query(
      `CREATE FUNCTION ${fn}() RETURNS trigger AS $$
       BEGIN
         IF NEW.token = '${token}' AND NEW.status = 'accepted' THEN
           RAISE EXCEPTION 'forced failure';
         END IF;
         RETURN NEW;
       END; $$ LANGUAGE plpgsql`,
    );
    await pool.query(
      `CREATE TRIGGER ${fn} BEFORE UPDATE ON invitations FOR EACH ROW EXECUTE FUNCTION ${fn}()`,
    );
    try {
      const response = await accept(token, jo.token);
      assert.strictEqual(response.statusCode, 500);
    } finally {
      await pool.query(`DROP TRIGGER ${fn} ON invitations`);
      await pool.query(`DROP FUNCTION ${fn}()`);
    }
    const after = await snapshot(jo.id, childId);
    assert.deepStrictEqual(after.members, [], 'membership rolled back');
    assert.strictEqual(after.child.user_id, null, 'link rolled back');
    const status = await pool.query('SELECT status FROM invitations WHERE token = $1', [token]);
    assert.strictEqual(status.rows[0].status, 'pending');
  });

  test('concurrent presses link once', async () => {
    const jo = await googleUser(generateTestEmail('cex-race'));
    const childId = await addChild('Samtidig');
    const token = await invite(childId, jo.email);
    const results = await Promise.all([
      accept(token, jo.token),
      accept(token, jo.token),
      accept(token, jo.token),
    ]);
    const codes = results.map((r) => r.statusCode).sort();
    assert.strictEqual(codes.filter((c) => c === 200).length, 1, codes.join(','));
    assert.ok(
      codes.every((c) => c === 200 || c === 409 || c === 410),
      codes.join(','),
    );
    const after = await snapshot(jo.id, childId);
    assert.deepStrictEqual(after.members, [{ household_id: familyId, role: 'child' }]);
    assert.strictEqual(after.child.user_id, jo.id);
  });

  test('the parent answer does not tell whether the e-mail has an account', async () => {
    const existing = await googleUser(generateTestEmail('cex-enum'));
    const a = await addChild('EnumA');
    const b = await addChild('EnumB');
    const r1 = await app.inject({
      method: 'POST',
      url: `/api/households/${familyId}/children/${a}/invitation`,
      headers: { Authorization: `Bearer ${parentToken}` },
      payload: { email: existing.email },
    });
    const r2 = await app.inject({
      method: 'POST',
      url: `/api/households/${familyId}/children/${b}/invitation`,
      headers: { Authorization: `Bearer ${parentToken}` },
      payload: { email: generateTestEmail('cex-nobody') },
    });
    assert.strictEqual(r1.statusCode, 201);
    assert.strictEqual(r2.statusCode, 201);
    assert.deepStrictEqual(
      Object.keys(JSON.parse(r1.body).invitation).sort(),
      Object.keys(JSON.parse(r2.body).invitation).sort(),
    );
  });

  test('without login the existing-account endpoints are closed', async () => {
    const r = await app.inject({
      method: 'POST',
      url: `/api/child-invitations/whatever/accept-existing`,
      payload: { consent: true },
    });
    assert.strictEqual(r.statusCode, 401);
  });
});
