/**
 * Single Tasks Routes Integration Tests
 *
 * Tests the single tasks API endpoints with race condition handling,
 * authorization, and error scenarios.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { registerAndLogin } from '../test-helpers/auth.ts';

describe('Single Tasks Routes', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let parentToken: string;
  let child1Token: string;
  let child2Token: string;
  let outsiderToken: string;
  let householdId: string;
  let parentUserId: string;
  let child1UserId: string;
  let child2UserId: string;
  let outsiderUserId: string;
  let childId1: string;
  let childId2: string;
  let singleTaskId: string;
  let singleTaskId2: string;

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

    // Create test users with unique timestamps
    const timestamp = Date.now();
    const parentEmail = `test-single-parent-${timestamp}@example.com`;
    const child1Email = `test-single-child1-${timestamp}@example.com`;
    const child2Email = `test-single-child2-${timestamp}@example.com`;
    const outsiderEmail = `test-single-outsider-${timestamp}@example.com`;
    const testPassword = 'TestPass123!';

    const parentData = await registerAndLogin(app, parentEmail, testPassword);
    const child1Data = await registerAndLogin(app, child1Email, testPassword);
    const child2Data = await registerAndLogin(app, child2Email, testPassword);
    const outsiderData = await registerAndLogin(app, outsiderEmail, testPassword);

    parentToken = parentData.accessToken;
    child1Token = child1Data.accessToken;
    child2Token = child2Data.accessToken;
    outsiderToken = outsiderData.accessToken;

    // Get user IDs from tokens (returned by login)
    parentUserId = parentData.userId;
    child1UserId = child1Data.userId;
    child2UserId = child2Data.userId;
    outsiderUserId = outsiderData.userId;

    // Create household
    const householdResponse = await app.inject({
      method: 'POST',
      url: '/api/households',
      headers: { Authorization: `Bearer ${parentToken}` },
      payload: { name: `Single Tasks Test Household ${timestamp}` },
    });
    householdId = JSON.parse(householdResponse.body).id;

    // Add child1 and child2 as children in household (link to user accounts)
    await pool.query(
      `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'child')`,
      [householdId, child1UserId],
    );
    await pool.query(
      `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'child')`,
      [householdId, child2UserId],
    );

    // Create child profiles linked to user accounts
    const child1ProfileResult = await pool.query(
      `INSERT INTO children (household_id, user_id, name) VALUES ($1, $2, $3) RETURNING id`,
      [householdId, child1UserId, 'Child One'],
    );
    childId1 = child1ProfileResult.rows[0].id;

    const child2ProfileResult = await pool.query(
      `INSERT INTO children (household_id, user_id, name) VALUES ($1, $2, $3) RETURNING id`,
      [householdId, child2UserId, 'Child Two'],
    );
    childId2 = child2ProfileResult.rows[0].id;

    // Create single task for testing
    const taskResult = await pool.query(
      `INSERT INTO tasks (household_id, name, description, points, rule_type, active)
       VALUES ($1, $2, $3, $4, 'single', true) RETURNING id`,
      [householdId, 'Clean Garage', 'Deep clean the garage', 50],
    );
    singleTaskId = taskResult.rows[0].id;

    // Add both children as candidates
    await pool.query(
      `INSERT INTO task_candidates (task_id, child_id, household_id) VALUES ($1, $2, $3)`,
      [singleTaskId, childId1, householdId],
    );
    await pool.query(
      `INSERT INTO task_candidates (task_id, child_id, household_id) VALUES ($1, $2, $3)`,
      [singleTaskId, childId2, householdId],
    );

    // Create second single task for failed task tests
    const task2Result = await pool.query(
      `INSERT INTO tasks (household_id, name, description, points, rule_type, active)
       VALUES ($1, $2, $3, $4, 'single', true) RETURNING id`,
      [householdId, 'Organize Attic', 'Sort boxes in attic', 75],
    );
    singleTaskId2 = task2Result.rows[0].id;

    // Add both children as candidates for second task
    await pool.query(
      `INSERT INTO task_candidates (task_id, child_id, household_id) VALUES ($1, $2, $3)`,
      [singleTaskId2, childId1, householdId],
    );
    await pool.query(
      `INSERT INTO task_candidates (task_id, child_id, household_id) VALUES ($1, $2, $3)`,
      [singleTaskId2, childId2, householdId],
    );
  });

  after(async () => {
    // Cleanup in correct order due to foreign keys
    try {
      if (householdId) {
        await pool.query('DELETE FROM task_responses WHERE household_id = $1', [householdId]);
        await pool.query('DELETE FROM task_candidates WHERE household_id = $1', [householdId]);
        await pool.query('DELETE FROM task_assignments WHERE household_id = $1', [householdId]);
        await pool.query('DELETE FROM tasks WHERE household_id = $1', [householdId]);
        await pool.query('DELETE FROM children WHERE household_id = $1', [householdId]);
        await pool.query('DELETE FROM household_members WHERE household_id = $1', [householdId]);
        await pool.query('DELETE FROM households WHERE id = $1', [householdId]);
      }
      if (parentUserId && child1UserId && child2UserId && outsiderUserId) {
        await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3, $4)', [
          parentUserId,
          child1UserId,
          child2UserId,
          outsiderUserId,
        ]);
      }
    } catch {
      // Ignore cleanup errors
    }
    try {
      await pool.end();
    } catch {
      // Ignore pool close errors
    }
    try {
      await app.close();
    } catch {
      // Ignore app close errors
    }
  });

  describe('POST /api/households/:householdId/tasks/:taskId/accept', () => {
    test('should accept a task successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks/${singleTaskId}/accept`,
        headers: { Authorization: `Bearer ${child1Token}` },
        payload: {},
      });

      assert.strictEqual(
        response.statusCode,
        201,
        `Expected 201, got ${response.statusCode}: ${response.body}`,
      );
      const body = JSON.parse(response.body);
      assert.ok(body.assignment);
      assert.strictEqual(body.assignment.taskId, singleTaskId);
      assert.strictEqual(body.assignment.childId, childId1);
      assert.strictEqual(body.assignment.status, 'pending');
    });

    test('should return 409 when task already accepted (race condition)', async () => {
      // First child already accepted, now second child tries
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks/${singleTaskId}/accept`,
        headers: { Authorization: `Bearer ${child2Token}` },
        payload: {},
      });

      assert.strictEqual(response.statusCode, 409);
      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('already been accepted'));
    });

    test('should return 404 when task not found', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks/00000000-0000-0000-0000-000000000000/accept`,
        headers: { Authorization: `Bearer ${child1Token}` },
        payload: {},
      });

      assert.strictEqual(response.statusCode, 404);
    });

    test('should return 403 when child is not a candidate', async () => {
      // Create a task without adding child1 as candidate
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, points, rule_type, active)
         VALUES ($1, 'Non-candidate task', 25, 'single', true) RETURNING id`,
        [householdId],
      );
      const taskIdNoCandidates = taskResult.rows[0].id;

      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks/${taskIdNoCandidates}/accept`,
        headers: { Authorization: `Bearer ${child1Token}` },
        payload: {},
      });

      assert.strictEqual(response.statusCode, 403);
      const body = JSON.parse(response.body);
      assert.ok(body.error.includes('not a candidate'));

      // Cleanup
      await pool.query('DELETE FROM tasks WHERE id = $1', [taskIdNoCandidates]);
    });

    test('should return 404 when child profile not found', async () => {
      // Outsider has no child profile
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks/${singleTaskId2}/accept`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
        payload: {},
      });

      // Outsider is not a household member so gets 403
      assert.strictEqual(response.statusCode, 403);
    });

    test('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks/${singleTaskId}/accept`,
        payload: {},
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('POST /api/households/:householdId/tasks/:taskId/decline', () => {
    test('should decline a task successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks/${singleTaskId2}/decline`,
        headers: { Authorization: `Bearer ${child1Token}` },
        payload: {},
      });

      assert.strictEqual(
        response.statusCode,
        200,
        `Expected 200, got ${response.statusCode}: ${response.body}`,
      );
      const body = JSON.parse(response.body);
      assert.strictEqual(body.success, true);
    });

    test('should return 404 when task not found', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks/00000000-0000-0000-0000-000000000000/decline`,
        headers: { Authorization: `Bearer ${child1Token}` },
        payload: {},
      });

      assert.strictEqual(response.statusCode, 404);
    });

    test('should return 403 when child is not a candidate', async () => {
      // Create a task without adding child1 as candidate
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, points, rule_type, active)
         VALUES ($1, 'Non-candidate decline task', 25, 'single', true) RETURNING id`,
        [householdId],
      );
      const taskIdNoCandidates = taskResult.rows[0].id;

      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks/${taskIdNoCandidates}/decline`,
        headers: { Authorization: `Bearer ${child1Token}` },
        payload: {},
      });

      assert.strictEqual(response.statusCode, 403);

      // Cleanup
      await pool.query('DELETE FROM tasks WHERE id = $1', [taskIdNoCandidates]);
    });

    test('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/tasks/${singleTaskId2}/decline`,
        payload: {},
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('DELETE /api/households/:householdId/tasks/:taskId/responses/:childId', () => {
    test('should undo a decline successfully', async () => {
      // First make sure child1 has declined task2
      await pool.query(
        `INSERT INTO task_responses (task_id, child_id, household_id, response)
         VALUES ($1, $2, $3, 'declined')
         ON CONFLICT (task_id, child_id) DO UPDATE SET response = 'declined'`,
        [singleTaskId2, childId1, householdId],
      );

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/tasks/${singleTaskId2}/responses/${childId1}`,
        headers: { Authorization: `Bearer ${child1Token}` },
      });

      assert.strictEqual(
        response.statusCode,
        200,
        `Expected 200, got ${response.statusCode}: ${response.body}`,
      );
      const body = JSON.parse(response.body);
      assert.strictEqual(body.success, true);
    });

    test('should return 404 when no response to undo', async () => {
      // Ensure no response exists
      await pool.query(`DELETE FROM task_responses WHERE task_id = $1 AND child_id = $2`, [
        singleTaskId2,
        childId1,
      ]);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/tasks/${singleTaskId2}/responses/${childId1}`,
        headers: { Authorization: `Bearer ${child1Token}` },
      });

      assert.strictEqual(response.statusCode, 404);
    });

    test('should return 403 when user does not own child profile', async () => {
      // Child2 tries to undo child1's response
      await pool.query(
        `INSERT INTO task_responses (task_id, child_id, household_id, response)
         VALUES ($1, $2, $3, 'declined')
         ON CONFLICT (task_id, child_id) DO UPDATE SET response = 'declined'`,
        [singleTaskId2, childId1, householdId],
      );

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/tasks/${singleTaskId2}/responses/${childId1}`,
        headers: { Authorization: `Bearer ${child2Token}` },
      });

      assert.strictEqual(response.statusCode, 403);

      // Cleanup
      await pool.query(`DELETE FROM task_responses WHERE task_id = $1 AND child_id = $2`, [
        singleTaskId2,
        childId1,
      ]);
    });

    test('should require authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/tasks/${singleTaskId2}/responses/${childId1}`,
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('GET /api/children/available-tasks', () => {
    let availableTaskId: string;

    before(async () => {
      // Create a fresh task that hasn't been accepted or declined
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, description, points, rule_type, active)
         VALUES ($1, $2, $3, $4, 'single', true) RETURNING id`,
        [householdId, 'Available Test Task', 'Task for available test', 30],
      );
      availableTaskId = taskResult.rows[0].id;

      // Add child1 as candidate
      await pool.query(
        `INSERT INTO task_candidates (task_id, child_id, household_id) VALUES ($1, $2, $3)`,
        [availableTaskId, childId1, householdId],
      );
    });

    after(async () => {
      await pool.query('DELETE FROM task_candidates WHERE task_id = $1', [availableTaskId]);
      await pool.query('DELETE FROM tasks WHERE id = $1', [availableTaskId]);
    });

    test('should return available tasks for child', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/children/available-tasks`,
        headers: { Authorization: `Bearer ${child1Token}` },
      });

      assert.strictEqual(
        response.statusCode,
        200,
        `Expected 200, got ${response.statusCode}: ${response.body}`,
      );
      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.tasks));

      // Should contain our available task
      const task = body.tasks.find((t: { id: string }) => t.id === availableTaskId);
      assert.ok(task, 'Available task should be in list');
      assert.strictEqual(task.name, 'Available Test Task');
    });

    test('should filter out already accepted tasks', async () => {
      // The singleTaskId was already accepted by child1 earlier
      const response = await app.inject({
        method: 'GET',
        url: `/api/children/available-tasks`,
        headers: { Authorization: `Bearer ${child1Token}` },
      });

      const body = JSON.parse(response.body);
      const acceptedTask = body.tasks.find((t: { id: string }) => t.id === singleTaskId);
      assert.strictEqual(acceptedTask, undefined, 'Accepted task should not be in list');
    });

    test('should filter out declined tasks', async () => {
      // Create and decline a task
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, points, rule_type, active)
         VALUES ($1, 'Declined Test Task', 20, 'single', true) RETURNING id`,
        [householdId],
      );
      const declinedTaskId = taskResult.rows[0].id;

      await pool.query(
        `INSERT INTO task_candidates (task_id, child_id, household_id) VALUES ($1, $2, $3)`,
        [declinedTaskId, childId1, householdId],
      );

      await pool.query(
        `INSERT INTO task_responses (task_id, child_id, household_id, response) VALUES ($1, $2, $3, 'declined')`,
        [declinedTaskId, childId1, householdId],
      );

      const response = await app.inject({
        method: 'GET',
        url: `/api/children/available-tasks`,
        headers: { Authorization: `Bearer ${child1Token}` },
      });

      const body = JSON.parse(response.body);
      const declinedTask = body.tasks.find((t: { id: string }) => t.id === declinedTaskId);
      assert.strictEqual(declinedTask, undefined, 'Declined task should not be in list');

      // Cleanup
      await pool.query('DELETE FROM task_responses WHERE task_id = $1', [declinedTaskId]);
      await pool.query('DELETE FROM task_candidates WHERE task_id = $1', [declinedTaskId]);
      await pool.query('DELETE FROM tasks WHERE id = $1', [declinedTaskId]);
    });

    test('should return 404 when child profile not found', async () => {
      // Outsider has no child profile
      const response = await app.inject({
        method: 'GET',
        url: `/api/children/available-tasks`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });

      assert.strictEqual(response.statusCode, 404);
    });

    test('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/children/available-tasks`,
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('GET /api/households/:householdId/single-tasks/failed', () => {
    let failedTaskId: string;

    before(async () => {
      // Create a task where all candidates have declined
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, description, points, rule_type, active)
         VALUES ($1, $2, $3, $4, 'single', true) RETURNING id`,
        [householdId, 'Failed Task', 'Nobody wants this task', 100],
      );
      failedTaskId = taskResult.rows[0].id;

      // Add both children as candidates
      await pool.query(
        `INSERT INTO task_candidates (task_id, child_id, household_id) VALUES ($1, $2, $3)`,
        [failedTaskId, childId1, householdId],
      );
      await pool.query(
        `INSERT INTO task_candidates (task_id, child_id, household_id) VALUES ($1, $2, $3)`,
        [failedTaskId, childId2, householdId],
      );

      // Both decline
      await pool.query(
        `INSERT INTO task_responses (task_id, child_id, household_id, response) VALUES ($1, $2, $3, 'declined')`,
        [failedTaskId, childId1, householdId],
      );
      await pool.query(
        `INSERT INTO task_responses (task_id, child_id, household_id, response) VALUES ($1, $2, $3, 'declined')`,
        [failedTaskId, childId2, householdId],
      );
    });

    after(async () => {
      await pool.query('DELETE FROM task_responses WHERE task_id = $1', [failedTaskId]);
      await pool.query('DELETE FROM task_candidates WHERE task_id = $1', [failedTaskId]);
      await pool.query('DELETE FROM tasks WHERE id = $1', [failedTaskId]);
    });

    test('should return tasks where all candidates declined', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/single-tasks/failed`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(
        response.statusCode,
        200,
        `Expected 200, got ${response.statusCode}: ${response.body}`,
      );
      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.tasks));

      const failedTask = body.tasks.find((t: { id: string }) => t.id === failedTaskId);
      assert.ok(failedTask, 'Failed task should be in list');
      assert.strictEqual(failedTask.name, 'Failed Task');
      assert.strictEqual(failedTask.candidateCount, 2);
      assert.strictEqual(failedTask.declineCount, 2);
    });

    test('should require parent role', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/single-tasks/failed`,
        headers: { Authorization: `Bearer ${child1Token}` },
      });

      assert.strictEqual(response.statusCode, 403);
    });

    test('should return empty array when no failed tasks', async () => {
      // Create a new household with no failed tasks
      const newHouseholdResponse = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: { Authorization: `Bearer ${parentToken}` },
        payload: { name: `Empty Household ${Date.now()}` },
      });
      const newHouseholdId = JSON.parse(newHouseholdResponse.body).id;

      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${newHouseholdId}/single-tasks/failed`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.tasks));
      assert.strictEqual(body.tasks.length, 0);

      // Cleanup
      await pool.query('DELETE FROM household_members WHERE household_id = $1', [newHouseholdId]);
      await pool.query('DELETE FROM households WHERE id = $1', [newHouseholdId]);
    });

    test('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/single-tasks/failed`,
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('GET /api/households/:householdId/single-tasks/expired', () => {
    let expiredTaskId: string;

    before(async () => {
      // Create an expired task (deadline in the past)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, description, points, rule_type, deadline, active)
         VALUES ($1, $2, $3, $4, 'single', $5, true) RETURNING id`,
        [householdId, 'Expired Task', 'This task has expired', 60, pastDate],
      );
      expiredTaskId = taskResult.rows[0].id;

      // Add a candidate (but no acceptance)
      await pool.query(
        `INSERT INTO task_candidates (task_id, child_id, household_id) VALUES ($1, $2, $3)`,
        [expiredTaskId, childId1, householdId],
      );
    });

    after(async () => {
      await pool.query('DELETE FROM task_candidates WHERE task_id = $1', [expiredTaskId]);
      await pool.query('DELETE FROM tasks WHERE id = $1', [expiredTaskId]);
    });

    test('should return tasks past deadline', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/single-tasks/expired`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(
        response.statusCode,
        200,
        `Expected 200, got ${response.statusCode}: ${response.body}`,
      );
      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.tasks));

      const expiredTask = body.tasks.find((t: { id: string }) => t.id === expiredTaskId);
      assert.ok(expiredTask, 'Expired task should be in list');
      assert.strictEqual(expiredTask.name, 'Expired Task');
    });

    test('should require parent role', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/single-tasks/expired`,
        headers: { Authorization: `Bearer ${child1Token}` },
      });

      assert.strictEqual(response.statusCode, 403);
    });

    test('should return empty array when no expired tasks', async () => {
      // Create a new household with no expired tasks
      const newHouseholdResponse = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: { Authorization: `Bearer ${parentToken}` },
        payload: { name: `No Expired Household ${Date.now()}` },
      });
      const newHouseholdId = JSON.parse(newHouseholdResponse.body).id;

      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${newHouseholdId}/single-tasks/expired`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.tasks));
      assert.strictEqual(body.tasks.length, 0);

      // Cleanup
      await pool.query('DELETE FROM household_members WHERE household_id = $1', [newHouseholdId]);
      await pool.query('DELETE FROM households WHERE id = $1', [newHouseholdId]);
    });

    test('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/single-tasks/expired`,
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('GET /api/households/:householdId/tasks/:taskId/candidates', () => {
    let candidateTaskId: string;

    before(async () => {
      // Create a task with candidates and some responses
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, description, points, rule_type, active)
         VALUES ($1, $2, $3, $4, 'single', true) RETURNING id`,
        [householdId, 'Candidate Test Task', 'Task for candidate testing', 40],
      );
      candidateTaskId = taskResult.rows[0].id;

      // Add both children as candidates
      await pool.query(
        `INSERT INTO task_candidates (task_id, child_id, household_id) VALUES ($1, $2, $3)`,
        [candidateTaskId, childId1, householdId],
      );
      await pool.query(
        `INSERT INTO task_candidates (task_id, child_id, household_id) VALUES ($1, $2, $3)`,
        [candidateTaskId, childId2, householdId],
      );

      // Child1 declined
      await pool.query(
        `INSERT INTO task_responses (task_id, child_id, household_id, response) VALUES ($1, $2, $3, 'declined')`,
        [candidateTaskId, childId1, householdId],
      );
    });

    after(async () => {
      await pool.query('DELETE FROM task_responses WHERE task_id = $1', [candidateTaskId]);
      await pool.query('DELETE FROM task_candidates WHERE task_id = $1', [candidateTaskId]);
      await pool.query('DELETE FROM tasks WHERE id = $1', [candidateTaskId]);
    });

    test('should return candidate list with response status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/tasks/${candidateTaskId}/candidates`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(
        response.statusCode,
        200,
        `Expected 200, got ${response.statusCode}: ${response.body}`,
      );
      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.candidates));
      assert.strictEqual(body.candidates.length, 2);

      // Find child1 (declined) and child2 (no response)
      const child1Candidate = body.candidates.find(
        (c: { childId: string }) => c.childId === childId1,
      );
      const child2Candidate = body.candidates.find(
        (c: { childId: string }) => c.childId === childId2,
      );

      assert.ok(child1Candidate);
      assert.strictEqual(child1Candidate.response, 'declined');
      assert.ok(child1Candidate.childName);

      assert.ok(child2Candidate);
      assert.strictEqual(child2Candidate.response, null);
    });

    test('should require parent role', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/tasks/${candidateTaskId}/candidates`,
        headers: { Authorization: `Bearer ${child1Token}` },
      });

      assert.strictEqual(response.statusCode, 403);
    });

    test('should return 404 when task not found', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/tasks/00000000-0000-0000-0000-000000000000/candidates`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 404);
    });

    test('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/tasks/${candidateTaskId}/candidates`,
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('Race Condition Tests', () => {
    let raceTaskId: string;

    before(async () => {
      // Create a fresh task for race condition testing
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, description, points, rule_type, active)
         VALUES ($1, $2, $3, $4, 'single', true) RETURNING id`,
        [householdId, 'Race Condition Task', 'First come first served', 200],
      );
      raceTaskId = taskResult.rows[0].id;

      // Add both children as candidates
      await pool.query(
        `INSERT INTO task_candidates (task_id, child_id, household_id) VALUES ($1, $2, $3)`,
        [raceTaskId, childId1, householdId],
      );
      await pool.query(
        `INSERT INTO task_candidates (task_id, child_id, household_id) VALUES ($1, $2, $3)`,
        [raceTaskId, childId2, householdId],
      );
    });

    after(async () => {
      await pool.query('DELETE FROM task_responses WHERE task_id = $1', [raceTaskId]);
      await pool.query('DELETE FROM task_candidates WHERE task_id = $1', [raceTaskId]);
      await pool.query('DELETE FROM task_assignments WHERE task_id = $1', [raceTaskId]);
      await pool.query('DELETE FROM tasks WHERE id = $1', [raceTaskId]);
    });

    test('should handle concurrent accept attempts correctly', async () => {
      // Send both requests concurrently
      const [response1, response2] = await Promise.all([
        app.inject({
          method: 'POST',
          url: `/api/households/${householdId}/tasks/${raceTaskId}/accept`,
          headers: { Authorization: `Bearer ${child1Token}` },
          payload: {},
        }),
        app.inject({
          method: 'POST',
          url: `/api/households/${householdId}/tasks/${raceTaskId}/accept`,
          headers: { Authorization: `Bearer ${child2Token}` },
          payload: {},
        }),
      ]);

      // One should succeed (201), one should fail (409)
      const statusCodes = [response1.statusCode, response2.statusCode].sort();
      assert.deepStrictEqual(
        statusCodes,
        [201, 409],
        `Expected [201, 409], got ${statusCodes}: Response1=${response1.body}, Response2=${response2.body}`,
      );
    });

    test('should ensure only one child can accept a task', async () => {
      // Verify only one assignment exists
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM task_assignments WHERE task_id = $1 AND status IN ('pending', 'completed')`,
        [raceTaskId],
      );

      assert.strictEqual(parseInt(result.rows[0].count), 1);
    });
  });

  describe('Authorization Tests', () => {
    test('should require authentication for all endpoints', async () => {
      const endpoints = [
        {
          method: 'POST' as const,
          url: `/api/households/${householdId}/tasks/${singleTaskId}/accept`,
        },
        {
          method: 'POST' as const,
          url: `/api/households/${householdId}/tasks/${singleTaskId}/decline`,
        },
        {
          method: 'DELETE' as const,
          url: `/api/households/${householdId}/tasks/${singleTaskId}/responses/${childId1}`,
        },
        { method: 'GET' as const, url: `/api/children/available-tasks` },
        { method: 'GET' as const, url: `/api/households/${householdId}/single-tasks/failed` },
        { method: 'GET' as const, url: `/api/households/${householdId}/single-tasks/expired` },
        {
          method: 'GET' as const,
          url: `/api/households/${householdId}/tasks/${singleTaskId}/candidates`,
        },
      ];

      for (const endpoint of endpoints) {
        const response = await app.inject({
          method: endpoint.method,
          url: endpoint.url,
        });

        assert.strictEqual(
          response.statusCode,
          401,
          `Expected 401 for ${endpoint.method} ${endpoint.url}, got ${response.statusCode}`,
        );
      }
    });

    test('should require household membership for household endpoints', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/single-tasks/failed`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });

      assert.strictEqual(response.statusCode, 403);
    });

    test('should require parent role for parent-only endpoints', async () => {
      const parentOnlyEndpoints = [
        `/api/households/${householdId}/single-tasks/failed`,
        `/api/households/${householdId}/single-tasks/expired`,
        `/api/households/${householdId}/tasks/${singleTaskId}/candidates`,
      ];

      for (const url of parentOnlyEndpoints) {
        const response = await app.inject({
          method: 'GET',
          url,
          headers: { Authorization: `Bearer ${child1Token}` },
        });

        assert.strictEqual(
          response.statusCode,
          403,
          `Expected 403 for ${url}, got ${response.statusCode}`,
        );
      }
    });
  });
});
