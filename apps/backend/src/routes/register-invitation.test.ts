import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { pool } from '../database.js';
import authRoutes from './auth.js';

const email = 'nyforelder@example.com';
const payload = { email, password: 'Sterkt123', firstName: 'Ny', lastName: 'Forelder' };
const invitation = {
  id: 'invite-1',
  household_id: 'family-1',
  invited_email: email,
  role: 'parent',
  status: 'pending',
  expires_at: new Date(Date.now() + 60_000),
};

async function register(
  invitationToken?: string,
  overrides: Partial<typeof invitation> = {},
  found = true,
  registeredEmail = email,
) {
  const queries: string[] = [];
  const membershipInserts: unknown[][] = [];
  const client = {
    query: async (sql: string, values?: unknown[]) => {
      queries.push(sql);
      if (sql.includes('INSERT INTO household_members')) membershipInserts.push(values ?? []);
      if (sql.includes('INSERT INTO users'))
        return {
          rows: [{ id: 'user-1', email, first_name: 'Ny', last_name: 'Forelder' }],
        };
      if (sql.includes('FROM invitations'))
        return { rows: found ? [{ ...invitation, ...overrides }] : [] };
      if (sql.includes('INSERT INTO households')) return { rows: [{ id: 'own-family-1' }] };
      return { rows: [] };
    },
    release: () => undefined,
  };
  mock.method(pool, 'connect', async () => client as never);
  const app = Fastify();
  try {
    await app.register(authRoutes, { prefix: '/api/auth' });
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload:
        invitationToken === undefined
          ? { ...payload, email: registeredEmail }
          : { ...payload, email: registeredEmail, invitationToken },
    });
    return { response, queries, membershipInserts };
  } finally {
    await app.close();
    mock.restoreAll();
  }
}

test('new invitee registering from an invitation link joins the inviting household and makes no new one', async () => {
  const { response, queries, membershipInserts } = await register('invite-token-1');
  assert.equal(response.statusCode, 201, response.body);
  assert.equal(response.json().invitationAccepted, true);
  assert.deepEqual(membershipInserts, [['family-1', 'user-1', 'parent']]);
  assert.equal(queries.filter((sql) => sql.includes('INSERT INTO households')).length, 0);
  assert.equal(queries.filter((sql) => sql.includes('UPDATE invitations')).length, 1);
});

test('registering without an invitation token still gets its own household', async () => {
  const { response, queries, membershipInserts } = await register();
  assert.equal(response.statusCode, 201, response.body);
  assert.equal(Boolean(response.json().invitationAccepted), false);
  assert.equal(queries.filter((sql) => sql.includes('INSERT INTO households')).length, 1);
  assert.deepEqual(membershipInserts, [['own-family-1', 'user-1', 'admin']]);
  assert.equal(queries.filter((sql) => sql.includes('UPDATE invitations')).length, 0);
});

test('an invitation token for another e-mail address falls back to an own household', async () => {
  const { response, queries } = await register('invite-token-1', {
    invited_email: 'someoneelse@example.com',
  });
  assert.equal(response.statusCode, 201, response.body);
  assert.equal(Boolean(response.json().invitationAccepted), false);
  assert.equal(queries.filter((sql) => sql.includes('INSERT INTO households')).length, 1);
  assert.equal(queries.filter((sql) => sql.includes('UPDATE invitations')).length, 0);
});

// Invitations are stored lowercase; the person may well type their address with capitals.
test('the invitation e-mail matches whatever the person capitalises', async () => {
  const { response, queries, membershipInserts } = await register(
    'invite-token-1',
    {},
    true,
    'NyForelder@Example.COM',
  );
  assert.equal(response.statusCode, 201, response.body);
  assert.equal(response.json().invitationAccepted, true);
  assert.deepEqual(membershipInserts, [['family-1', 'user-1', 'parent']]);
  assert.equal(queries.filter((sql) => sql.includes('INSERT INTO households')).length, 0);
});

// A bad token must never cost the person their account: the register always succeeds.
for (const [name, overrides, found] of [
  ['expired', { expires_at: new Date(Date.now() - 60_000) }, true],
  ['already spent', { status: 'accepted' }, true],
  ['unknown', {}, false],
] as const) {
  test(`an ${name} invitation token still registers, with an own household`, async () => {
    const { response, queries, membershipInserts } = await register(
      'invite-token-1',
      overrides,
      found,
    );
    assert.equal(response.statusCode, 201, response.body);
    assert.equal(Boolean(response.json().invitationAccepted), false);
    assert.equal(queries.filter((sql) => sql.includes('INSERT INTO households')).length, 1);
    assert.deepEqual(membershipInserts, [['own-family-1', 'user-1', 'admin']]);
    assert.equal(queries.filter((sql) => sql.includes('UPDATE invitations')).length, 0);
  });
}
