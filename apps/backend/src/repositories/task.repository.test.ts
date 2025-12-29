/**
 * TaskRepository Unit Tests
 *
 * Tests the TaskRepository using mocked database connections.
 * No actual database is required to run these tests.
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { TaskRepository, type CreateTaskDto, type UpdateTaskDto } from './task.repository.js';

// Mock Pool implementation
function createMockPool() {
  const queryMock = mock.fn();
  return {
    query: queryMock,
    connect: mock.fn(),
    end: mock.fn(),
  };
}

// Sample task row data
const sampleTaskRow = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  household_id: '123e4567-e89b-12d3-a456-426614174001',
  name: 'Test Task',
  description: 'A test task description',
  points: 10,
  rule_type: 'daily' as const,
  rule_config: null,
  active: true,
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
};

describe('TaskRepository', () => {
  let pool: ReturnType<typeof createMockPool>;
  let repository: TaskRepository;

  beforeEach(() => {
    pool = createMockPool();
    repository = new TaskRepository(pool as never);
  });

  describe('findById', () => {
    it('should return a task when found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleTaskRow],
        rowCount: 1,
      }));

      const result = await repository.findById(sampleTaskRow.id);

      assert.ok(result);
      assert.equal(result.id, sampleTaskRow.id);
      assert.equal(result.householdId, sampleTaskRow.household_id);
      assert.equal(result.name, sampleTaskRow.name);
      assert.equal(result.points, sampleTaskRow.points);
      assert.equal(result.ruleType, sampleTaskRow.rule_type);
      assert.equal(result.active, true);
    });

    it('should return null when task not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.findById('non-existent-id');

      assert.equal(result, null);
    });

    it('should call query with correct parameters', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.findById('test-id');

      assert.equal(pool.query.mock.callCount(), 1);
      const call = pool.query.mock.calls[0];
      assert.ok(call.arguments[0].includes('FROM tasks WHERE id = $1'));
      assert.deepEqual(call.arguments[1], ['test-id']);
    });
  });

  describe('findByIdAndHousehold', () => {
    it('should return task when found with matching household', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleTaskRow],
        rowCount: 1,
      }));

      const result = await repository.findByIdAndHousehold(
        sampleTaskRow.id,
        sampleTaskRow.household_id,
      );

      assert.ok(result);
      assert.equal(result.id, sampleTaskRow.id);
    });

    it('should return null when household does not match', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.findByIdAndHousehold(sampleTaskRow.id, 'wrong-household');

      assert.equal(result, null);
    });
  });

  describe('findByHousehold', () => {
    it('should return all tasks for a household', async () => {
      const secondTask = { ...sampleTaskRow, id: 'task-2', name: 'Second Task' };
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleTaskRow, secondTask],
        rowCount: 2,
      }));

      const result = await repository.findByHousehold(sampleTaskRow.household_id);

      assert.equal(result.length, 2);
      assert.equal(result[0].name, 'Test Task');
      assert.equal(result[1].name, 'Second Task');
    });

    it('should return empty array when no tasks found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.findByHousehold('household-with-no-tasks');

      assert.deepEqual(result, []);
    });
  });

  describe('findActiveByHousehold', () => {
    it('should only return active tasks', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleTaskRow],
        rowCount: 1,
      }));

      await repository.findActiveByHousehold(sampleTaskRow.household_id);

      const call = pool.query.mock.calls[0];
      assert.ok(call.arguments[0].includes('active = true'));
    });
  });

  describe('create', () => {
    it('should create a new task with default values', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleTaskRow],
        rowCount: 1,
      }));

      const data: CreateTaskDto = {
        householdId: sampleTaskRow.household_id,
        name: 'New Task',
        ruleType: 'daily',
      };

      const result = await repository.create(data);

      assert.ok(result);
      assert.equal(pool.query.mock.callCount(), 1);
      const call = pool.query.mock.calls[0];
      assert.ok(call.arguments[0].includes('INSERT INTO tasks'));
    });

    it('should create task with all provided values', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [
          {
            ...sampleTaskRow,
            description: 'Custom description',
            points: 25,
            rule_config: { rotation_type: 'odd_even_week' },
          },
        ],
        rowCount: 1,
      }));

      const data: CreateTaskDto = {
        householdId: sampleTaskRow.household_id,
        name: 'Task with config',
        description: 'Custom description',
        points: 25,
        ruleType: 'weekly_rotation',
        ruleConfig: { rotation_type: 'odd_even_week' },
      };

      const result = await repository.create(data);

      assert.ok(result);
      const call = pool.query.mock.calls[0];
      const params = call.arguments[1] as unknown[];
      assert.equal(params[2], 'Custom description');
      assert.equal(params[3], 25);
    });

    it('should trim task name', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleTaskRow],
        rowCount: 1,
      }));

      const data: CreateTaskDto = {
        householdId: sampleTaskRow.household_id,
        name: '  Untrimmed Name  ',
        ruleType: 'daily',
      };

      await repository.create(data);

      const call = pool.query.mock.calls[0];
      const params = call.arguments[1] as unknown[];
      assert.equal(params[1], 'Untrimmed Name');
    });
  });

  describe('update', () => {
    it('should update task with provided fields', async () => {
      const updatedRow = { ...sampleTaskRow, name: 'Updated Name', points: 20 };
      pool.query.mock.mockImplementation(async () => ({
        rows: [updatedRow],
        rowCount: 1,
      }));

      const data: UpdateTaskDto = {
        name: 'Updated Name',
        points: 20,
      };

      const result = await repository.update(sampleTaskRow.id, sampleTaskRow.household_id, data);

      assert.ok(result);
      assert.equal(result.name, 'Updated Name');
      assert.equal(result.points, 20);
    });

    it('should return null when task not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.update('non-existent', 'household-id', { name: 'New Name' });

      assert.equal(result, null);
    });

    it('should return existing task when no fields to update', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleTaskRow],
        rowCount: 1,
      }));

      const result = await repository.update(sampleTaskRow.id, sampleTaskRow.household_id, {});

      assert.ok(result);
      // Should call findByIdAndHousehold, not UPDATE
      assert.equal(pool.query.mock.callCount(), 1);
    });
  });

  describe('deactivate', () => {
    it('should return true when task is deactivated', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ id: sampleTaskRow.id }],
        rowCount: 1,
      }));

      const result = await repository.deactivate(sampleTaskRow.id, sampleTaskRow.household_id);

      assert.equal(result, true);
      const call = pool.query.mock.calls[0];
      assert.ok(call.arguments[0].includes('active = false'));
    });

    it('should return false when task not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.deactivate('non-existent', 'household-id');

      assert.equal(result, false);
    });
  });

  describe('list', () => {
    it('should return paginated results', async () => {
      // First call for count, second for data
      let callCount = 0;
      pool.query.mock.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { rows: [{ count: '10' }], rowCount: 1 };
        }
        return { rows: [sampleTaskRow], rowCount: 1 };
      });

      const result = await repository.list(sampleTaskRow.household_id, {
        page: 1,
        pageSize: 5,
      });

      assert.equal(result.total, 10);
      assert.equal(result.tasks.length, 1);
    });

    it('should filter by active status', async () => {
      let callCount = 0;
      pool.query.mock.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { rows: [{ count: '5' }], rowCount: 1 };
        }
        return { rows: [sampleTaskRow], rowCount: 1 };
      });

      await repository.list(sampleTaskRow.household_id, { active: true });

      const call = pool.query.mock.calls[0];
      assert.ok(call.arguments[0].includes('active = $2'));
    });

    it('should apply sorting', async () => {
      let callCount = 0;
      pool.query.mock.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { rows: [{ count: '5' }], rowCount: 1 };
        }
        return { rows: [sampleTaskRow], rowCount: 1 };
      });

      await repository.list(sampleTaskRow.household_id, {
        sortBy: 'name',
        sortOrder: 'asc',
      });

      const dataCall = pool.query.mock.calls[1];
      assert.ok(dataCall.arguments[0].includes('ORDER BY name ASC'));
    });
  });

  describe('countChildrenInHousehold', () => {
    it('should return count of children in household', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ count: '3' }],
        rowCount: 1,
      }));

      const result = await repository.countChildrenInHousehold(
        ['child-1', 'child-2', 'child-3'],
        sampleTaskRow.household_id,
      );

      assert.equal(result, 3);
    });

    it('should return 0 for empty child array', async () => {
      const result = await repository.countChildrenInHousehold([], sampleTaskRow.household_id);

      assert.equal(result, 0);
      assert.equal(pool.query.mock.callCount(), 0);
    });
  });

  describe('getHouseholdId', () => {
    it('should return household ID for a task', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ household_id: sampleTaskRow.household_id }],
        rowCount: 1,
      }));

      const result = await repository.getHouseholdId(sampleTaskRow.id);

      assert.equal(result, sampleTaskRow.household_id);
    });

    it('should return null when task not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.getHouseholdId('non-existent');

      assert.equal(result, null);
    });
  });

  describe('withClient', () => {
    it('should create new repository with different executor', () => {
      const mockClient = {
        query: mock.fn(),
        release: mock.fn(),
      };

      const clientRepo = repository.withClient(mockClient as never);

      assert.ok(clientRepo instanceof TaskRepository);
      assert.notEqual(clientRepo, repository);
    });
  });

  describe('rule config parsing', () => {
    it('should parse rule config from JSON string', async () => {
      const rowWithJsonConfig = {
        ...sampleTaskRow,
        rule_type: 'weekly_rotation' as const,
        rule_config: JSON.stringify({ rotation_type: 'odd_even_week' }),
      };
      pool.query.mock.mockImplementation(async () => ({
        rows: [rowWithJsonConfig],
        rowCount: 1,
      }));

      const result = await repository.findById(sampleTaskRow.id);

      assert.ok(result);
      assert.ok(result.ruleConfig);
      assert.equal(result.ruleConfig.rotation_type, 'odd_even_week');
    });

    it('should handle camelCase rule config', async () => {
      const rowWithCamelCase = {
        ...sampleTaskRow,
        rule_type: 'repeating' as const,
        rule_config: { repeatDays: [1, 3, 5] },
      };
      pool.query.mock.mockImplementation(async () => ({
        rows: [rowWithCamelCase],
        rowCount: 1,
      }));

      const result = await repository.findById(sampleTaskRow.id);

      assert.ok(result);
      assert.ok(result.ruleConfig);
      assert.deepEqual(result.ruleConfig.repeat_days, [1, 3, 5]);
    });

    it('should handle snake_case rule config', async () => {
      const rowWithSnakeCase = {
        ...sampleTaskRow,
        rule_type: 'weekly_rotation' as const,
        rule_config: { assigned_children: ['child-1', 'child-2'] },
      };
      pool.query.mock.mockImplementation(async () => ({
        rows: [rowWithSnakeCase],
        rowCount: 1,
      }));

      const result = await repository.findById(sampleTaskRow.id);

      assert.ok(result);
      assert.ok(result.ruleConfig);
      assert.deepEqual(result.ruleConfig.assigned_children, ['child-1', 'child-2']);
    });
  });
});
