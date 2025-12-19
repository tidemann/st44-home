import { test, describe, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import pg from 'pg';
import { generateAssignments } from './assignment-generator.js';
import { addDays, getISOWeek } from 'date-fns';

/**
 * Assignment Generator Service Integration Tests
 *
 * Tests all 4 rule types, idempotency, and edge cases
 */

describe('Assignment Generator Service', () => {
  let pool: pg.Pool;
  let testHouseholdId: string;
  let testChildIds: string[];

  before(async () => {
    pool = new pg.Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'st44',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
  });

  after(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Create test household
    const householdResult = await pool.query(
      'INSERT INTO households (name) VALUES ($1) RETURNING id',
      [`Test Household ${Date.now()}`],
    );
    testHouseholdId = householdResult.rows[0].id;

    // Create test children
    const child1Result = await pool.query(
      'INSERT INTO children (household_id, name, birth_year) VALUES ($1, $2, $3) RETURNING id',
      [testHouseholdId, 'Alice', 2015],
    );

    const child2Result = await pool.query(
      'INSERT INTO children (household_id, name, birth_year) VALUES ($1, $2, $3) RETURNING id',
      [testHouseholdId, 'Bob', 2017],
    );

    const child3Result = await pool.query(
      'INSERT INTO children (household_id, name, birth_year) VALUES ($1, $2, $3) RETURNING id',
      [testHouseholdId, 'Charlie', 2019],
    );

    testChildIds = [child1Result.rows[0].id, child2Result.rows[0].id, child3Result.rows[0].id];
  });

  afterEach(async () => {
    // Clean up test data in reverse dependency order
    if (testHouseholdId) {
      await pool.query('DELETE FROM task_assignments WHERE household_id = $1', [testHouseholdId]);
      await pool.query('DELETE FROM tasks WHERE household_id = $1', [testHouseholdId]);
      await pool.query('DELETE FROM children WHERE household_id = $1', [testHouseholdId]);
      await pool.query('DELETE FROM household_members WHERE household_id = $1', [testHouseholdId]);
      await pool.query('DELETE FROM households WHERE id = $1', [testHouseholdId]);
    }
  });

  // ==================== Test Suite 1: Daily Rule Type ====================

  describe('Daily Rule Type', () => {
    test('generates assignment for each day', async () => {
      // Create daily task with no children assigned
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [testHouseholdId, 'Daily Chore', 'daily', {}, true],
      );
      const taskId = taskResult.rows[0].id;

      const startDate = new Date('2025-01-01');
      const days = 5;

      const result = await generateAssignments(testHouseholdId, startDate, days);

      assert.strictEqual(result.created, 5, 'Should create 5 assignments');
      assert.strictEqual(result.skipped, 0, 'Should skip 0 assignments');
      assert.strictEqual(result.errors.length, 0, 'Should have no errors');

      // Verify assignments in database
      const assignments = await pool.query(
        `SELECT date::text, child_id FROM task_assignments 
         WHERE task_id = $1 ORDER BY date`,
        [taskId],
      );

      assert.strictEqual(assignments.rows.length, 5);
      assert.strictEqual(assignments.rows[0].date, '2025-01-01');
      assert.strictEqual(assignments.rows[4].date, '2025-01-05');
      assert.strictEqual(assignments.rows[0].child_id, null, 'No children assigned');
    });

    test('rotates children when children array provided', async () => {
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          testHouseholdId,
          'Rotating Daily Chore',
          'daily',
          { assigned_children: [testChildIds[0], testChildIds[1]] },
          true,
        ],
      );
      const taskId = taskResult.rows[0].id;

      const startDate = new Date('2025-01-01');
      const days = 4;

      const result = await generateAssignments(testHouseholdId, startDate, days);

      assert.strictEqual(result.created, 4);
      assert.strictEqual(result.errors.length, 0);

      const assignments = await pool.query(
        `SELECT child_id FROM task_assignments 
         WHERE task_id = $1 ORDER BY date`,
        [taskId],
      );

      // Should alternate: Alice, Bob, Alice, Bob
      assert.strictEqual(assignments.rows[0].child_id, testChildIds[0]);
      assert.strictEqual(assignments.rows[1].child_id, testChildIds[1]);
      assert.strictEqual(assignments.rows[2].child_id, testChildIds[0]);
      assert.strictEqual(assignments.rows[3].child_id, testChildIds[1]);
    });

    test('creates null assignment when no children', async () => {
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [testHouseholdId, 'No Children Task', 'daily', { assigned_children: [] }, true],
      );
      const taskId = taskResult.rows[0].id;

      const startDate = new Date('2025-01-01');
      const result = await generateAssignments(testHouseholdId, startDate, 3);

      assert.strictEqual(result.created, 3);

      const assignments = await pool.query(
        `SELECT child_id FROM task_assignments WHERE task_id = $1`,
        [taskId],
      );

      assert.strictEqual(assignments.rows.length, 3);
      assert.strictEqual(assignments.rows[0].child_id, null);
    });

    test('skips inactive tasks', async () => {
      await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5)`,
        [testHouseholdId, 'Inactive Task', 'daily', {}, false],
      );

      const startDate = new Date('2025-01-01');
      const result = await generateAssignments(testHouseholdId, startDate, 5);

      assert.strictEqual(result.created, 0, 'Should not create assignments for inactive tasks');
    });

    test('handles date range boundaries', async () => {
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [testHouseholdId, 'Boundary Task', 'daily', {}, true],
      );
      const taskId = taskResult.rows[0].id;

      // Test single day
      const result1 = await generateAssignments(testHouseholdId, new Date('2025-01-01'), 1);
      assert.strictEqual(result1.created, 1);

      // Test 30 days (max allowed)
      const result2 = await generateAssignments(testHouseholdId, new Date('2025-02-01'), 30);
      assert.strictEqual(result2.created, 30);

      const totalAssignments = await pool.query(
        `SELECT COUNT(*) FROM task_assignments WHERE task_id = $1`,
        [taskId],
      );
      assert.strictEqual(parseInt(totalAssignments.rows[0].count), 31);
    });
  });

  // ==================== Test Suite 2: Repeating Rule Type ====================

  describe('Repeating Rule Type', () => {
    test('generates only on repeat_days', async () => {
      // Monday (1) and Friday (5)
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          testHouseholdId,
          'Weekday Task',
          'repeating',
          { repeat_days: [1, 5], assigned_children: [testChildIds[0]] },
          true,
        ],
      );
      const taskId = taskResult.rows[0].id;

      // Week: Mon(1/6), Tue(1/7), Wed(1/8), Thu(1/9), Fri(1/10), Sat(1/11), Sun(1/12)
      const startDate = new Date('2025-01-06'); // Monday
      const result = await generateAssignments(testHouseholdId, startDate, 7);

      assert.strictEqual(result.created, 2, 'Should create only for Monday and Friday');

      const assignments = await pool.query(
        `SELECT date::text FROM task_assignments WHERE task_id = $1 ORDER BY date`,
        [taskId],
      );

      assert.strictEqual(assignments.rows[0].date, '2025-01-06'); // Mon
      assert.strictEqual(assignments.rows[1].date, '2025-01-10'); // Fri
    });

    test('skips non-repeat days', async () => {
      // Only Saturday (6)
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          testHouseholdId,
          'Saturday Only',
          'repeating',
          { repeat_days: [6], assigned_children: [testChildIds[0]] },
          true,
        ],
      );
      const taskId = taskResult.rows[0].id;

      const startDate = new Date('2025-01-01'); // Wednesday
      const result = await generateAssignments(testHouseholdId, startDate, 7);

      assert.strictEqual(result.created, 1, 'Should create only for Saturday');

      const assignments = await pool.query(
        `SELECT date::text, EXTRACT(DOW FROM date) as day_of_week FROM task_assignments WHERE task_id = $1`,
        [taskId],
      );

      assert.strictEqual(parseInt(assignments.rows[0].day_of_week), 6); // Saturday
    });

    test('rotates children on repeat days', async () => {
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          testHouseholdId,
          'Rotating Repeating',
          'repeating',
          { repeat_days: [2, 4], assigned_children: [testChildIds[0], testChildIds[1]] },
          true,
        ],
      );
      const taskId = taskResult.rows[0].id;

      // Week: Mon(1/6), Tue(1/7), Wed(1/8), Thu(1/9), Fri(1/10), Sat(1/11), Sun(1/12)
      const startDate = new Date('2025-01-06');
      const result = await generateAssignments(testHouseholdId, startDate, 14);

      // Should have Tue(1/7), Thu(1/9), Tue(1/14), Thu(1/16) = 4 assignments
      assert.strictEqual(result.created, 4);

      const assignments = await pool.query(
        `SELECT child_id FROM task_assignments WHERE task_id = $1 ORDER BY date`,
        [taskId],
      );

      // Should alternate: Alice, Bob, Alice, Bob
      assert.strictEqual(assignments.rows[0].child_id, testChildIds[0]);
      assert.strictEqual(assignments.rows[1].child_id, testChildIds[1]);
      assert.strictEqual(assignments.rows[2].child_id, testChildIds[0]);
      assert.strictEqual(assignments.rows[3].child_id, testChildIds[1]);
    });

    test('handles Sunday (0) and Saturday (6)', async () => {
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          testHouseholdId,
          'Weekend Task',
          'repeating',
          { repeat_days: [0, 6], assigned_children: [testChildIds[0]] },
          true,
        ],
      );
      const taskId = taskResult.rows[0].id;

      const startDate = new Date('2025-01-01'); // Wednesday
      const result = await generateAssignments(testHouseholdId, startDate, 7);

      assert.strictEqual(result.created, 2, 'Should create for Saturday and Sunday');

      const assignments = await pool.query(
        `SELECT date::text, EXTRACT(DOW FROM date) as day_of_week FROM task_assignments WHERE task_id = $1 ORDER BY date`,
        [taskId],
      );

      assert.strictEqual(parseInt(assignments.rows[0].day_of_week), 6); // Saturday
      assert.strictEqual(parseInt(assignments.rows[1].day_of_week), 0); // Sunday
    });

    test('multiple repeat days work correctly', async () => {
      // All weekdays
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          testHouseholdId,
          'All Weekdays',
          'repeating',
          { repeat_days: [1, 2, 3, 4, 5], assigned_children: [testChildIds[0]] },
          true,
        ],
      );
      const taskId = taskResult.rows[0].id;

      const startDate = new Date('2025-01-06'); // Monday
      const result = await generateAssignments(testHouseholdId, startDate, 7);

      assert.strictEqual(result.created, 5, 'Should create for all 5 weekdays');

      const assignments = await pool.query(
        `SELECT date::text, EXTRACT(DOW FROM date) as day_of_week FROM task_assignments WHERE task_id = $1 ORDER BY date`,
        [taskId],
      );

      // Verify no weekend days
      for (const row of assignments.rows) {
        const day = parseInt(row.day_of_week);
        assert.ok(day >= 1 && day <= 5, 'Should only be weekdays');
      }
    });
  });

  // ==================== Test Suite 3: Weekly Rotation (Odd/Even) ====================

  describe('Weekly Rotation - Odd/Even', () => {
    test('assigns first child on odd weeks', async () => {
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          testHouseholdId,
          'Odd/Even Task',
          'weekly_rotation',
          {
            rotation_type: 'odd_even_week',
            assigned_children: [testChildIds[0], testChildIds[1]],
          },
          true,
        ],
      );
      const taskId = taskResult.rows[0].id;

      // Find an odd week (ISO week 1 of 2025 is odd)
      const startDate = new Date('2025-01-06'); // Week 2 (even)
      const weekNum = getISOWeek(startDate);
      assert.strictEqual(weekNum % 2, 0, 'Should be even week');

      const result = await generateAssignments(testHouseholdId, startDate, 7);
      assert.strictEqual(result.created, 7);

      const assignments = await pool.query(
        `SELECT DISTINCT child_id FROM task_assignments WHERE task_id = $1`,
        [taskId],
      );

      // Should all be second child (Bob) in even week
      assert.strictEqual(assignments.rows.length, 1);
      assert.strictEqual(assignments.rows[0].child_id, testChildIds[1]);
    });

    test('assigns second child on even weeks', async () => {
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          testHouseholdId,
          'Odd/Even Task',
          'weekly_rotation',
          {
            rotation_type: 'odd_even_week',
            assigned_children: [testChildIds[0], testChildIds[1]],
          },
          true,
        ],
      );
      const taskId = taskResult.rows[0].id;

      // Week 1 of 2025 (odd)
      const startDate = new Date('2025-01-01'); // Week 1
      const weekNum = getISOWeek(startDate);
      assert.strictEqual(weekNum % 2, 1, 'Should be odd week');

      const result = await generateAssignments(testHouseholdId, startDate, 7);
      assert.strictEqual(result.created, 7);

      const assignments = await pool.query(
        `SELECT DISTINCT child_id FROM task_assignments WHERE task_id = $1`,
        [taskId],
      );

      // Should all be first child (Alice) in odd week
      assert.strictEqual(assignments.rows.length, 1);
      assert.strictEqual(assignments.rows[0].child_id, testChildIds[0]);
    });

    test('cycles through 3+ children (modulo)', async () => {
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          testHouseholdId,
          'Three Children',
          'weekly_rotation',
          {
            rotation_type: 'odd_even_week',
            assigned_children: [testChildIds[0], testChildIds[1], testChildIds[2]],
          },
          true,
        ],
      );
      const taskId = taskResult.rows[0].id;

      // Odd week (week 1)
      const startDate = new Date('2025-01-01');
      const result = await generateAssignments(testHouseholdId, startDate, 7);

      const assignments = await pool.query(
        `SELECT DISTINCT child_id FROM task_assignments WHERE task_id = $1`,
        [taskId],
      );

      // Odd week (1): index = 0 (Alice)
      assert.strictEqual(assignments.rows[0].child_id, testChildIds[0]);
    });

    test('calculates ISO week correctly', async () => {
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          testHouseholdId,
          'ISO Week Test',
          'weekly_rotation',
          {
            rotation_type: 'odd_even_week',
            assigned_children: [testChildIds[0], testChildIds[1]],
          },
          true,
        ],
      );
      const taskId = taskResult.rows[0].id;

      // Test known ISO week dates
      // Jan 4, 2025 is always in week 1 (odd)
      const jan4 = new Date('2025-01-04');
      assert.strictEqual(getISOWeek(jan4), 1);

      const result = await generateAssignments(testHouseholdId, jan4, 1);

      const assignment = await pool.query(
        `SELECT child_id FROM task_assignments WHERE task_id = $1`,
        [taskId],
      );

      assert.strictEqual(assignment.rows[0].child_id, testChildIds[0], 'Week 1 is odd');
    });

    test('handles year boundaries (week 52/53 → week 1)', async () => {
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          testHouseholdId,
          'Year Boundary',
          'weekly_rotation',
          {
            rotation_type: 'odd_even_week',
            assigned_children: [testChildIds[0], testChildIds[1]],
          },
          true,
        ],
      );
      const taskId = taskResult.rows[0].id;

      // Dec 30, 2024 is in week 1 of 2025 (ISO week rules)
      const dec30 = new Date('2024-12-30');
      const weekNum = getISOWeek(dec30);

      await generateAssignments(testHouseholdId, dec30, 1);

      const assignment = await pool.query(
        `SELECT child_id FROM task_assignments WHERE task_id = $1`,
        [taskId],
      );

      // Verify assignment exists and uses correct week parity
      assert.ok(assignment.rows.length > 0);
      const expectedChild = weekNum % 2 === 1 ? testChildIds[0] : testChildIds[1];
      assert.strictEqual(assignment.rows[0].child_id, expectedChild);
    });
  });

  // ==================== Test Suite 4: Weekly Rotation (Alternating) ====================

  describe('Weekly Rotation - Alternating', () => {
    test('rotates to next child based on last assignment', async () => {
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          testHouseholdId,
          'Alternating Task',
          'weekly_rotation',
          {
            rotation_type: 'alternating',
            assigned_children: [testChildIds[0], testChildIds[1]],
          },
          true,
        ],
      );
      const taskId = taskResult.rows[0].id;

      // Create a past assignment for Alice
      await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [testHouseholdId, taskId, testChildIds[0], '2024-12-01', 'completed'],
      );

      // Generate new assignments
      const startDate = new Date('2025-01-01');
      const result = await generateAssignments(testHouseholdId, startDate, 7);

      assert.strictEqual(result.created, 7);

      const assignments = await pool.query(
        `SELECT DISTINCT child_id FROM task_assignments 
         WHERE task_id = $1 AND date >= $2`,
        [taskId, '2025-01-01'],
      );

      // Should be Bob (next after Alice)
      assert.strictEqual(assignments.rows.length, 1);
      assert.strictEqual(assignments.rows[0].child_id, testChildIds[1]);
    });

    test('handles first assignment (no history)', async () => {
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          testHouseholdId,
          'First Time',
          'weekly_rotation',
          {
            rotation_type: 'alternating',
            assigned_children: [testChildIds[0], testChildIds[1]],
          },
          true,
        ],
      );
      const taskId = taskResult.rows[0].id;

      const startDate = new Date('2025-01-01');
      const result = await generateAssignments(testHouseholdId, startDate, 7);

      assert.strictEqual(result.created, 7);

      const assignments = await pool.query(
        `SELECT DISTINCT child_id FROM task_assignments WHERE task_id = $1`,
        [taskId],
      );

      // Should start with first child (Alice)
      assert.strictEqual(assignments.rows[0].child_id, testChildIds[0]);
    });

    test('cycles back to first child after last', async () => {
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          testHouseholdId,
          'Cycling Task',
          'weekly_rotation',
          {
            rotation_type: 'alternating',
            assigned_children: [testChildIds[0], testChildIds[1], testChildIds[2]],
          },
          true,
        ],
      );
      const taskId = taskResult.rows[0].id;

      // Last assignment was Charlie (last child)
      await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [testHouseholdId, taskId, testChildIds[2], '2024-12-01', 'completed'],
      );

      const startDate = new Date('2025-01-01');
      const result = await generateAssignments(testHouseholdId, startDate, 7);

      const assignments = await pool.query(
        `SELECT DISTINCT child_id FROM task_assignments 
         WHERE task_id = $1 AND date >= $2`,
        [taskId, '2025-01-01'],
      );

      // Should cycle back to Alice
      assert.strictEqual(assignments.rows[0].child_id, testChildIds[0]);
    });

    test('queries correct household for history', async () => {
      // Create second household
      const household2Result = await pool.query(
        'INSERT INTO households (name) VALUES ($1) RETURNING id',
        ['Other Household'],
      );
      const household2Id = household2Result.rows[0].id;

      const child2Result = await pool.query(
        'INSERT INTO children (household_id, name, birth_year) VALUES ($1, $2, $3) RETURNING id',
        [household2Id, 'Other Child', 2015],
      );
      const otherChildId = child2Result.rows[0].id;

      // Create task in household 2
      const task2Result = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          household2Id,
          'Other Task',
          'weekly_rotation',
          {
            rotation_type: 'alternating',
            assigned_children: [otherChildId],
          },
          true,
        ],
      );
      const task2Id = task2Result.rows[0].id;

      // Create original task in household 1
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          testHouseholdId,
          'Our Task',
          'weekly_rotation',
          {
            rotation_type: 'alternating',
            assigned_children: [testChildIds[0], testChildIds[1]],
          },
          true,
        ],
      );
      const taskId = taskResult.rows[0].id;

      // Add history for task2 (shouldn't affect task1)
      await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [household2Id, task2Id, otherChildId, '2024-12-01', 'completed'],
      );

      // Generate for household 1
      const result = await generateAssignments(testHouseholdId, new Date('2025-01-01'), 7);

      assert.strictEqual(result.created, 7);

      const assignments = await pool.query(
        `SELECT DISTINCT child_id FROM task_assignments WHERE task_id = $1`,
        [taskId],
      );

      // Should use household 1's children, not affected by household 2
      assert.strictEqual(assignments.rows[0].child_id, testChildIds[0]);

      // Cleanup household 2
      await pool.query('DELETE FROM task_assignments WHERE household_id = $1', [household2Id]);
      await pool.query('DELETE FROM tasks WHERE household_id = $1', [household2Id]);
      await pool.query('DELETE FROM children WHERE household_id = $1', [household2Id]);
      await pool.query('DELETE FROM households WHERE id = $1', [household2Id]);
    });

    test('handles multiple tasks with separate rotations', async () => {
      // Task 1: Last was Alice
      const task1Result = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          testHouseholdId,
          'Task 1',
          'weekly_rotation',
          {
            rotation_type: 'alternating',
            assigned_children: [testChildIds[0], testChildIds[1]],
          },
          true,
        ],
      );
      const task1Id = task1Result.rows[0].id;

      await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [testHouseholdId, task1Id, testChildIds[0], '2024-12-01', 'completed'],
      );

      // Task 2: Last was Bob
      const task2Result = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          testHouseholdId,
          'Task 2',
          'weekly_rotation',
          {
            rotation_type: 'alternating',
            assigned_children: [testChildIds[0], testChildIds[1]],
          },
          true,
        ],
      );
      const task2Id = task2Result.rows[0].id;

      await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [testHouseholdId, task2Id, testChildIds[1], '2024-12-01', 'completed'],
      );

      const result = await generateAssignments(testHouseholdId, new Date('2025-01-01'), 7);

      assert.strictEqual(result.created, 14); // 7 days × 2 tasks

      // Task 1 should have Bob (next after Alice)
      const task1Assignments = await pool.query(
        `SELECT DISTINCT child_id FROM task_assignments 
         WHERE task_id = $1 AND date >= $2`,
        [task1Id, '2025-01-01'],
      );
      assert.strictEqual(task1Assignments.rows[0].child_id, testChildIds[1]);

      // Task 2 should have Alice (next after Bob)
      const task2Assignments = await pool.query(
        `SELECT DISTINCT child_id FROM task_assignments 
         WHERE task_id = $1 AND date >= $2`,
        [task2Id, '2025-01-01'],
      );
      assert.strictEqual(task2Assignments.rows[0].child_id, testChildIds[0]);
    });
  });

  // ==================== Test Suite 5: Idempotency ====================

  describe('Idempotency', () => {
    test('re-running same date range skips existing', async () => {
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [testHouseholdId, 'Idempotent Task', 'daily', {}, true],
      );

      const startDate = new Date('2025-01-01');

      // First run
      const result1 = await generateAssignments(testHouseholdId, startDate, 5);
      assert.strictEqual(result1.created, 5);
      assert.strictEqual(result1.skipped, 0);

      // Second run (same date range)
      const result2 = await generateAssignments(testHouseholdId, startDate, 5);
      assert.strictEqual(result2.created, 0);
      assert.strictEqual(result2.skipped, 5);

      // Third run (still idempotent)
      const result3 = await generateAssignments(testHouseholdId, startDate, 5);
      assert.strictEqual(result3.created, 0);
      assert.strictEqual(result3.skipped, 5);
    });

    test('returns correct skipped count', async () => {
      await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5)`,
        [testHouseholdId, 'Task 1', 'daily', {}, true],
      );

      await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5)`,
        [testHouseholdId, 'Task 2', 'daily', {}, true],
      );

      const startDate = new Date('2025-01-01');

      // First run: 2 tasks × 3 days = 6 created
      const result1 = await generateAssignments(testHouseholdId, startDate, 3);
      assert.strictEqual(result1.created, 6);

      // Second run: all 6 skipped
      const result2 = await generateAssignments(testHouseholdId, startDate, 3);
      assert.strictEqual(result2.skipped, 6);
    });

    test('no duplicate assignments created', async () => {
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [testHouseholdId, 'No Dupes', 'daily', {}, true],
      );
      const taskId = taskResult.rows[0].id;

      const startDate = new Date('2025-01-01');

      // Run multiple times
      await generateAssignments(testHouseholdId, startDate, 5);
      await generateAssignments(testHouseholdId, startDate, 5);
      await generateAssignments(testHouseholdId, startDate, 5);

      // Verify only 5 assignments exist
      const count = await pool.query('SELECT COUNT(*) FROM task_assignments WHERE task_id = $1', [
        taskId,
      ]);
      assert.strictEqual(parseInt(count.rows[0].count), 5);
    });

    test('ON CONFLICT DO NOTHING works', async () => {
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [testHouseholdId, 'Conflict Test', 'daily', { assigned_children: [testChildIds[0]] }, true],
      );
      const taskId = taskResult.rows[0].id;

      const startDate = new Date('2025-01-01');

      // First run
      const result1 = await generateAssignments(testHouseholdId, startDate, 3);
      assert.strictEqual(result1.created, 3);
      assert.strictEqual(result1.errors.length, 0);

      // Second run should not error
      const result2 = await generateAssignments(testHouseholdId, startDate, 3);
      assert.strictEqual(result2.created, 0);
      assert.strictEqual(result2.errors.length, 0);

      // Verify unique constraint is working
      const count = await pool.query('SELECT COUNT(*) FROM task_assignments WHERE task_id = $1', [
        taskId,
      ]);
      assert.strictEqual(parseInt(count.rows[0].count), 3);
    });
  });

  // ==================== Test Suite 6: Edge Cases ====================

  describe('Edge Cases', () => {
    test('empty children array (null assignments)', async () => {
      const taskResult = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [testHouseholdId, 'No Children', 'daily', { assigned_children: [] }, true],
      );
      const taskId = taskResult.rows[0].id;

      const result = await generateAssignments(testHouseholdId, new Date('2025-01-01'), 5);

      assert.strictEqual(result.created, 5);

      const assignments = await pool.query(
        'SELECT child_id FROM task_assignments WHERE task_id = $1',
        [taskId],
      );

      assignments.rows.forEach((row) => {
        assert.strictEqual(row.child_id, null);
      });
    });

    test('no active tasks (no assignments)', async () => {
      // All tasks inactive
      await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5)`,
        [testHouseholdId, 'Inactive 1', 'daily', {}, false],
      );

      await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5)`,
        [testHouseholdId, 'Inactive 2', 'daily', {}, false],
      );

      const result = await generateAssignments(testHouseholdId, new Date('2025-01-01'), 5);

      assert.strictEqual(result.created, 0);
      assert.strictEqual(result.skipped, 0);
    });

    test('invalid household_id (no tasks found)', async () => {
      const fakeHouseholdId = '00000000-0000-0000-0000-000000000000';

      const result = await generateAssignments(fakeHouseholdId, new Date('2025-01-01'), 5);

      assert.strictEqual(result.created, 0);
      assert.strictEqual(result.skipped, 0);
      assert.strictEqual(result.errors.length, 0);
    });

    test('30-day generation (batch performance)', async () => {
      // Create 5 tasks
      for (let i = 1; i <= 5; i++) {
        await pool.query(
          `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
           VALUES ($1, $2, $3, $4, $5)`,
          [testHouseholdId, `Task ${i}`, 'daily', {}, true],
        );
      }

      const startTime = Date.now();
      const result = await generateAssignments(testHouseholdId, new Date('2025-01-01'), 30);
      const duration = Date.now() - startTime;

      // Should create 5 tasks × 30 days = 150 assignments
      assert.strictEqual(result.created, 150);
      assert.strictEqual(result.errors.length, 0);

      // Should complete in reasonable time (< 5 seconds)
      assert.ok(duration < 5000, `Generation took ${duration}ms, expected < 5000ms`);
    });

    test('validation errors', async () => {
      // Empty household_id
      const result1 = await generateAssignments('', new Date('2025-01-01'), 5);
      assert.strictEqual(result1.errors.length, 1);
      assert.ok(result1.errors[0].includes('household_id'));

      // Invalid days (too low)
      const result2 = await generateAssignments(testHouseholdId, new Date('2025-01-01'), 0);
      assert.strictEqual(result2.errors.length, 1);
      assert.ok(result2.errors[0].includes('days must be between'));

      // Invalid days (too high)
      const result3 = await generateAssignments(testHouseholdId, new Date('2025-01-01'), 400);
      assert.strictEqual(result3.errors.length, 1);
      assert.ok(result3.errors[0].includes('days must be between'));
    });
  });
});
