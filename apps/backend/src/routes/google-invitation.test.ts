import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { OAuth2Client } from 'google-auth-library';
import { pool } from '../database.js';
import authRoutes from './auth.js';

// Exercise the real HTTP handler with a verified Google identity and an in-memory SQL boundary.
test('new Google invitee joins the invited household with its role and no new household', async () => {
  const queries: string[] = [];
  const membershipInserts: unknown[][] = [];
  const invitation = {
    id: 'invite-1',
    household_id: 'family-1',
    invited_email: 'child@gmail.com',
    role: 'parent',
    status: 'pending',
    expires_at: new Date(Date.now() + 60_000),
  };
  const client = {
    query: async (sql: string, values?: unknown[]) => {
      queries.push(sql);
      if (sql.includes('INSERT INTO household_members')) membershipInserts.push(values ?? []);
      if (sql.includes('FROM invitations')) return { rows: [invitation] };
      if (sql.includes('INSERT INTO users'))
        return {
          rows: [{ id: 'child-1', email: 'child@gmail.com', first_name: 'Child', last_name: null }],
        };
      if (sql.includes('INSERT INTO households')) return { rows: [{ id: 'wrong-family' }] };
      return { rows: [] };
    },
    release: () => undefined,
  };
  const mocks = [
    mock.method(
      OAuth2Client.prototype,
      'verifyIdToken',
      async () =>
        ({
          getPayload: () => ({
            sub: 'google-1',
            email: 'child@gmail.com',
            email_verified: true,
            given_name: 'Child',
          }),
        }) as never,
    ),
    mock.method(pool, 'query', async (sql: string) => {
      queries.push(sql);
      if (sql.includes('SELECT id, email, first_name')) return { rows: [] } as never;
      if (sql.includes('SELECT household_id, role'))
        return { rows: [{ household_id: 'family-1', role: 'parent' }] } as never;
      return { rows: [] } as never;
    }),
    mock.method(pool, 'connect', async () => client as never),
  ];
  const app = Fastify();
  try {
    await app.register(authRoutes, { prefix: '/api/auth' });
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/google',
      payload: { credential: 'verified-google-id-token', invitationToken: 'invite-token-1' },
    });
    assert.equal(response.statusCode, 200, response.body);
    const body = response.json();
    assert.equal(body.householdId, 'family-1');
    assert.equal(body.role, 'parent');
    assert.equal(body.invitationAccepted, true);
    assert.deepEqual(membershipInserts, [['family-1', 'child-1', 'parent']]);
    assert.equal(
      queries.some((sql) => sql.includes('INSERT INTO households')),
      false,
      'must not create a second household',
    );
    assert.equal(
      queries.some((sql) => sql.includes('UPDATE invitations')),
      true,
      'invitation must be spent once',
    );
  } finally {
    await app.close();
    mocks.forEach((m) => m.mock.restore());
  }
});

for (const scenario of [
  { name: 'wrong email', row: { invited_email: 'other@gmail.com' }, expected: 403 },
  { name: 'expired', row: { expires_at: new Date(0) }, expected: 400 },
  { name: 'reused', row: { status: 'accepted' }, expected: 400 },
  { name: 'unknown token', row: null, expected: 404 },
  // ST-2227: a child link never makes a new Google account or household
  { name: 'child link for a new Google login', row: { role: 'child' }, expected: 409 },
]) {
  test(`Google invitation rejects ${scenario.name} before creating an account`, async () => {
    const queries: string[] = [];
    const invitation =
      scenario.row === null
        ? null
        : {
            id: 'invite-1',
            household_id: 'family-1',
            invited_email: 'child@gmail.com',
            role: 'parent',
            status: 'pending',
            expires_at: new Date(Date.now() + 60_000),
            ...scenario.row,
          };
    const client = {
      query: async (sql: string) => {
        queries.push(sql);
        return { rows: sql.includes('FROM invitations') && invitation ? [invitation] : [] };
      },
      release: () => undefined,
    };
    const mocks = [
      mock.method(
        OAuth2Client.prototype,
        'verifyIdToken',
        async () =>
          ({
            getPayload: () => ({ sub: 'google-1', email: 'child@gmail.com', email_verified: true }),
          }) as never,
      ),
      mock.method(pool, 'query', async () => ({ rows: [] }) as never),
      mock.method(pool, 'connect', async () => client as never),
    ];
    const app = Fastify();
    try {
      await app.register(authRoutes, { prefix: '/api/auth' });
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/google',
        payload: { credential: 'verified-google-id-token', invitationToken: 'invite-token-1' },
      });
      assert.equal(response.statusCode, scenario.expected, response.body);
      assert.equal(
        queries.some(
          (sql) =>
            sql.includes('INSERT INTO users') ||
            sql.includes('INSERT INTO households') ||
            sql.includes('INSERT INTO household_members'),
        ),
        false,
      );
      assert.equal(queries.includes('ROLLBACK'), true);
    } finally {
      await app.close();
      mocks.forEach((m) => m.mock.restore());
    }
  });
}

// ST-2208: the reported invitee already has a Google-linked account that owns another household.
test('existing Google user with an invite token keeps one account and is sent to the accept page', async () => {
  const queries: string[] = [];
  const mocks = [
    mock.method(
      OAuth2Client.prototype,
      'verifyIdToken',
      async () =>
        ({
          getPayload: () => ({ sub: 'google-1', email: 'child@gmail.com', email_verified: true }),
        }) as never,
    ),
    mock.method(pool, 'query', async (sql: string) => {
      queries.push(sql);
      if (sql.includes('SELECT id, email, first_name'))
        return {
          rows: [{ id: 'child-1', email: 'child@gmail.com', first_name: 'Child', last_name: null }],
        } as never;
      if (sql.includes('SELECT oauth_provider'))
        return {
          rows: [{ oauth_provider: 'google', first_name: 'Child', last_name: null }],
        } as never;
      if (sql.includes('SELECT household_id, role'))
        return { rows: [{ household_id: 'accidental-1', role: 'admin' }] } as never;
      return { rows: [] } as never;
    }),
    mock.method(pool, 'connect', async () => {
      throw new Error('existing user must not open a create transaction');
    }),
  ];
  const app = Fastify();
  try {
    await app.register(authRoutes, { prefix: '/api/auth' });
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/google',
      payload: { credential: 'verified-google-id-token', invitationToken: 'invite-token-1' },
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().userId ?? 'child-1', 'child-1');
    assert.notEqual(
      response.json().invitationAccepted,
      true,
      'frontend must continue to /invitations/accept/:token',
    );
    assert.equal(
      queries.some((sql) =>
        /INSERT INTO (users|households|household_members)|UPDATE invitations/.test(sql),
      ),
      false,
    );
  } finally {
    await app.close();
    mocks.forEach((m) => m.mock.restore());
  }
});
