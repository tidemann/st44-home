import { test, describe, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.js';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { registerAndLogin } from '../test-helpers/auth.js';

/**
 * Assignment API Integration Tests
 *
 * Tests POST /api/admin/tasks/generate-assignments
 * Tests GET /api/households/:householdId/assignments
 */

describe('Assignments API', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let adminToken: string;
  let parentToken: string;
  let outsiderToken: string;
  let householdId: string;
  let adminUserId: string;
  let parentUserId: string;
  let outsiderUserId: string;
  let childIds: string[];
  let taskId: string;

  before(async () => {
    app = await build();
    await app.ready();

    pool = new pg.Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'st44',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    // Create test users
    const timestamp = Date.now();
    const adminEmail = `test-assignments-admin-${timestamp}@example.com`;
    const parentEmail = `test-assignments-parent-${timestamp}@example.com`;
    const outsiderEmail = `test-assignments-outsider-${timestamp}@example.com`;
    const testPassword = 'TestPass123!';

    const adminData = await registerAndLogin(app, adminEmail, testPassword);
    const parentData = await registerAndLogin(app, parentEmail, testPassword);
    const outsiderData = await registerAndLogin(app, outsiderEmail, testPassword);

    adminToken = adminData.accessToken;
    parentToken = parentData.accessToken;
    outsiderToken = outsiderData.accessToken;

    // Get user IDs
    const adminResult = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    const parentResult = await pool.query('SELECT id FROM users WHERE email = $1', [parentEmail]);
    const outsiderResult = await pool.query('SELECT id FROM users WHERE email = $1', [
      outsiderEmail,
    ]);

    adminUserId = adminResult.rows[0].id;
    parentUserId = parentResult.rows[0].id;
    outsiderUserId = outsiderResult.rows[0].id;

    // Create household
    const householdResponse = await app.inject({
      method: 'POST',
      url: '/api/households',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { name: `Assignments Test Household ${timestamp}` },
    });
    householdId = JSON.parse(householdResponse.body).id;

    // Add parent to household
    await pool.query(
      `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'parent')`,
      [householdId, parentUserId],
    );

    // Create test children
    const child1Result = await pool.query(
      `INSERT INTO children (household_id, name, birth_year) VALUES ($1, $2, $3) RETURNING id`,
      [householdId, 'Alice', 2015],
    );

    const child2Result = await pool.query(
      `INSERT INTO children (household_id, name, birth_year) VALUES ($1, $2, $3) RETURNING id`,
      [householdId, 'Bob', 2017],
    );

    childIds = [child1Result.rows[0].id, child2Result.rows[0].id];

    // Create test task
    const taskResult = await pool.query(
      `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        householdId,
        'Test Task',
        'daily',
        { assigned_children: [child1Result.rows[0].id, child2Result.rows[0].id] },
        true,
      ],
    );
    taskId = taskResult.rows[0].id;
  });

  after(async () => {
    // Cleanup test data
    if (householdId) {
      await pool.query('DELETE FROM task_assignments WHERE household_id = $1', [householdId]);
      await pool.query('DELETE FROM tasks WHERE household_id = $1', [householdId]);
      await pool.query('DELETE FROM children WHERE household_id = $1', [householdId]);
      await pool.query('DELETE FROM household_members WHERE household_id = $1', [householdId]);
      await pool.query('DELETE FROM households WHERE id = $1', [householdId]);
    }

    await pool.query(`DELETE FROM users WHERE email LIKE 'test-assignments-%@example.com'`);

    await pool.end();
    await app.close();
  });

  afterEach(async () => {
    // Clean up assignments between tests
    if (householdId) {
      await pool.query('DELETE FROM task_assignments WHERE household_id = $1', [householdId]);
    }
  });

  // ==================== Test Suite 7: POST /api/admin/tasks/generate-assignments ====================

  describe('POST /api/admin/tasks/generate-assignments', () => {
    test('valid generation succeeds', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/tasks/generate-assignments',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          householdId,
          startDate: '2025-01-01',
          days: 7,
        },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.success, true);
      assert.ok(body.result);
      assert.strictEqual(typeof body.result.created, 'number');
      assert.strictEqual(typeof body.result.skipped, 'number');
      assert.ok(Array.isArray(body.result.errors));
    });

    test('returns correct summary (created, skipped, errors)', async () => {
      // First generation
      const response1 = await app.inject({
        method: 'POST',
        url: '/api/admin/tasks/generate-assignments',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          householdId,
          startDate: '2025-01-01',
          days: 5,
        },
      });

      const body1 = JSON.parse(response1.body);
      assert.strictEqual(body1.result.created, 5);
      assert.strictEqual(body1.result.skipped, 0);

      // Second generation (idempotent)
      const response2 = await app.inject({
        method: 'POST',
        url: '/api/admin/tasks/generate-assignments',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          householdId,
          startDate: '2025-01-01',
          days: 5,
        },
      });

      const body2 = JSON.parse(response2.body);
      assert.strictEqual(body2.result.created, 0);
      assert.strictEqual(body2.result.skipped, 5);
    });

    test('requires authentication (401 without token)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/tasks/generate-assignments',
        payload: {
          householdId,
          startDate: '2025-01-01',
          days: 7,
        },
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('checks household membership (403 if not member)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/tasks/generate-assignments',
        headers: { Authorization: `Bearer ${outsiderToken}` },
        payload: {
          householdId,
          startDate: '2025-01-01',
          days: 7,
        },
      });

      assert.strictEqual(response.statusCode, 403);

      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('not a member'));
    });

    test('validates householdId format (400 on invalid UUID)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/tasks/generate-assignments',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          householdId: 'not-a-uuid',
          startDate: '2025-01-01',
          days: 7,
        },
      });

      assert.strictEqual(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.ok(body.error.toLowerCase().includes('uuid'));
    });

    test('validates date format (400 on invalid date)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/tasks/generate-assignments',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          householdId,
          startDate: 'invalid-date',
          days: 7,
        },
      });

      assert.strictEqual(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.ok(body.error.toLowerCase().includes('date'));
    });

    test('validates days range 1-30 (400 outside range)', async () => {
      // Test days = 0
      const response1 = await app.inject({
        method: 'POST',
        url: '/api/admin/tasks/generate-assignments',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          householdId,
          startDate: '2025-01-01',
          days: 0,
        },
      });

      assert.strictEqual(response1.statusCode, 400);

      const body1 = JSON.parse(response1.body);
      assert.ok(body1.error.includes('between 1 and 30'));

      // Test days = 31
      const response2 = await app.inject({
        method: 'POST',
        url: '/api/admin/tasks/generate-assignments',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          householdId,
          startDate: '2025-01-01',
          days: 31,
        },
      });

      assert.strictEqual(response2.statusCode, 400);

      const body2 = JSON.parse(response2.body);
      assert.ok(body2.error.includes('between 1 and 30'));
    });

    test('validates householdId is required', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/tasks/generate-assignments',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          startDate: '2025-01-01',
          days: 7,
        },
      });

      assert.strictEqual(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('householdId'));
    });

    test('validates startDate is required', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/tasks/generate-assignments',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          householdId,
          days: 7,
        },
      });

      assert.strictEqual(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('startDate'));
    });

    test('validates days is a number', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/tasks/generate-assignments',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          householdId,
          startDate: '2025-01-01',
          days: 'seven',
        },
      });

      assert.strictEqual(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('number'));
    });

    test('parent role can generate assignments', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/tasks/generate-assignments',
        headers: { Authorization: `Bearer ${parentToken}` },
        payload: {
          householdId,
          startDate: '2025-02-01',
          days: 7,
        },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.success, true);
    });
  });

  // ==================== Test Suite 8: GET /api/households/:householdId/assignments ====================

  describe('GET /api/households/:householdId/assignments', () => {
    beforeEach(async () => {
      // Create some test assignments
      await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES 
           ($1, $2, $3, '2025-01-01', 'pending'),
           ($1, $2, $4, '2025-01-02', 'pending'),
           ($1, $2, $3, '2025-01-03', 'completed'),
           ($1, $2, $4, '2025-01-04', 'pending'),
           ($1, $2, $3, '2025-01-05', 'pending')`,
        [householdId, taskId, childIds[0], childIds[1]],
      );
    });

    test('returns assignments with task_name, child_name', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/assignments?date=2025-01-01&days=5`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(body.assignments);
      assert.ok(Array.isArray(body.assignments));
      assert.strictEqual(body.total, 5);

      // Verify fields
      const assignment = body.assignments[0];
      assert.ok(assignment.id);
      assert.ok(assignment.task_id);
      assert.ok(assignment.task_name);
      assert.ok(assignment.child_id);
      assert.ok(assignment.child_name);
      assert.ok(assignment.date);
      assert.ok(assignment.status);
    });

    test('filters by date range', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/assignments?date=2025-01-02&days=2`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.total, 2);

      // Should have assignments for Jan 2 and Jan 3
      const dates = body.assignments.map((a: any) => a.date);
      assert.ok(dates.includes('2025-01-02'));
      assert.ok(dates.includes('2025-01-03'));
    });

    test('defaults to today if date not provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/assignments?days=1`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(body.assignments);
      // May or may not have assignments for today, but should not error
    });

    test('defaults days to 7 if not provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/assignments?date=2025-01-01`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(body.assignments);
      // Should return 5 assignments (we only have 5 days of data)
      assert.strictEqual(body.total, 5);
    });

    test('validates days range 1-30', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/assignments?date=2025-01-01&days=50`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('between 1 and 30'));
    });

    test('orders by date ASC, child_name ASC', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/assignments?date=2025-01-01&days=5`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      const assignments = body.assignments;

      // Verify date order
      for (let i = 1; i < assignments.length; i++) {
        const prevDate = new Date(assignments[i - 1].date);
        const currDate = new Date(assignments[i].date);
        assert.ok(prevDate <= currDate, 'Should be ordered by date ASC');
      }

      // Verify child name order within same date
      const jan1Assignments = assignments.filter((a: any) => a.date === '2025-01-01');
      if (jan1Assignments.length > 1) {
        for (let i = 1; i < jan1Assignments.length; i++) {
          assert.ok(
            jan1Assignments[i - 1].child_name <= jan1Assignments[i].child_name,
            'Should be ordered by child_name ASC',
          );
        }
      }
    });

    test("returns only household's assignments", async () => {
      // Create another household with assignments
      const household2Response = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: { Authorization: `Bearer ${outsiderToken}` },
        payload: { name: 'Other Household' },
      });
      const household2Id = JSON.parse(household2Response.body).id;

      const child2Result = await pool.query(
        `INSERT INTO children (household_id, name, birth_year) VALUES ($1, $2, $3) RETURNING id`,
        [household2Id, 'Other Child', 2015],
      );

      const task2Result = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [household2Id, 'Other Task', 'daily', {}, true],
      );

      await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, '2025-01-01', 'pending')`,
        [household2Id, task2Result.rows[0].id, child2Result.rows[0].id],
      );

      // Query household 1 assignments
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/assignments?date=2025-01-01&days=5`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      // Should only have household 1 assignments (5), not household 2 (1)
      assert.strictEqual(body.total, 5);

      // Verify all assignments are from household 1
      for (const assignment of body.assignments) {
        assert.strictEqual(assignment.task_name, 'Test Task');
      }

      // Cleanup household 2
      await pool.query('DELETE FROM task_assignments WHERE household_id = $1', [household2Id]);
      await pool.query('DELETE FROM tasks WHERE household_id = $1', [household2Id]);
      await pool.query('DELETE FROM children WHERE household_id = $1', [household2Id]);
      await pool.query('DELETE FROM household_members WHERE household_id = $1', [household2Id]);
      await pool.query('DELETE FROM households WHERE id = $1', [household2Id]);
    });

    test('requires authentication (401 without token)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/assignments`,
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('checks household membership (403 if not member)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/assignments`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });

      assert.strictEqual(response.statusCode, 403);
    });

    test('validates invalid UUID (400)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/not-a-uuid/assignments`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 400); // Invalid UUID format checked first
    });

    test('validates invalid date format (400)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/assignments?date=invalid-date`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.ok(body.error.toLowerCase().includes('date'));
    });

    test('handles null child_id (LEFT JOIN)', async () => {
      // Create assignment with null child_id
      await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, NULL, '2025-01-10', 'pending')`,
        [householdId, taskId],
      );

      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/assignments?date=2025-01-10&days=1`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.total, 1);
      assert.strictEqual(body.assignments[0].child_id, null);
      assert.strictEqual(body.assignments[0].child_name, null);
    });

    test('parent can view household assignments', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/assignments?date=2025-01-01&days=5`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.total, 5);
    });
  });
});
