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
      // Schema validation returns 400 for invalid UUID format
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
      // Schema validation returns 400 for invalid date format
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
      // Schema validation returns 400 for out of range

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
      // Schema validation returns 400 for out of range
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
      // Schema validation returns 400 when required field missing
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
      // Schema validation returns 400 when required field missing
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
      // Schema validation returns 400 for invalid type
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
      // Schema validation returns 400 for out of range
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
      // Schema validation returns 400 for invalid date format
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

  // ==================== Test Suite: GET /api/children/:childId/tasks ====================

  describe('GET /api/children/:childId/tasks', () => {
    beforeEach(async () => {
      // Create test assignments for both children
      const assignmentResult = await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES 
           ($1, $2, $3, '2025-01-20', 'pending'),
           ($1, $2, $4, '2025-01-20', 'pending'),
           ($1, $2, $3, '2025-01-21', 'completed'),
           ($1, $2, $3, '2025-01-22', 'pending')
         RETURNING id, child_id, date, status`,
        [householdId, taskId, childIds[0], childIds[1]],
      );

      // Create task_completions record for the completed assignment (2025-01-21)
      const completedAssignment = assignmentResult.rows.find((row) => row.status === 'completed');
      if (completedAssignment) {
        await pool.query(
          `INSERT INTO task_completions (household_id, task_assignment_id, child_id, completed_at, points_earned)
           VALUES ($1, $2, $3, '2025-01-21T10:00:00Z', 10)`,
          [householdId, completedAssignment.id, completedAssignment.child_id],
        );
      }
    });

    test('returns child tasks for specified date', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/children/${childIds[0]}/tasks?date=2025-01-20`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(body.assignments);
      assert.ok(Array.isArray(body.assignments));
      assert.strictEqual(body.total, 1);

      const assignment = body.assignments[0];
      assert.ok(assignment.id);
      assert.ok(assignment.task_id); // Use snake_case to match API convention
      assert.ok(assignment.title);
      assert.strictEqual(assignment.date, '2025-01-20');
      assert.strictEqual(assignment.status, 'pending');
    });

    test('filters by status=pending', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/children/${childIds[0]}/tasks?date=2025-01-20&status=pending`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.total, 1);
      assert.strictEqual(body.assignments[0].status, 'pending');
    });

    test('filters by status=completed', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/children/${childIds[0]}/tasks?date=2025-01-21&status=completed`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.total, 1);
      assert.strictEqual(body.assignments[0].status, 'completed');
      assert.ok(body.assignments[0].completed_at);
    });

    test('defaults to today if no date parameter', async () => {
      // Create assignment for today
      const today = new Date().toISOString().split('T')[0];
      await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, $4, 'pending')`,
        [householdId, taskId, childIds[0], today],
      );

      const response = await app.inject({
        method: 'GET',
        url: `/api/children/${childIds[0]}/tasks`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(body.assignments);
      assert.ok(body.total >= 1);
    });

    test('returns empty array if no tasks match', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/children/${childIds[0]}/tasks?date=2099-01-01`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.total, 0);
      assert.ok(Array.isArray(body.assignments));
      assert.strictEqual(body.assignments.length, 0);
    });

    test('returns 403 if child not in user household', async () => {
      // Create another household with a child
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
      const otherChildId = child2Result.rows[0].id;

      const response = await app.inject({
        method: 'GET',
        url: `/api/children/${otherChildId}/tasks`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 403);

      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('not authorized'));

      // Cleanup
      await pool.query('DELETE FROM children WHERE household_id = $1', [household2Id]);
      await pool.query('DELETE FROM household_members WHERE household_id = $1', [household2Id]);
      await pool.query('DELETE FROM households WHERE id = $1', [household2Id]);
    });

    test('returns 404 if child not found', async () => {
      const fakeChildId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'GET',
        url: `/api/children/${fakeChildId}/tasks`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 404);

      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('not found'));
    });

    test('validates childId format (400 on invalid UUID)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/children/not-a-uuid/tasks`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 400);
      // Schema validation returns 400 for invalid UUID format
    });

    test('validates date format (400 on invalid date)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/children/${childIds[0]}/tasks?date=invalid-date`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 400);
      // Schema validation returns 400 for invalid date format
    });

    test('validates status parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/children/${childIds[0]}/tasks?date=2025-01-20&status=invalid-status`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 400);
      // Schema validation returns 400 for invalid enum value
    });

    test('requires authentication (401 without token)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/children/${childIds[0]}/tasks`,
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('parent can view child tasks', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/children/${childIds[0]}/tasks?date=2025-01-20`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.total, 1);
    });

    test('returns only tasks for specified child (not other children)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/children/${childIds[0]}/tasks?date=2025-01-20`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      // Should have 1 task for child 0, not 2 (child 1 also has task on same date)
      assert.strictEqual(body.total, 1);
      assert.strictEqual(body.assignments[0].child_id, childIds[0]);
    });

    test('includes task details (title, description, rule_type)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/children/${childIds[0]}/tasks?date=2025-01-20`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      const assignment = body.assignments[0];
      assert.ok(assignment.title);
      assert.strictEqual(assignment.title, 'Test Task');
      assert.strictEqual(assignment.rule_type, 'daily');
    });
  });

  // ==================== Test Suite 9: PUT /api/assignments/:assignmentId/complete ====================

  describe('PUT /api/assignments/:assignmentId/complete', () => {
    let assignmentId: string;

    beforeEach(async () => {
      // Create a pending assignment
      const result = await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, '2025-01-15', 'pending')
         RETURNING id`,
        [householdId, taskId, childIds[0]],
      );
      assignmentId = result.rows[0].id;
    });

    test('successfully marks assignment as complete', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/complete`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.id, assignmentId);
      assert.strictEqual(body.status, 'completed');
      assert.ok(body.completed_at);
      assert.ok(body.child_id);
      assert.ok(body.task_id);

      // Verify database state
      const dbResult = await pool.query('SELECT status FROM task_assignments WHERE id = $1', [
        assignmentId,
      ]);
      assert.strictEqual(dbResult.rows[0].status, 'completed');
    });

    test('parent can complete assignment', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/complete`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.status, 'completed');
    });

    test('returns 404 if assignment not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${fakeId}/complete`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 404);

      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('not found'));
    });

    test('returns 400 if assignment already completed', async () => {
      // First completion
      await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/complete`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      // Second completion attempt
      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/complete`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('already completed'));
    });

    test('returns 400 for invalid UUID format', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/not-a-uuid/complete`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 400);
      // Schema validation returns 400 for invalid UUID format
    });

    test('requires authentication (401 without token)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/complete`,
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('returns 403 if not authorized (outsider)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/complete`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });

      assert.strictEqual(response.statusCode, 403);

      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('not authorized'));
    });

    test('records completed_at timestamp', async () => {
      const beforeTime = new Date();

      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/complete`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const afterTime = new Date();

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      const completedAt = new Date(body.completed_at);

      assert.ok(completedAt >= beforeTime);
      assert.ok(completedAt <= afterTime);
    });

    test('does not modify other assignments', async () => {
      // Create another assignment
      const otherResult = await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, '2025-01-16', 'pending')
         RETURNING id`,
        [householdId, taskId, childIds[1]],
      );
      const otherAssignmentId = otherResult.rows[0].id;

      // Complete first assignment
      await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/complete`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      // Verify other assignment is still pending
      const dbResult = await pool.query('SELECT status FROM task_assignments WHERE id = $1', [
        otherAssignmentId,
      ]);
      assert.strictEqual(dbResult.rows[0].status, 'pending');
    });

    test('returns all required fields', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/complete`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(body.id);
      assert.ok(body.status);
      assert.ok(body.completed_at);
      assert.ok(body.child_id);
      assert.ok(body.task_id);
    });
  });

  // ==================== Test Suite 10: PUT /api/assignments/:assignmentId/reassign ====================

  describe('PUT /api/assignments/:assignmentId/reassign', () => {
    let assignmentId: string;

    beforeEach(async () => {
      // Create a pending assignment assigned to child 0
      const result = await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, '2025-01-15', 'pending')
         RETURNING id`,
        [householdId, taskId, childIds[0]],
      );
      assignmentId = result.rows[0].id;
    });

    test('successfully reassigns to different child', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/reassign`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { childId: childIds[1] },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.id, assignmentId);
      assert.strictEqual(body.child_id, childIds[1]);
      assert.strictEqual(body.child_name, 'Bob');

      // Verify database state
      const dbResult = await pool.query('SELECT child_id FROM task_assignments WHERE id = $1', [
        assignmentId,
      ]);
      assert.strictEqual(dbResult.rows[0].child_id, childIds[1]);
    });

    test('parent can reassign', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/reassign`,
        headers: { Authorization: `Bearer ${parentToken}` },
        payload: { childId: childIds[1] },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.child_id, childIds[1]);
    });

    test('returns 404 if assignment not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${fakeId}/reassign`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { childId: childIds[1] },
      });

      assert.strictEqual(response.statusCode, 404);

      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('not found'));
    });

    test('returns 404 if child not found', async () => {
      const fakeChildId = '00000000-0000-0000-0000-000000000001';

      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/reassign`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { childId: fakeChildId },
      });

      assert.strictEqual(response.statusCode, 404);

      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('Child not found'));
    });

    test('returns 400 if assignment already completed', async () => {
      // Mark as completed
      await pool.query(`UPDATE task_assignments SET status = 'completed' WHERE id = $1`, [
        assignmentId,
      ]);

      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/reassign`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { childId: childIds[1] },
      });

      assert.strictEqual(response.statusCode, 400);

      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('completed'));
    });

    test('returns 400 for invalid assignment UUID format', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/not-a-uuid/reassign`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { childId: childIds[1] },
      });

      assert.strictEqual(response.statusCode, 400);
      // Schema validation returns 400 for invalid UUID format
    });

    test('returns 400 for invalid child UUID format', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/reassign`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { childId: 'not-a-uuid' },
      });

      assert.strictEqual(response.statusCode, 400);
      // Schema validation returns 400 for invalid UUID format
    });

    test('returns 400 if childId missing', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/reassign`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {},
      });

      assert.strictEqual(response.statusCode, 400);
      // Schema validation returns 400 when required field missing
    });

    test('requires authentication (401 without token)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/reassign`,
        payload: { childId: childIds[1] },
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('returns 403 if not authorized (outsider)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/reassign`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
        payload: { childId: childIds[1] },
      });

      assert.strictEqual(response.statusCode, 403);

      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('not authorized'));
    });

    test('verifies child belongs to same household', async () => {
      // Create another household with a child
      const household2Response = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: { Authorization: `Bearer ${outsiderToken}` },
        payload: { name: 'Other Household 2' },
      });
      const household2Id = JSON.parse(household2Response.body).id;

      const otherChildResult = await pool.query(
        `INSERT INTO children (household_id, name, birth_year) VALUES ($1, $2, $3) RETURNING id`,
        [household2Id, 'Other Child', 2015],
      );
      const otherChildId = otherChildResult.rows[0].id;

      // Try to reassign to child from different household
      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/reassign`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { childId: otherChildId },
      });

      assert.strictEqual(response.statusCode, 404);

      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('Child not found in this household'));

      // Cleanup
      await pool.query('DELETE FROM children WHERE household_id = $1', [household2Id]);
      await pool.query('DELETE FROM household_members WHERE household_id = $1', [household2Id]);
      await pool.query('DELETE FROM households WHERE id = $1', [household2Id]);
    });

    test('allows reassigning to same child (no-op)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/reassign`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { childId: childIds[0] },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.child_id, childIds[0]);
      assert.strictEqual(body.child_name, 'Alice');
    });

    test('does not modify other assignments', async () => {
      // Create another assignment
      const otherResult = await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, '2025-01-16', 'pending')
         RETURNING id`,
        [householdId, taskId, childIds[1]],
      );
      const otherAssignmentId = otherResult.rows[0].id;

      // Reassign first assignment
      await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/reassign`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { childId: childIds[1] },
      });

      // Verify other assignment still has original child
      const dbResult = await pool.query('SELECT child_id FROM task_assignments WHERE id = $1', [
        otherAssignmentId,
      ]);
      assert.strictEqual(dbResult.rows[0].child_id, childIds[1]);
    });

    test('returns all required fields', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/assignments/${assignmentId}/reassign`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { childId: childIds[1] },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(body.id);
      assert.ok(body.child_id);
      assert.ok(body.child_name);
    });
  });
});
