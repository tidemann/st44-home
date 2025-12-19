import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { registerAndLogin } from '../test-helpers/auth.ts';

/**
 * Task Templates CRUD API Tests
 */

describe('Tasks API', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let adminToken: string;
  let parentToken: string;
  let outsiderToken: string;
  let householdId: string;
  let adminUserId: string;
  let parentUserId: string;
  let outsiderUserId: string;
  let childId1: string;
  let childId2: string;
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
    const adminEmail = `test-tasks-admin-${Date.now()}@example.com`;
    const parentEmail = `test-tasks-parent-${Date.now()}@example.com`;
    const outsiderEmail = `test-tasks-outsider-${Date.now()}@example.com`;
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
      payload: { name: `Tasks Test Household ${Date.now()}` },
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
      [householdId, 'Child One', 2015],
    );
    childId1 = child1Result.rows[0].id;

    const child2Result = await pool.query(
      `INSERT INTO children (household_id, name, birth_year) VALUES ($1, $2, $3) RETURNING id`,
      [householdId, 'Child Two', 2017],
    );
    childId2 = child2Result.rows[0].id;

    // Run migration to add active column if needed
    try {
      await pool.query(`
        ALTER TABLE tasks 
        ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true
      `);
    } catch (error) {
      // Column already exists
    }
  });

  after(async () => {
    // Cleanup
    await pool.query('DELETE FROM tasks WHERE household_id = $1', [householdId]);
    await pool.query('DELETE FROM children WHERE household_id = $1', [householdId]);
    await pool.query('DELETE FROM households WHERE id = $1', [householdId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [
      adminUserId,
      parentUserId,
      outsiderUserId,
    ]);
    await pool.end();
    await app.close();
  });

  describe('POST /api/households/:householdId/tasks', () => {
    test('should create a weekly_rotation task (admin)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Take out trash',
          description: 'Take the trash bins to the curb',
          points: 15,
          rule_type: 'weekly_rotation',
          rule_config: {
            rotation_type: 'odd_even_week',
            assigned_children: [childId1, childId2],
          },
        },
      });

      assert.strictEqual(
        response.statusCode,
        201,
        `Expected 201, got ${response.statusCode}: ${response.body}`,
      );
      const body = JSON.parse(response.body);
      assert.ok(body.id);
      assert.strictEqual(body.name, 'Take out trash');
      assert.strictEqual(body.points, 15);
      assert.strictEqual(body.rule_type, 'weekly_rotation');
      assert.deepStrictEqual(body.rule_config.rotation_type, 'odd_even_week');
      assert.deepStrictEqual(body.rule_config.assigned_children, [childId1, childId2]);

      // Save taskId for other tests
      taskId = body.id;
    });

    test('should create a repeating task (parent)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks`,
        headers: { Authorization: `Bearer ${parentToken}` },
        payload: {
          name: 'Feed the cat',
          points: 5,
          rule_type: 'repeating',
          rule_config: {
            repeat_days: [1, 3, 5], // Monday, Wednesday, Friday
            assigned_children: [childId1],
          },
        },
      });

      assert.strictEqual(response.statusCode, 201);
      const body = JSON.parse(response.body);
      assert.ok(body.id);
      assert.strictEqual(body.name, 'Feed the cat');
      assert.strictEqual(body.rule_type, 'repeating');
      assert.deepStrictEqual(body.rule_config.repeat_days, [1, 3, 5]);
    });

    test('should create a daily task', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Make your bed',
          rule_type: 'daily',
          rule_config: {
            assigned_children: [childId1, childId2],
          },
        },
      });

      assert.strictEqual(response.statusCode, 201);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.name, 'Make your bed');
      assert.strictEqual(body.rule_type, 'daily');
      assert.strictEqual(body.points, 10); // Default points
    });

    test('should reject weekly_rotation without rotation_type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Invalid task',
          rule_type: 'weekly_rotation',
          rule_config: {
            assigned_children: [childId1, childId2],
          },
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.ok(body.details.some((err: string) => err.includes('rotation_type required')));
    });

    test('should reject weekly_rotation with less than 2 children', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Invalid task',
          rule_type: 'weekly_rotation',
          rule_config: {
            rotation_type: 'alternating',
            assigned_children: [childId1],
          },
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.ok(body.details.some((err: string) => err.includes('At least 2 assigned_children')));
    });

    test('should reject repeating without repeat_days', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Invalid task',
          rule_type: 'repeating',
          rule_config: {
            assigned_children: [childId1],
          },
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.ok(body.details.some((err: string) => err.includes('repeat_days required')));
    });

    test('should reject invalid child IDs', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Invalid task',
          rule_type: 'repeating',
          rule_config: {
            repeat_days: [1, 2],
            assigned_children: ['00000000-0000-0000-0000-000000000000'],
          },
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.ok(body.message.includes('do not belong to this household'));
    });

    test('should reject task with name too long', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'A'.repeat(300),
          rule_type: 'daily',
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.ok(body.details.some((err: string) => err.includes('255 characters')));
    });

    test('should reject outsider creating task', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
        payload: {
          name: 'Unauthorized task',
          rule_type: 'daily',
        },
      });

      assert.strictEqual(response.statusCode, 403);
    });

    test('should reject unauthenticated request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks`,
        payload: {
          name: 'Unauthorized task',
          rule_type: 'daily',
        },
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('GET /api/households/:householdId/tasks', () => {
    test('should list all tasks (admin)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/tasks`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.tasks));
      assert.ok(body.tasks.length >= 3); // We created at least 3 tasks
    });

    test('should filter active tasks', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/tasks?active=true`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(body.tasks.every((t: any) => t.active === true));
    });

    test('should reject outsider listing tasks', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/tasks`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });

      assert.strictEqual(response.statusCode, 403);
    });
  });

  describe('GET /api/households/:householdId/tasks/:taskId', () => {
    test('should get task details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/tasks/${taskId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.id, taskId);
      assert.strictEqual(body.name, 'Take out trash');
    });

    test('should return 404 for non-existent task', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/tasks/00000000-0000-0000-0000-000000000000`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 404);
    });

    test('should reject invalid task ID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/tasks/invalid-id`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 400);
    });
  });

  describe('PUT /api/households/:householdId/tasks/:taskId', () => {
    test('should update task name', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}/tasks/${taskId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Take out trash and recycling',
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.name, 'Take out trash and recycling');
      assert.strictEqual(body.points, 15); // Unchanged
    });

    test('should update task points', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}/tasks/${taskId}`,
        headers: { Authorization: `Bearer ${parentToken}` },
        payload: {
          points: 20,
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.points, 20);
    });

    test('should update rule_config', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}/tasks/${taskId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          rule_config: {
            rotation_type: 'alternating',
            assigned_children: [childId1, childId2],
          },
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.rule_config.rotation_type, 'alternating');
    });

    test('should return 404 for non-existent task', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}/tasks/00000000-0000-0000-0000-000000000000`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { name: 'Updated' },
      });

      assert.strictEqual(response.statusCode, 404);
    });

    test('should reject update with no fields', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}/tasks/${taskId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {},
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.ok(body.message.includes('No fields to update'));
    });

    test('should reject outsider updating task', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}/tasks/${taskId}`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
        payload: { name: 'Hacked' },
      });

      assert.strictEqual(response.statusCode, 403);
    });
  });

  describe('DELETE /api/households/:householdId/tasks/:taskId', () => {
    test('should soft delete task', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/tasks/${taskId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.success, true);

      // Verify task is soft deleted
      const checkResult = await pool.query('SELECT active FROM tasks WHERE id = $1', [taskId]);
      assert.strictEqual(checkResult.rows[0].active, false);
    });

    test('should filter out deleted tasks', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/tasks?active=true`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      const deletedTask = body.tasks.find((t: any) => t.id === taskId);
      assert.strictEqual(deletedTask, undefined);
    });

    test('should return 404 for non-existent task', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/tasks/00000000-0000-0000-0000-000000000000`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 404);
    });

    test('should reject outsider deleting task', async () => {
      // Create a new task to delete
      const createResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Task to delete',
          rule_type: 'daily',
        },
      });
      const newTaskId = JSON.parse(createResponse.body).id;

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/tasks/${newTaskId}`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });

      assert.strictEqual(response.statusCode, 403);
    });
  });
});
