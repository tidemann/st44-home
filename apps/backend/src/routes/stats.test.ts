import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { registerAndLogin } from '../test-helpers/auth.ts';

/**
 * Stats API Tests
 */

describe('Stats API', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let parentToken: string;
  let childToken: string;
  let parentUserId: string;
  let childUserId: string;
  let householdId: string;
  let childId: string;
  let taskId: string;

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

    // Create test users
    const parentEmail = `test-stats-parent-${Date.now()}@example.com`;
    const childEmail = `test-stats-child-${Date.now()}@example.com`;
    const testPassword = 'TestPass123!';

    const parentData = await registerAndLogin(app, parentEmail, testPassword);
    const childData = await registerAndLogin(app, childEmail, testPassword);

    parentToken = parentData.accessToken;
    childToken = childData.accessToken;

    // Get user IDs
    const parentResult = await pool.query('SELECT id FROM users WHERE email = $1', [parentEmail]);
    const childResult = await pool.query('SELECT id FROM users WHERE email = $1', [childEmail]);

    parentUserId = parentResult.rows[0].id;
    childUserId = childResult.rows[0].id;

    // Create household
    const householdResult = await pool.query(
      'INSERT INTO households (name) VALUES ($1) RETURNING id',
      [`Test Stats Household ${Date.now()}`],
    );
    householdId = householdResult.rows[0].id;

    // Add parent as admin
    await pool.query(
      'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
      [householdId, parentUserId, 'admin'],
    );

    // Add child user as household member with 'child' role
    await pool.query(
      'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
      [householdId, childUserId, 'child'],
    );

    // Create child profile and link to user
    const childProfileResult = await pool.query(
      'INSERT INTO children (household_id, user_id, name, birth_year) VALUES ($1, $2, $3, $4) RETURNING id',
      [householdId, childUserId, 'Test Stats Child', 2015],
    );
    childId = childProfileResult.rows[0].id;

    // Create a task for testing
    const taskResult = await pool.query(
      'INSERT INTO tasks (household_id, name, description, points, rule_type, active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [householdId, 'Test Stats Task', 'A test task for stats', 15, 'daily', true],
    );
    taskId = taskResult.rows[0].id;

    // Create task assignments and completions for testing
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Create completed assignment for yesterday
    const assignmentResult = await pool.query(
      'INSERT INTO task_assignments (household_id, task_id, child_id, date, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [householdId, taskId, childId, yesterday, 'completed'],
    );

    // Record completion with points
    await pool.query(
      "INSERT INTO task_completions (household_id, task_assignment_id, child_id, points_earned, completed_at) VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 day')",
      [householdId, assignmentResult.rows[0].id, childId, 15],
    );

    // Create pending assignment for today
    await pool.query(
      'INSERT INTO task_assignments (household_id, task_id, child_id, date, status) VALUES ($1, $2, $3, $4, $5)',
      [householdId, taskId, childId, today, 'pending'],
    );
  });

  after(async () => {
    // Cleanup
    await pool.query('DELETE FROM task_completions WHERE household_id = $1', [householdId]);
    await pool.query('DELETE FROM task_assignments WHERE household_id = $1', [householdId]);
    await pool.query('DELETE FROM tasks WHERE household_id = $1', [householdId]);
    await pool.query('DELETE FROM children WHERE household_id = $1', [householdId]);
    await pool.query('DELETE FROM household_members WHERE household_id = $1', [householdId]);
    await pool.query('DELETE FROM households WHERE id = $1', [householdId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [parentUserId, childUserId]);
    await pool.end();
    await app.close();
  });

  describe('GET /api/stats/dashboard', () => {
    test('should return dashboard stats for parent', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/stats/dashboard',
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      // Verify response structure
      assert.ok(typeof body.activeTasks === 'number');
      assert.ok(typeof body.weeklyCompleted === 'number');
      assert.ok(typeof body.totalPoints === 'number');
      assert.ok(Array.isArray(body.todaysTasks));
      assert.ok(Array.isArray(body.upcomingTasks));
    });

    test('should return dashboard stats with householdId parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/stats/dashboard?householdId=${householdId}`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      // Should have at least 1 active task (today's pending task)
      assert.ok(body.activeTasks >= 1);
    });

    test("should include today's tasks in response", async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/stats/dashboard?householdId=${householdId}`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      // Should have today's task in todaysTasks
      assert.ok(body.todaysTasks.length >= 1);

      // Verify task structure
      const task = body.todaysTasks[0];
      assert.ok(task.id);
      assert.ok(task.title);
      assert.ok(task.status);
      assert.ok(typeof task.points === 'number');
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/stats/dashboard',
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should return 404 for invalid household', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/stats/dashboard?householdId=00000000-0000-0000-0000-000000000000',
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 404);
    });
  });

  describe('GET /api/stats/leaderboard', () => {
    test('should return leaderboard for week period', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/stats/leaderboard?period=week',
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      // Verify response structure
      assert.ok(Array.isArray(body.rankings));

      // Should have our test child in rankings
      assert.ok(body.rankings.length >= 1);

      const ranking = body.rankings[0];
      assert.ok(ranking.userId);
      assert.ok(ranking.name);
      assert.ok(typeof ranking.points === 'number');
      assert.ok(typeof ranking.tasksCompleted === 'number');
    });

    test('should return leaderboard for month period', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/stats/leaderboard?period=month',
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.rankings));
    });

    test('should return leaderboard for alltime period', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/stats/leaderboard?period=alltime',
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.rankings));

      // With alltime, should include all completions
      const testChild = body.rankings.find((r: { userId: string }) => r.userId === childId);
      if (testChild) {
        // Should have at least 1 completion (from yesterday)
        assert.ok(testChild.tasksCompleted >= 1);
        assert.ok(testChild.points >= 15);
      }
    });

    test('should default to week period', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/stats/leaderboard',
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/stats/leaderboard',
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('GET /api/stats/achievements', () => {
    test('should return achievements for child user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/stats/achievements',
        headers: { Authorization: `Bearer ${childToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      // Verify response structure
      assert.ok(Array.isArray(body.unlocked));
      assert.ok(Array.isArray(body.locked));
      assert.ok(Array.isArray(body.progress));

      // Verify achievement structure
      if (body.unlocked.length > 0) {
        const achievement = body.unlocked[0];
        assert.ok(achievement.id);
        assert.ok(achievement.name);
        assert.ok(achievement.description);
        assert.ok(achievement.icon);
      }

      // Verify progress structure
      if (body.progress.length > 0) {
        const progressItem = body.progress[0];
        assert.ok(progressItem.achievementId);
        assert.ok(typeof progressItem.current === 'number');
        assert.ok(typeof progressItem.required === 'number');
      }
    });

    test('should return achievements with specific userId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/stats/achievements?userId=${childId}`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      assert.ok(Array.isArray(body.unlocked));
      assert.ok(Array.isArray(body.locked));
    });

    test('should return empty achievements for parent without child profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/stats/achievements',
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      // Parent has no child profile, so should have empty unlocked
      assert.ok(Array.isArray(body.unlocked));
      assert.strictEqual(body.unlocked.length, 0);

      // Should have all achievements as locked
      assert.ok(body.locked.length > 0);
    });

    test('should unlock first_task achievement after completing a task', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/stats/achievements',
        headers: { Authorization: `Bearer ${childToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      // Should have first_task unlocked (we completed 1 task in setup)
      const firstTask = body.unlocked.find((a: { id: string }) => a.id === 'first_task');
      assert.ok(firstTask, 'first_task achievement should be unlocked');
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/stats/achievements',
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should return 404 for invalid userId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/stats/achievements?userId=00000000-0000-0000-0000-000000000000',
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 404);
    });
  });
});
