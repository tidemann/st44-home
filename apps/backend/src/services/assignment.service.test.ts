import { test, describe, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import pg from 'pg';
import { AssignmentService } from './assignment.service.js';

/**
 * AssignmentService Unit Tests
 *
 * Tests assignment generation, completion, and querying
 */

describe('AssignmentService', () => {
  let pool: pg.Pool;
  let service: AssignmentService;
  let testHouseholdId: string;
  let testChildIds: string[];
  let testTaskId: string;

  before(async () => {
    pool = new pg.Pool({
      host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '55432'),
      database: process.env.TEST_DB_NAME || 'st44_test',
      user: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
    });
    service = new AssignmentService(pool);
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

    testChildIds = [child1Result.rows[0].id, child2Result.rows[0].id];

    // Create test task
    const taskResult = await pool.query(
      `INSERT INTO tasks (household_id, name, description, points, rule_type, rule_config, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [testHouseholdId, 'Test Task', 'Test description', 15, 'daily', '{}', true],
    );
    testTaskId = taskResult.rows[0].id;
  });

  afterEach(async () => {
    // Clean up test data in reverse dependency order
    if (testHouseholdId) {
      await pool.query('DELETE FROM task_completions WHERE household_id = $1', [testHouseholdId]);
      await pool.query('DELETE FROM task_assignments WHERE household_id = $1', [testHouseholdId]);
      await pool.query('DELETE FROM tasks WHERE household_id = $1', [testHouseholdId]);
      await pool.query('DELETE FROM children WHERE household_id = $1', [testHouseholdId]);
      await pool.query('DELETE FROM household_members WHERE household_id = $1', [testHouseholdId]);
      await pool.query('DELETE FROM households WHERE id = $1', [testHouseholdId]);
    }
  });

  // ==================== generateAssignments ====================

  describe('generateAssignments', () => {
    test('generates assignments successfully', async () => {
      const result = await service.generateAssignments(testHouseholdId, new Date('2025-01-01'), 5);

      assert.strictEqual(result.created, 5, 'Should create 5 assignments');
      assert.strictEqual(result.errors.length, 0, 'Should have no errors');
    });

    test('is idempotent', async () => {
      // First run
      const result1 = await service.generateAssignments(testHouseholdId, new Date('2025-01-01'), 5);
      assert.strictEqual(result1.created, 5);

      // Second run
      const result2 = await service.generateAssignments(testHouseholdId, new Date('2025-01-01'), 5);
      assert.strictEqual(result2.created, 0, 'Should not create duplicates');
      assert.strictEqual(result2.skipped, 5, 'Should skip existing');
    });
  });

  // ==================== completeAssignment ====================

  describe('completeAssignment', () => {
    let testAssignmentId: string;

    beforeEach(async () => {
      const assignmentResult = await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [testHouseholdId, testTaskId, testChildIds[0], '2025-01-01', 'pending'],
      );
      testAssignmentId = assignmentResult.rows[0].id;
    });

    test('completes assignment and records points', async () => {
      const result = await service.completeAssignment(testAssignmentId);

      assert.strictEqual(result.assignment.status, 'completed');
      assert.strictEqual(result.completion.pointsEarned, 15);
      assert.ok(result.completion.completedAt, 'Should have completedAt');

      // Verify in database
      const dbResult = await pool.query('SELECT status FROM task_assignments WHERE id = $1', [
        testAssignmentId,
      ]);
      assert.strictEqual(dbResult.rows[0].status, 'completed');

      // Verify completion record
      const completionResult = await pool.query(
        'SELECT points_earned FROM task_completions WHERE task_assignment_id = $1',
        [testAssignmentId],
      );
      assert.strictEqual(completionResult.rows[0].points_earned, 15);
    });

    test('is idempotent for already completed', async () => {
      // Complete first time
      const result1 = await service.completeAssignment(testAssignmentId);
      assert.strictEqual(result1.completion.pointsEarned, 15);

      // Complete again (should return existing)
      const result2 = await service.completeAssignment(testAssignmentId);
      assert.strictEqual(result2.completion.pointsEarned, 15);
      assert.strictEqual(
        result2.completion.id,
        result1.completion.id,
        'Should return same completion',
      );

      // Verify only one completion record
      const completionCount = await pool.query(
        'SELECT COUNT(*) as count FROM task_completions WHERE task_assignment_id = $1',
        [testAssignmentId],
      );
      assert.strictEqual(parseInt(completionCount.rows[0].count), 1);
    });

    test('throws for non-existent assignment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      try {
        await service.completeAssignment(fakeId);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('not found'));
      }
    });
  });

  // ==================== getChildAssignments ====================

  describe('getChildAssignments', () => {
    beforeEach(async () => {
      // Create assignments for child 1
      await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [testHouseholdId, testTaskId, testChildIds[0], '2025-01-01', 'pending'],
      );
      await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [testHouseholdId, testTaskId, testChildIds[0], '2025-01-02', 'completed'],
      );

      // Create assignment for child 2
      await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [testHouseholdId, testTaskId, testChildIds[1], '2025-01-01', 'pending'],
      );
    });

    test('returns assignments for specific child', async () => {
      const assignments = await service.getChildAssignments(
        testChildIds[0],
        '2025-01-01',
        '2025-01-31',
      );

      assert.strictEqual(assignments.length, 2, 'Should return 2 assignments for child 1');
      assert.ok(assignments.every((a) => a.childId === testChildIds[0]));
    });

    test('respects date range', async () => {
      const assignments = await service.getChildAssignments(
        testChildIds[0],
        '2025-01-01',
        '2025-01-01',
      );

      assert.strictEqual(assignments.length, 1, 'Should return only 1 assignment');
      assert.strictEqual(assignments[0].date, '2025-01-01');
    });

    test('includes task details', async () => {
      const assignments = await service.getChildAssignments(
        testChildIds[0],
        '2025-01-01',
        '2025-01-31',
      );

      assert.ok(assignments[0].taskName, 'Should have task name');
      assert.ok(assignments[0].childName, 'Should have child name');
    });

    test('returns empty array for child with no assignments', async () => {
      // Create new child with no assignments
      const newChildResult = await pool.query(
        'INSERT INTO children (household_id, name, birth_year) VALUES ($1, $2, $3) RETURNING id',
        [testHouseholdId, 'New Child', 2018],
      );
      const newChildId = newChildResult.rows[0].id;

      const assignments = await service.getChildAssignments(newChildId, '2025-01-01', '2025-01-31');

      assert.strictEqual(assignments.length, 0, 'Should return empty array');
    });
  });

  // ==================== getHouseholdAssignments ====================

  describe('getHouseholdAssignments', () => {
    beforeEach(async () => {
      // Create various assignments
      await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [testHouseholdId, testTaskId, testChildIds[0], '2025-01-01', 'pending'],
      );
      await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [testHouseholdId, testTaskId, testChildIds[0], '2025-01-02', 'completed'],
      );
      await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [testHouseholdId, testTaskId, testChildIds[1], '2025-01-01', 'pending'],
      );
    });

    test('returns all assignments for household', async () => {
      const assignments = await service.getHouseholdAssignments(
        testHouseholdId,
        '2025-01-01',
        '2025-01-31',
      );

      assert.strictEqual(assignments.length, 3, 'Should return all 3 assignments');
    });

    test('filters by childId', async () => {
      const assignments = await service.getHouseholdAssignments(
        testHouseholdId,
        '2025-01-01',
        '2025-01-31',
        { childId: testChildIds[0] },
      );

      assert.strictEqual(assignments.length, 2, 'Should return only child 1 assignments');
      assert.ok(assignments.every((a) => a.childId === testChildIds[0]));
    });

    test('filters by status', async () => {
      const assignments = await service.getHouseholdAssignments(
        testHouseholdId,
        '2025-01-01',
        '2025-01-31',
        { status: 'pending' },
      );

      assert.strictEqual(assignments.length, 2, 'Should return only pending assignments');
      assert.ok(assignments.every((a) => a.status === 'pending'));
    });

    test('combines filters', async () => {
      const assignments = await service.getHouseholdAssignments(
        testHouseholdId,
        '2025-01-01',
        '2025-01-31',
        { childId: testChildIds[0], status: 'completed' },
      );

      assert.strictEqual(assignments.length, 1);
      assert.strictEqual(assignments[0].childId, testChildIds[0]);
      assert.strictEqual(assignments[0].status, 'completed');
    });
  });

  // ==================== getAssignment ====================

  describe('getAssignment', () => {
    let testAssignmentId: string;

    beforeEach(async () => {
      const assignmentResult = await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [testHouseholdId, testTaskId, testChildIds[0], '2025-01-01', 'pending'],
      );
      testAssignmentId = assignmentResult.rows[0].id;
    });

    test('returns assignment for valid ID', async () => {
      const assignment = await service.getAssignment(testAssignmentId);

      assert.ok(assignment, 'Should return assignment');
      assert.strictEqual(assignment.id, testAssignmentId);
      assert.strictEqual(assignment.taskId, testTaskId);
      assert.strictEqual(assignment.childId, testChildIds[0]);
    });

    test('returns null for non-existent ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const assignment = await service.getAssignment(fakeId);

      assert.strictEqual(assignment, null);
    });
  });

  // ==================== createManualAssignment ====================

  describe('createManualAssignment', () => {
    test('creates assignment successfully', async () => {
      const assignment = await service.createManualAssignment(
        testHouseholdId,
        testTaskId,
        testChildIds[0],
        '2025-02-01',
      );

      assert.ok(assignment.id, 'Should have ID');
      assert.strictEqual(assignment.taskId, testTaskId);
      assert.strictEqual(assignment.childId, testChildIds[0]);
      assert.strictEqual(assignment.date, '2025-02-01');
      assert.strictEqual(assignment.status, 'pending');
    });

    test('creates household-wide assignment (null childId)', async () => {
      const assignment = await service.createManualAssignment(
        testHouseholdId,
        testTaskId,
        null,
        '2025-02-01',
      );

      assert.ok(assignment.id, 'Should have ID');
      assert.strictEqual(assignment.childId, null);
    });

    test('throws for duplicate assignment', async () => {
      await service.createManualAssignment(
        testHouseholdId,
        testTaskId,
        testChildIds[0],
        '2025-02-01',
      );

      try {
        await service.createManualAssignment(
          testHouseholdId,
          testTaskId,
          testChildIds[0],
          '2025-02-01',
        );
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('already exists'));
      }
    });

    test('throws for non-existent task', async () => {
      const fakeTaskId = '00000000-0000-0000-0000-000000000000';

      try {
        await service.createManualAssignment(
          testHouseholdId,
          fakeTaskId,
          testChildIds[0],
          '2025-02-01',
        );
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('Task not found'));
      }
    });

    test('throws for inactive task', async () => {
      // Deactivate task
      await pool.query('UPDATE tasks SET active = false WHERE id = $1', [testTaskId]);

      try {
        await service.createManualAssignment(
          testHouseholdId,
          testTaskId,
          testChildIds[0],
          '2025-02-01',
        );
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('inactive'));
      }
    });

    test('throws for child from different household', async () => {
      // Create another household with a child
      const otherHouseholdResult = await pool.query(
        'INSERT INTO households (name) VALUES ($1) RETURNING id',
        ['Other Household'],
      );
      const otherHouseholdId = otherHouseholdResult.rows[0].id;

      const otherChildResult = await pool.query(
        'INSERT INTO children (household_id, name, birth_year) VALUES ($1, $2, $3) RETURNING id',
        [otherHouseholdId, 'Other Child', 2016],
      );
      const otherChildId = otherChildResult.rows[0].id;

      try {
        await service.createManualAssignment(
          testHouseholdId,
          testTaskId,
          otherChildId,
          '2025-02-01',
        );
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('Child not found'));
      } finally {
        await pool.query('DELETE FROM children WHERE household_id = $1', [otherHouseholdId]);
        await pool.query('DELETE FROM households WHERE id = $1', [otherHouseholdId]);
      }
    });
  });

  // ==================== reassignAssignment ====================

  describe('reassignAssignment', () => {
    let testAssignmentId: string;

    beforeEach(async () => {
      const assignmentResult = await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [testHouseholdId, testTaskId, testChildIds[0], '2025-01-01', 'pending'],
      );
      testAssignmentId = assignmentResult.rows[0].id;
    });

    test('reassigns to different child', async () => {
      const result = await service.reassignAssignment(testAssignmentId, testChildIds[1]);

      assert.ok(result, 'Should return updated assignment');
      assert.strictEqual(result.childId, testChildIds[1]);

      // Verify in database
      const dbResult = await pool.query('SELECT child_id FROM task_assignments WHERE id = $1', [
        testAssignmentId,
      ]);
      assert.strictEqual(dbResult.rows[0].child_id, testChildIds[1]);
    });

    test('returns null for non-existent assignment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const result = await service.reassignAssignment(fakeId, testChildIds[1]);

      assert.strictEqual(result, null);
    });

    test('throws for completed assignment', async () => {
      // Complete the assignment
      await pool.query(`UPDATE task_assignments SET status = 'completed' WHERE id = $1`, [
        testAssignmentId,
      ]);

      try {
        await service.reassignAssignment(testAssignmentId, testChildIds[1]);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('pending'));
      }
    });

    test('throws for child from different household', async () => {
      // Create another household with a child
      const otherHouseholdResult = await pool.query(
        'INSERT INTO households (name) VALUES ($1) RETURNING id',
        ['Other Household'],
      );
      const otherHouseholdId = otherHouseholdResult.rows[0].id;

      const otherChildResult = await pool.query(
        'INSERT INTO children (household_id, name, birth_year) VALUES ($1, $2, $3) RETURNING id',
        [otherHouseholdId, 'Other Child', 2016],
      );
      const otherChildId = otherChildResult.rows[0].id;

      try {
        await service.reassignAssignment(testAssignmentId, otherChildId);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('Child not found'));
      } finally {
        await pool.query('DELETE FROM children WHERE household_id = $1', [otherHouseholdId]);
        await pool.query('DELETE FROM households WHERE id = $1', [otherHouseholdId]);
      }
    });
  });
});
