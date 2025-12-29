import { test, describe, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import pg from 'pg';
import {
  TaskService,
  hasValidationErrors,
  type TaskData,
  type RuleConfig,
} from './task.service.js';

/**
 * TaskService Unit Tests
 *
 * Tests task validation, CRUD operations, and business rules
 */

describe('TaskService', () => {
  let pool: pg.Pool;
  let service: TaskService;
  let testHouseholdId: string;
  let testChildIds: string[];

  before(async () => {
    pool = new pg.Pool({
      host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '55432'),
      database: process.env.TEST_DB_NAME || 'st44_test',
      user: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
    });
    service = new TaskService(pool);
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

  // ==================== validateTaskRules ====================

  describe('validateTaskRules', () => {
    test('validates daily task with no errors', () => {
      const data: TaskData = {
        name: 'Daily Task',
        ruleType: 'daily',
        ruleConfig: {},
      };

      const errors = service.validateTaskRules(data);
      assert.strictEqual(errors.length, 0, 'Daily task should have no validation errors');
    });

    test('validates weekly_rotation requires rotationType', () => {
      const data: TaskData = {
        name: 'Rotation Task',
        ruleType: 'weekly_rotation',
        ruleConfig: {},
      };

      const errors = service.validateTaskRules(data);
      assert.strictEqual(errors.length, 1, 'Should have one validation error');
      assert.ok(errors[0].message.includes('rotationType required'));
    });

    test('validates weekly_rotation with valid rotationType', () => {
      const data: TaskData = {
        name: 'Rotation Task',
        ruleType: 'weekly_rotation',
        ruleConfig: { rotationType: 'odd_even_week' },
      };

      const errors = service.validateTaskRules(data);
      assert.strictEqual(errors.length, 0, 'Should have no validation errors');
    });

    test('validates weekly_rotation with invalid rotationType', () => {
      const data: TaskData = {
        name: 'Rotation Task',
        ruleType: 'weekly_rotation',
        ruleConfig: { rotationType: 'invalid' as 'odd_even_week' },
      };

      const errors = service.validateTaskRules(data);
      assert.strictEqual(errors.length, 1, 'Should have one validation error');
      assert.ok(errors[0].message.includes('must be odd_even_week or alternating'));
    });

    test('validates repeating requires repeatDays', () => {
      const data: TaskData = {
        name: 'Repeating Task',
        ruleType: 'repeating',
        ruleConfig: {},
      };

      const errors = service.validateTaskRules(data);
      assert.strictEqual(errors.length, 1, 'Should have one validation error');
      assert.ok(errors[0].message.includes('repeatDays required'));
    });

    test('validates repeating with empty repeatDays', () => {
      const data: TaskData = {
        name: 'Repeating Task',
        ruleType: 'repeating',
        ruleConfig: { repeatDays: [] },
      };

      const errors = service.validateTaskRules(data);
      assert.strictEqual(errors.length, 1, 'Should have one validation error');
      assert.ok(errors[0].message.includes('repeatDays required'));
    });

    test('validates repeating with valid repeatDays', () => {
      const data: TaskData = {
        name: 'Repeating Task',
        ruleType: 'repeating',
        ruleConfig: { repeatDays: [1, 3, 5] },
      };

      const errors = service.validateTaskRules(data);
      assert.strictEqual(errors.length, 0, 'Should have no validation errors');
    });

    test('validates repeating with invalid repeatDays values', () => {
      const data: TaskData = {
        name: 'Repeating Task',
        ruleType: 'repeating',
        ruleConfig: { repeatDays: [0, 7, -1] },
      };

      const errors = service.validateTaskRules(data);
      assert.strictEqual(errors.length, 1, 'Should have one validation error');
      assert.ok(errors[0].message.includes('between 0 (Sunday) and 6 (Saturday)'));
    });

    test('handles null ruleConfig', () => {
      const data: TaskData = {
        name: 'Daily Task',
        ruleType: 'daily',
        ruleConfig: null,
      };

      const errors = service.validateTaskRules(data);
      assert.strictEqual(
        errors.length,
        0,
        'Should have no validation errors for daily with null config',
      );
    });
  });

  // ==================== validateChildrenBelongToHousehold ====================

  describe('validateChildrenBelongToHousehold', () => {
    test('returns true for empty array', async () => {
      const result = await service.validateChildrenBelongToHousehold([], testHouseholdId);
      assert.strictEqual(result, true, 'Empty array should be valid');
    });

    test('returns true for valid children', async () => {
      const result = await service.validateChildrenBelongToHousehold(testChildIds, testHouseholdId);
      assert.strictEqual(result, true, 'Valid children should be valid');
    });

    test('returns false for invalid children', async () => {
      const fakeChildId = '00000000-0000-0000-0000-000000000000';
      const result = await service.validateChildrenBelongToHousehold(
        [fakeChildId],
        testHouseholdId,
      );
      assert.strictEqual(result, false, 'Invalid child should be invalid');
    });

    test('returns false for mixed valid and invalid children', async () => {
      const fakeChildId = '00000000-0000-0000-0000-000000000000';
      const result = await service.validateChildrenBelongToHousehold(
        [testChildIds[0], fakeChildId],
        testHouseholdId,
      );
      assert.strictEqual(result, false, 'Mixed valid/invalid should be invalid');
    });

    test('returns false for children from different household', async () => {
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
        const result = await service.validateChildrenBelongToHousehold(
          [otherChildId],
          testHouseholdId,
        );
        assert.strictEqual(result, false, 'Child from other household should be invalid');
      } finally {
        await pool.query('DELETE FROM children WHERE household_id = $1', [otherHouseholdId]);
        await pool.query('DELETE FROM households WHERE id = $1', [otherHouseholdId]);
      }
    });
  });

  // ==================== createTask ====================

  describe('createTask', () => {
    test('creates daily task successfully', async () => {
      const data: TaskData = {
        name: 'Daily Chore',
        description: 'Do this every day',
        points: 15,
        ruleType: 'daily',
        ruleConfig: { assignedChildren: testChildIds },
      };

      const task = await service.createTask(testHouseholdId, data);

      assert.ok(task.id, 'Should have an ID');
      assert.strictEqual(task.householdId, testHouseholdId);
      assert.strictEqual(task.name, 'Daily Chore');
      assert.strictEqual(task.description, 'Do this every day');
      assert.strictEqual(task.points, 15);
      assert.strictEqual(task.ruleType, 'daily');
      assert.strictEqual(task.active, true);
      assert.ok(task.createdAt, 'Should have createdAt');
      assert.ok(task.updatedAt, 'Should have updatedAt');
    });

    test('creates task with default points', async () => {
      const data: TaskData = {
        name: 'Default Points Task',
        ruleType: 'daily',
      };

      const task = await service.createTask(testHouseholdId, data);
      assert.strictEqual(task.points, 10, 'Default points should be 10');
    });

    test('trims whitespace from name', async () => {
      const data: TaskData = {
        name: '  Trimmed Name  ',
        ruleType: 'daily',
      };

      const task = await service.createTask(testHouseholdId, data);
      assert.strictEqual(task.name, 'Trimmed Name');
    });

    test('throws validation error for invalid weekly_rotation', async () => {
      const data: TaskData = {
        name: 'Invalid Rotation',
        ruleType: 'weekly_rotation',
        ruleConfig: {},
      };

      try {
        await service.createTask(testHouseholdId, data);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(hasValidationErrors(error), 'Should have validation errors');
        assert.strictEqual(error.validationErrors.length, 1);
      }
    });

    test('throws error for invalid children', async () => {
      const fakeChildId = '00000000-0000-0000-0000-000000000000';
      const data: TaskData = {
        name: 'Invalid Children Task',
        ruleType: 'daily',
        ruleConfig: { assignedChildren: [fakeChildId] },
      };

      try {
        await service.createTask(testHouseholdId, data);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('do not belong to this household'));
      }
    });

    test('creates weekly_rotation task with valid config', async () => {
      const data: TaskData = {
        name: 'Weekly Rotation Task',
        ruleType: 'weekly_rotation',
        ruleConfig: {
          rotationType: 'alternating',
          assignedChildren: testChildIds,
        },
      };

      const task = await service.createTask(testHouseholdId, data);
      assert.strictEqual(task.ruleType, 'weekly_rotation');
      assert.deepStrictEqual(task.ruleConfig?.rotationType, 'alternating');
    });

    test('creates repeating task with valid config', async () => {
      const data: TaskData = {
        name: 'Repeating Task',
        ruleType: 'repeating',
        ruleConfig: {
          repeatDays: [1, 3, 5],
          assignedChildren: testChildIds,
        },
      };

      const task = await service.createTask(testHouseholdId, data);
      assert.strictEqual(task.ruleType, 'repeating');
      assert.deepStrictEqual(task.ruleConfig?.repeatDays, [1, 3, 5]);
    });
  });

  // ==================== updateTask ====================

  describe('updateTask', () => {
    let existingTaskId: string;

    beforeEach(async () => {
      const result = await pool.query(
        `INSERT INTO tasks (household_id, name, description, points, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [testHouseholdId, 'Existing Task', 'Original description', 10, 'daily', '{}', true],
      );
      existingTaskId = result.rows[0].id;
    });

    test('updates task name', async () => {
      const result = await service.updateTask(existingTaskId, testHouseholdId, {
        name: 'Updated Name',
      });

      assert.ok(result, 'Should return updated task');
      assert.strictEqual(result.name, 'Updated Name');
    });

    test('updates task description', async () => {
      const result = await service.updateTask(existingTaskId, testHouseholdId, {
        description: 'New description',
      });

      assert.ok(result, 'Should return updated task');
      assert.strictEqual(result.description, 'New description');
    });

    test('updates task points', async () => {
      const result = await service.updateTask(existingTaskId, testHouseholdId, {
        points: 25,
      });

      assert.ok(result, 'Should return updated task');
      assert.strictEqual(result.points, 25);
    });

    test('updates task active status', async () => {
      const result = await service.updateTask(existingTaskId, testHouseholdId, {
        active: false,
      });

      assert.ok(result, 'Should return updated task');
      assert.strictEqual(result.active, false);
    });

    test('returns null for non-existent task', async () => {
      const fakeTaskId = '00000000-0000-0000-0000-000000000000';
      const result = await service.updateTask(fakeTaskId, testHouseholdId, {
        name: 'Updated',
      });

      assert.strictEqual(result, null, 'Should return null for non-existent task');
    });

    test('returns null for task in different household', async () => {
      const otherHouseholdResult = await pool.query(
        'INSERT INTO households (name) VALUES ($1) RETURNING id',
        ['Other Household'],
      );
      const otherHouseholdId = otherHouseholdResult.rows[0].id;

      try {
        const result = await service.updateTask(existingTaskId, otherHouseholdId, {
          name: 'Updated',
        });
        assert.strictEqual(result, null, 'Should return null for task in different household');
      } finally {
        await pool.query('DELETE FROM households WHERE id = $1', [otherHouseholdId]);
      }
    });

    test('throws error for empty update', async () => {
      try {
        await service.updateTask(existingTaskId, testHouseholdId, {});
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('No fields to update'));
      }
    });

    test('validates rule config when changing rule type', async () => {
      try {
        await service.updateTask(existingTaskId, testHouseholdId, {
          ruleType: 'weekly_rotation',
          ruleConfig: {},
        });
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(hasValidationErrors(error), 'Should have validation errors');
      }
    });
  });

  // ==================== deactivateTask ====================

  describe('deactivateTask', () => {
    let existingTaskId: string;

    beforeEach(async () => {
      const result = await pool.query(
        `INSERT INTO tasks (household_id, name, rule_type, active)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [testHouseholdId, 'Active Task', 'daily', true],
      );
      existingTaskId = result.rows[0].id;
    });

    test('deactivates task successfully', async () => {
      const result = await service.deactivateTask(existingTaskId, testHouseholdId);
      assert.strictEqual(result, true, 'Should return true for successful deactivation');

      // Verify in database
      const dbResult = await pool.query('SELECT active FROM tasks WHERE id = $1', [existingTaskId]);
      assert.strictEqual(dbResult.rows[0].active, false, 'Task should be inactive in database');
    });

    test('returns false for non-existent task', async () => {
      const fakeTaskId = '00000000-0000-0000-0000-000000000000';
      const result = await service.deactivateTask(fakeTaskId, testHouseholdId);
      assert.strictEqual(result, false, 'Should return false for non-existent task');
    });

    test('returns false for task in different household', async () => {
      const otherHouseholdResult = await pool.query(
        'INSERT INTO households (name) VALUES ($1) RETURNING id',
        ['Other Household'],
      );
      const otherHouseholdId = otherHouseholdResult.rows[0].id;

      try {
        const result = await service.deactivateTask(existingTaskId, otherHouseholdId);
        assert.strictEqual(result, false, 'Should return false for task in different household');
      } finally {
        await pool.query('DELETE FROM households WHERE id = $1', [otherHouseholdId]);
      }
    });
  });

  // ==================== getTask ====================

  describe('getTask', () => {
    let existingTaskId: string;

    beforeEach(async () => {
      const result = await pool.query(
        `INSERT INTO tasks (household_id, name, description, points, rule_type, rule_config, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          testHouseholdId,
          'Test Task',
          'Description',
          20,
          'daily',
          '{"assignedChildren": []}',
          true,
        ],
      );
      existingTaskId = result.rows[0].id;
    });

    test('returns task for valid ID and household', async () => {
      const task = await service.getTask(existingTaskId, testHouseholdId);

      assert.ok(task, 'Should return task');
      assert.strictEqual(task.id, existingTaskId);
      assert.strictEqual(task.name, 'Test Task');
      assert.strictEqual(task.description, 'Description');
      assert.strictEqual(task.points, 20);
    });

    test('returns null for non-existent task', async () => {
      const fakeTaskId = '00000000-0000-0000-0000-000000000000';
      const task = await service.getTask(fakeTaskId, testHouseholdId);
      assert.strictEqual(task, null, 'Should return null for non-existent task');
    });

    test('returns null for task in different household', async () => {
      const otherHouseholdResult = await pool.query(
        'INSERT INTO households (name) VALUES ($1) RETURNING id',
        ['Other Household'],
      );
      const otherHouseholdId = otherHouseholdResult.rows[0].id;

      try {
        const task = await service.getTask(existingTaskId, otherHouseholdId);
        assert.strictEqual(task, null, 'Should return null for task in different household');
      } finally {
        await pool.query('DELETE FROM households WHERE id = $1', [otherHouseholdId]);
      }
    });
  });

  // ==================== listTasks ====================

  describe('listTasks', () => {
    beforeEach(async () => {
      // Create multiple tasks
      await pool.query(
        `INSERT INTO tasks (household_id, name, points, rule_type, active)
         VALUES ($1, $2, $3, $4, $5)`,
        [testHouseholdId, 'Task A', 10, 'daily', true],
      );
      await pool.query(
        `INSERT INTO tasks (household_id, name, points, rule_type, active)
         VALUES ($1, $2, $3, $4, $5)`,
        [testHouseholdId, 'Task B', 20, 'daily', true],
      );
      await pool.query(
        `INSERT INTO tasks (household_id, name, points, rule_type, active)
         VALUES ($1, $2, $3, $4, $5)`,
        [testHouseholdId, 'Task C', 30, 'daily', false],
      );
    });

    test('lists all tasks', async () => {
      const { tasks, total } = await service.listTasks(testHouseholdId);

      assert.strictEqual(total, 3, 'Should have 3 total tasks');
      assert.strictEqual(tasks.length, 3, 'Should return 3 tasks');
    });

    test('filters by active status', async () => {
      const { tasks: activeTasks, total: activeTotal } = await service.listTasks(testHouseholdId, {
        active: true,
      });

      assert.strictEqual(activeTotal, 2, 'Should have 2 active tasks');
      assert.strictEqual(activeTasks.length, 2);

      const { tasks: inactiveTasks, total: inactiveTotal } = await service.listTasks(
        testHouseholdId,
        { active: false },
      );

      assert.strictEqual(inactiveTotal, 1, 'Should have 1 inactive task');
      assert.strictEqual(inactiveTasks.length, 1);
    });

    test('paginates results', async () => {
      const { tasks: page1 } = await service.listTasks(testHouseholdId, {
        page: 1,
        pageSize: 2,
      });

      assert.strictEqual(page1.length, 2, 'Page 1 should have 2 tasks');

      const { tasks: page2 } = await service.listTasks(testHouseholdId, {
        page: 2,
        pageSize: 2,
      });

      assert.strictEqual(page2.length, 1, 'Page 2 should have 1 task');
    });

    test('sorts by name ascending', async () => {
      const { tasks } = await service.listTasks(testHouseholdId, {
        sortBy: 'name',
        sortOrder: 'asc',
      });

      assert.strictEqual(tasks[0].name, 'Task A');
      assert.strictEqual(tasks[1].name, 'Task B');
      assert.strictEqual(tasks[2].name, 'Task C');
    });

    test('sorts by points descending', async () => {
      const { tasks } = await service.listTasks(testHouseholdId, {
        sortBy: 'points',
        sortOrder: 'desc',
      });

      assert.strictEqual(tasks[0].points, 30);
      assert.strictEqual(tasks[1].points, 20);
      assert.strictEqual(tasks[2].points, 10);
    });

    test('returns empty array for household with no tasks', async () => {
      const otherHouseholdResult = await pool.query(
        'INSERT INTO households (name) VALUES ($1) RETURNING id',
        ['Empty Household'],
      );
      const otherHouseholdId = otherHouseholdResult.rows[0].id;

      try {
        const { tasks, total } = await service.listTasks(otherHouseholdId);
        assert.strictEqual(total, 0, 'Should have 0 total tasks');
        assert.strictEqual(tasks.length, 0, 'Should return empty array');
      } finally {
        await pool.query('DELETE FROM households WHERE id = $1', [otherHouseholdId]);
      }
    });
  });

  // ==================== hasValidationErrors type guard ====================

  describe('hasValidationErrors', () => {
    test('returns true for error with validationErrors', () => {
      const error = new Error('Validation failed') as Error & { validationErrors: unknown[] };
      error.validationErrors = [{ field: 'name', message: 'Required' }];

      assert.strictEqual(hasValidationErrors(error), true);
    });

    test('returns false for regular Error', () => {
      const error = new Error('Regular error');
      assert.strictEqual(hasValidationErrors(error), false);
    });

    test('returns false for non-Error', () => {
      assert.strictEqual(hasValidationErrors('string'), false);
      assert.strictEqual(hasValidationErrors(null), false);
      assert.strictEqual(hasValidationErrors(undefined), false);
    });
  });
});
