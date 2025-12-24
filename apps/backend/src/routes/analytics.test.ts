import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { registerAndLogin } from '../test-helpers/auth.ts';

/**
 * Analytics API Tests
 */

describe('Analytics API', () => {
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
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'st44',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    // Create test users
    const parentEmail = `test-analytics-parent-${Date.now()}@example.com`;
    const childEmail = `test-analytics-child-${Date.now()}@example.com`;
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
      [`Test Analytics Household ${Date.now()}`],
    );
    householdId = householdResult.rows[0].id;

    // Add parent as admin
    await pool.query(
      'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
      [householdId, parentUserId, 'admin'],
    );

    // Create child profile and link to user
    const childProfileResult = await pool.query(
      'INSERT INTO children (household_id, user_id, name, birth_year) VALUES ($1, $2, $3, $4) RETURNING id',
      [householdId, childUserId, 'Test Child', 2015],
    );
    childId = childProfileResult.rows[0].id;

    // Create a task
    const taskResult = await pool.query(
      'INSERT INTO tasks (household_id, name, description, points, rule_type, active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [householdId, 'Test Task', 'A test task for analytics', 10, 'daily', true],
    );
    taskId = taskResult.rows[0].id;

    // Create task assignments with various statuses across multiple days
    const today = new Date();
    const dates = [];

    // Last 7 days of assignments
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    // Day 0 (today): 2 tasks, 1 completed
    await pool.query(
      'INSERT INTO task_assignments (household_id, task_id, child_id, date, status) VALUES ($1, $2, $3, $4, $5)',
      [householdId, taskId, childId, dates[0], 'pending'],
    );

    const completedAssignment1 = await pool.query(
      'INSERT INTO task_assignments (household_id, task_id, child_id, date, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [householdId, taskId, childId, dates[0], 'completed'],
    );

    // Record completion
    await pool.query(
      'INSERT INTO task_completions (household_id, task_assignment_id, child_id, points_earned, completed_at) VALUES ($1, $2, $3, $4, NOW())',
      [householdId, completedAssignment1.rows[0].id, childId, 10],
    );

    // Day 1: 1 task, 1 completed (100%)
    const completedAssignment2 = await pool.query(
      'INSERT INTO task_assignments (household_id, task_id, child_id, date, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [householdId, taskId, childId, dates[1], 'completed'],
    );

    await pool.query(
      'INSERT INTO task_completions (household_id, task_assignment_id, child_id, points_earned, completed_at) VALUES ($1, $2, $3, $4, NOW())',
      [householdId, completedAssignment2.rows[0].id, childId, 10],
    );

    // Day 2: 1 task, 1 completed (100%)
    const completedAssignment3 = await pool.query(
      'INSERT INTO task_assignments (household_id, task_id, child_id, date, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [householdId, taskId, childId, dates[2], 'completed'],
    );

    await pool.query(
      'INSERT INTO task_completions (household_id, task_assignment_id, child_id, points_earned, completed_at) VALUES ($1, $2, $3, $4, NOW())',
      [householdId, completedAssignment3.rows[0].id, childId, 10],
    );

    // Day 3: 1 task, 0 completed (breaks streak)
    await pool.query(
      'INSERT INTO task_assignments (household_id, task_id, child_id, date, status) VALUES ($1, $2, $3, $4, $5)',
      [householdId, taskId, childId, dates[3], 'pending'],
    );

    // Day 4: 1 task, 1 completed (100%)
    const completedAssignment4 = await pool.query(
      'INSERT INTO task_assignments (household_id, task_id, child_id, date, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [householdId, taskId, childId, dates[4], 'completed'],
    );

    await pool.query(
      'INSERT INTO task_completions (household_id, task_assignment_id, child_id, points_earned, completed_at) VALUES ($1, $2, $3, $4, NOW())',
      [householdId, completedAssignment4.rows[0].id, childId, 10],
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

  describe('GET /api/households/:householdId/analytics', () => {
    test('should return analytics for household (week period)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/analytics?period=week`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      // Verify structure
      assert.ok(body.householdId);
      assert.strictEqual(body.period, 'week');
      assert.ok(body.periodComparison);
      assert.ok(Array.isArray(body.childrenProgress));
      assert.ok(Array.isArray(body.streaks));
      assert.ok(Array.isArray(body.taskPopularity));
      assert.ok(body.generatedAt);

      // Verify period comparison has current and previous
      assert.ok(body.periodComparison.current);
      assert.ok(body.periodComparison.previous);
      assert.ok(body.periodComparison.change);
      assert.ok(typeof body.periodComparison.current.totalTasks === 'number');
      assert.ok(typeof body.periodComparison.current.completedTasks === 'number');
      assert.ok(typeof body.periodComparison.current.completionRate === 'number');

      // Verify children progress
      assert.ok(body.childrenProgress.length > 0);
      const childProgress = body.childrenProgress[0];
      assert.ok(childProgress.childId);
      assert.ok(childProgress.childName);
      assert.ok(Array.isArray(childProgress.dailyData));
      assert.ok(typeof childProgress.totalPointsEarned === 'number');
      assert.ok(typeof childProgress.averageCompletionRate === 'number');

      // Verify streaks
      assert.ok(body.streaks.length > 0);
      const streak = body.streaks[0];
      assert.ok(streak.childId);
      assert.ok(streak.childName);
      assert.ok(typeof streak.currentStreak === 'number');
      assert.ok(typeof streak.longestStreak === 'number');

      // Verify task popularity
      assert.ok(body.taskPopularity.length > 0);
      const taskPop = body.taskPopularity[0];
      assert.ok(taskPop.taskId);
      assert.ok(taskPop.taskName);
      assert.ok(typeof taskPop.totalAssignments === 'number');
      assert.ok(typeof taskPop.completedCount === 'number');
      assert.ok(typeof taskPop.completionRate === 'number');
    });

    test('should return analytics for month period', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/analytics?period=month`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.period, 'month');
    });

    test('should default to week period when not specified', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/analytics`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.period, 'week');
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/analytics`,
      });
      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject for non-member households', async () => {
      // Create another household that parent is not a member of
      const otherHouseholdResult = await pool.query(
        'INSERT INTO households (name) VALUES ($1) RETURNING id',
        ['Other Household'],
      );
      const otherHouseholdId = otherHouseholdResult.rows[0].id;

      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${otherHouseholdId}/analytics`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      // Should be 403 or 404 depending on middleware
      assert.ok(response.statusCode === 403 || response.statusCode === 404);

      // Cleanup
      await pool.query('DELETE FROM households WHERE id = $1', [otherHouseholdId]);
    });
  });

  describe('GET /api/children/me/analytics', () => {
    test('should return analytics for authenticated child', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/children/me/analytics?period=week',
        headers: { Authorization: `Bearer ${childToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      // Verify structure
      assert.ok(body.childId);
      assert.ok(body.childName);
      assert.ok(typeof body.currentStreak === 'number');
      assert.ok(typeof body.longestStreak === 'number');
      assert.ok(body.weekProgress);
      assert.ok(body.monthProgress);
      assert.ok(Array.isArray(body.dailyPoints));
      assert.ok(body.generatedAt);

      // Verify week progress
      assert.ok(typeof body.weekProgress.totalTasks === 'number');
      assert.ok(typeof body.weekProgress.completedTasks === 'number');
      assert.ok(typeof body.weekProgress.completionRate === 'number');
      assert.ok(typeof body.weekProgress.pointsEarned === 'number');

      // Verify month progress
      assert.ok(typeof body.monthProgress.totalTasks === 'number');
      assert.ok(typeof body.monthProgress.completedTasks === 'number');
      assert.ok(typeof body.monthProgress.completionRate === 'number');
      assert.ok(typeof body.monthProgress.pointsEarned === 'number');

      // Verify streak calculation
      // Based on test data: Day 1 and Day 2 had 100% completion (streak of 2)
      // Day 3 broke the streak, so current streak should be 0
      // Longest streak should be 2
      assert.ok(body.longestStreak >= 2);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/children/me/analytics',
      });
      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject for user without child profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/children/me/analytics',
        headers: { Authorization: `Bearer ${parentToken}` },
      });
      assert.strictEqual(response.statusCode, 404);
    });

    test('should support different periods', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/children/me/analytics?period=month',
        headers: { Authorization: `Bearer ${childToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(body.dailyPoints);
    });
  });

  describe('Analytics calculations', () => {
    test('should calculate completion rates correctly', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/analytics?period=week`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      // Should have data for the test child
      const childProgress = body.childrenProgress.find(
        (cp: { childId: string }) => cp.childId === childId,
      );
      assert.ok(childProgress);

      // Verify daily data contains completion rates
      assert.ok(childProgress.dailyData.length > 0);
      childProgress.dailyData.forEach(
        (day: { completionRate: number; totalTasks: number; completedTasks: number }) => {
          assert.ok(day.completionRate >= 0 && day.completionRate <= 100);
          if (day.totalTasks > 0) {
            const expectedRate = Math.round((day.completedTasks / day.totalTasks) * 100);
            assert.strictEqual(day.completionRate, expectedRate);
          }
        },
      );
    });

    test('should calculate points correctly', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/analytics?period=week`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      const childProgress = body.childrenProgress.find(
        (cp: { childId: string }) => cp.childId === childId,
      );
      assert.ok(childProgress);

      // Verify total points equals sum of daily points
      const sumDailyPoints = childProgress.dailyData.reduce(
        (sum: number, day: { pointsEarned: number }) => sum + day.pointsEarned,
        0,
      );
      assert.strictEqual(childProgress.totalPointsEarned, sumDailyPoints);
    });
  });
});
