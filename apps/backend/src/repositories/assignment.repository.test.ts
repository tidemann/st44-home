/**
 * AssignmentRepository Unit Tests
 *
 * Tests the AssignmentRepository using mocked database connections.
 * No actual database is required to run these tests.
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  AssignmentRepository,
  type CreateAssignmentDto,
  type CreateCompletionDto,
} from './assignment.repository.js';

// Mock Pool implementation
function createMockPool() {
  const queryMock = mock.fn();
  return {
    query: queryMock,
    connect: mock.fn(),
    end: mock.fn(),
  };
}

// Sample assignment row data
const sampleAssignmentRow = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  household_id: 'household-123',
  task_id: 'task-123',
  child_id: 'child-123',
  date: '2024-01-15',
  status: 'pending' as const,
  created_at: new Date('2024-01-01T00:00:00Z'),
};

const sampleAssignmentWithDetailsRow = {
  ...sampleAssignmentRow,
  task_name: 'Clean Room',
  task_description: 'Make your bed and tidy up',
  task_points: 10,
  child_name: 'Alice',
  completed_at: null as Date | null,
};

const sampleCompletionRow = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  household_id: 'household-123',
  task_assignment_id: sampleAssignmentRow.id,
  child_id: 'child-123',
  completed_at: new Date('2024-01-15T10:30:00Z'),
  points_earned: 10,
};

describe('AssignmentRepository', () => {
  let pool: ReturnType<typeof createMockPool>;
  let repository: AssignmentRepository;

  beforeEach(() => {
    pool = createMockPool();
    repository = new AssignmentRepository(pool as never);
  });

  describe('findById', () => {
    it('should return an assignment when found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleAssignmentRow],
        rowCount: 1,
      }));

      const result = await repository.findById(sampleAssignmentRow.id);

      assert.ok(result);
      assert.equal(result.id, sampleAssignmentRow.id);
      assert.equal(result.householdId, sampleAssignmentRow.household_id);
      assert.equal(result.taskId, sampleAssignmentRow.task_id);
      assert.equal(result.childId, sampleAssignmentRow.child_id);
      assert.equal(result.date, sampleAssignmentRow.date);
      assert.equal(result.status, sampleAssignmentRow.status);
    });

    it('should return null when assignment not found', async () => {
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
      const [query, params] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('SELECT'));
      assert.ok(query.includes('WHERE id = $1'));
      assert.deepEqual(params, ['test-id']);
    });
  });

  describe('findByIdWithDetails', () => {
    it('should return assignment with details when found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleAssignmentWithDetailsRow],
        rowCount: 1,
      }));

      const result = await repository.findByIdWithDetails(sampleAssignmentRow.id);

      assert.ok(result);
      assert.equal(result.id, sampleAssignmentRow.id);
      assert.equal(result.taskName, 'Clean Room');
      assert.equal(result.taskDescription, 'Make your bed and tidy up');
      assert.equal(result.taskPoints, 10);
      assert.equal(result.childName, 'Alice');
      assert.equal(result.completedAt, null);
    });

    it('should return completed assignment with completedAt', async () => {
      const completedRow = {
        ...sampleAssignmentWithDetailsRow,
        status: 'completed' as const,
        completed_at: new Date('2024-01-15T10:30:00Z'),
      };
      pool.query.mock.mockImplementation(async () => ({
        rows: [completedRow],
        rowCount: 1,
      }));

      const result = await repository.findByIdWithDetails(sampleAssignmentRow.id);

      assert.ok(result);
      assert.equal(result.status, 'completed');
      assert.ok(result.completedAt);
    });

    it('should return null when not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.findByIdWithDetails('non-existent');

      assert.equal(result, null);
    });
  });

  describe('findByChild', () => {
    it('should return assignments for a child within date range', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleAssignmentWithDetailsRow],
        rowCount: 1,
      }));

      const result = await repository.findByChild('child-123', '2024-01-01', '2024-01-31');

      assert.equal(result.length, 1);
      assert.equal(result[0].childId, 'child-123');
      assert.equal(result[0].taskName, 'Clean Room');
    });

    it('should return empty array when no assignments found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.findByChild('child-123', '2024-01-01', '2024-01-31');

      assert.equal(result.length, 0);
    });

    it('should call query with correct parameters', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.findByChild('child-123', '2024-01-01', '2024-01-31');

      const [query, params] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('WHERE ta.child_id = $1'));
      assert.ok(query.includes('ta.date >= $2'));
      assert.ok(query.includes('ta.date <= $3'));
      assert.deepEqual(params, ['child-123', '2024-01-01', '2024-01-31']);
    });
  });

  describe('findByHousehold', () => {
    it('should return assignments for a household within date range', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleAssignmentWithDetailsRow],
        rowCount: 1,
      }));

      const result = await repository.findByHousehold('household-123', '2024-01-01', '2024-01-31');

      assert.equal(result.length, 1);
      assert.equal(result[0].householdId, 'household-123');
    });

    it('should apply child filter', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.findByHousehold('household-123', '2024-01-01', '2024-01-31', {
        childId: 'child-456',
      });

      const [query, params] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('AND ta.child_id = $4'));
      assert.deepEqual(params, ['household-123', '2024-01-01', '2024-01-31', 'child-456']);
    });

    it('should apply status filter', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.findByHousehold('household-123', '2024-01-01', '2024-01-31', {
        status: 'completed',
      });

      const [query, params] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('AND ta.status = $4'));
      assert.deepEqual(params, ['household-123', '2024-01-01', '2024-01-31', 'completed']);
    });

    it('should apply task filter', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.findByHousehold('household-123', '2024-01-01', '2024-01-31', {
        taskId: 'task-789',
      });

      const [query, params] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('AND ta.task_id = $4'));
      assert.deepEqual(params, ['household-123', '2024-01-01', '2024-01-31', 'task-789']);
    });

    it('should apply multiple filters', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.findByHousehold('household-123', '2024-01-01', '2024-01-31', {
        childId: 'child-456',
        status: 'pending',
        taskId: 'task-789',
      });

      const [query, params] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('AND ta.child_id = $4'));
      assert.ok(query.includes('AND ta.status = $5'));
      assert.ok(query.includes('AND ta.task_id = $6'));
      assert.deepEqual(params, [
        'household-123',
        '2024-01-01',
        '2024-01-31',
        'child-456',
        'pending',
        'task-789',
      ]);
    });
  });

  describe('findPending', () => {
    it('should return pending assignments for a child', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleAssignmentRow],
        rowCount: 1,
      }));

      const result = await repository.findPending('child-123');

      assert.equal(result.length, 1);
      assert.equal(result[0].status, 'pending');
    });

    it('should call query with correct parameters', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.findPending('child-123');

      const [query, params] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes("status = 'pending'"));
      assert.ok(query.includes('WHERE child_id = $1'));
      assert.deepEqual(params, ['child-123']);
    });
  });

  describe('create', () => {
    it('should create a new assignment', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleAssignmentRow],
        rowCount: 1,
      }));

      const data: CreateAssignmentDto = {
        householdId: 'household-123',
        taskId: 'task-123',
        childId: 'child-123',
        date: '2024-01-15',
      };

      const result = await repository.create(data);

      assert.ok(result);
      assert.equal(result.householdId, 'household-123');
      assert.equal(result.taskId, 'task-123');
      assert.equal(result.childId, 'child-123');
      assert.equal(result.date, '2024-01-15');
    });

    it('should use provided status', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ ...sampleAssignmentRow, status: 'completed' }],
        rowCount: 1,
      }));

      await repository.create({
        householdId: 'household-123',
        taskId: 'task-123',
        childId: 'child-123',
        date: '2024-01-15',
        status: 'completed',
      });

      const [, params] = pool.query.mock.calls[0].arguments;
      assert.equal(params[4], 'completed');
    });

    it('should default to pending status', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleAssignmentRow],
        rowCount: 1,
      }));

      await repository.create({
        householdId: 'household-123',
        taskId: 'task-123',
        childId: null,
        date: '2024-01-15',
      });

      const [, params] = pool.query.mock.calls[0].arguments;
      assert.equal(params[4], 'pending');
    });
  });

  describe('batchCreate', () => {
    it('should create multiple assignments', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleAssignmentRow, { ...sampleAssignmentRow, id: 'assignment-2' }],
        rowCount: 2,
      }));

      const assignments: CreateAssignmentDto[] = [
        { householdId: 'household-123', taskId: 'task-1', childId: 'child-1', date: '2024-01-15' },
        { householdId: 'household-123', taskId: 'task-2', childId: 'child-2', date: '2024-01-15' },
      ];

      const result = await repository.batchCreate(assignments);

      assert.equal(result.length, 2);
    });

    it('should return empty array when no assignments provided', async () => {
      const result = await repository.batchCreate([]);

      assert.equal(result.length, 0);
      assert.equal(pool.query.mock.callCount(), 0);
    });

    it('should use ON CONFLICT DO NOTHING for duplicates', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleAssignmentRow],
        rowCount: 1,
      }));

      await repository.batchCreate([
        { householdId: 'household-123', taskId: 'task-1', childId: 'child-1', date: '2024-01-15' },
      ]);

      const [query] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('ON CONFLICT'));
      assert.ok(query.includes('DO NOTHING'));
    });
  });

  describe('updateStatus', () => {
    it('should update assignment status and return true', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ id: sampleAssignmentRow.id }],
        rowCount: 1,
      }));

      const result = await repository.updateStatus(sampleAssignmentRow.id, 'completed');

      assert.equal(result, true);
    });

    it('should return false when assignment not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.updateStatus('non-existent', 'completed');

      assert.equal(result, false);
    });

    it('should call query with correct parameters', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.updateStatus('assignment-id', 'completed');

      const [query, params] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('UPDATE task_assignments SET status = $2'));
      assert.ok(query.includes('WHERE id = $1'));
      assert.deepEqual(params, ['assignment-id', 'completed']);
    });
  });

  describe('completeIfPending', () => {
    it('should complete pending assignment and return it', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ ...sampleAssignmentRow, status: 'completed' }],
        rowCount: 1,
      }));

      const result = await repository.completeIfPending(sampleAssignmentRow.id);

      assert.ok(result);
      assert.equal(result.status, 'completed');
    });

    it('should return null if not pending', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.completeIfPending('already-completed');

      assert.equal(result, null);
    });

    it('should only update if status is pending', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.completeIfPending('assignment-id');

      const [query] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes("AND status = 'pending'"));
    });
  });

  describe('reassign', () => {
    it('should reassign pending assignment to new child', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ ...sampleAssignmentRow, child_id: 'new-child' }],
        rowCount: 1,
      }));

      const result = await repository.reassign(sampleAssignmentRow.id, 'new-child');

      assert.ok(result);
      assert.equal(result.childId, 'new-child');
    });

    it('should return null if not pending', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.reassign('completed-assignment', 'new-child');

      assert.equal(result, null);
    });

    it('should only reassign if pending', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.reassign('assignment-id', 'new-child');

      const [query] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes("AND status = 'pending'"));
    });
  });

  describe('delete', () => {
    it('should delete assignment and return true', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ id: sampleAssignmentRow.id }],
        rowCount: 1,
      }));

      const result = await repository.delete(sampleAssignmentRow.id);

      assert.equal(result, true);
    });

    it('should return false when assignment not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.delete('non-existent');

      assert.equal(result, false);
    });
  });

  describe('getHouseholdId', () => {
    it('should return household ID for assignment', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ household_id: 'household-123' }],
        rowCount: 1,
      }));

      const result = await repository.getHouseholdId(sampleAssignmentRow.id);

      assert.equal(result, 'household-123');
    });

    it('should return null when assignment not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.getHouseholdId('non-existent');

      assert.equal(result, null);
    });
  });

  describe('exists', () => {
    it('should return true when assignment exists with child', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ id: 1 }],
        rowCount: 1,
      }));

      const result = await repository.exists('task-123', 'child-123', '2024-01-15');

      assert.equal(result, true);
    });

    it('should return true when assignment exists without child', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ id: 1 }],
        rowCount: 1,
      }));

      const result = await repository.exists('task-123', null, '2024-01-15');

      assert.equal(result, true);
    });

    it('should return false when assignment does not exist', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.exists('task-123', 'child-123', '2024-01-15');

      assert.equal(result, false);
    });

    it('should use IS NULL for null childId', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.exists('task-123', null, '2024-01-15');

      const [query, params] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('child_id IS NULL'));
      assert.deepEqual(params, ['task-123', '2024-01-15']);
    });

    it('should use = $2 for non-null childId', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.exists('task-123', 'child-123', '2024-01-15');

      const [query, params] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('child_id = $2'));
      assert.deepEqual(params, ['task-123', 'child-123', '2024-01-15']);
    });
  });

  // Task Completions Tests

  describe('createCompletion', () => {
    it('should create a task completion record', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleCompletionRow],
        rowCount: 1,
      }));

      const data: CreateCompletionDto = {
        householdId: 'household-123',
        taskAssignmentId: sampleAssignmentRow.id,
        childId: 'child-123',
        completedAt: new Date('2024-01-15T10:30:00Z'),
        pointsEarned: 10,
      };

      const result = await repository.createCompletion(data);

      assert.ok(result);
      assert.equal(result.householdId, 'household-123');
      assert.equal(result.taskAssignmentId, sampleAssignmentRow.id);
      assert.equal(result.childId, 'child-123');
      assert.equal(result.pointsEarned, 10);
    });

    it('should call query with correct parameters', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleCompletionRow],
        rowCount: 1,
      }));

      const completedAt = new Date('2024-01-15T10:30:00Z');
      await repository.createCompletion({
        householdId: 'household-123',
        taskAssignmentId: 'assignment-123',
        childId: 'child-123',
        completedAt,
        pointsEarned: 10,
      });

      const [query, params] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('INSERT INTO task_completions'));
      assert.deepEqual(params, ['household-123', 'assignment-123', 'child-123', completedAt, 10]);
    });
  });

  describe('findCompletionByAssignment', () => {
    it('should return completion when found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleCompletionRow],
        rowCount: 1,
      }));

      const result = await repository.findCompletionByAssignment(sampleAssignmentRow.id);

      assert.ok(result);
      assert.equal(result.taskAssignmentId, sampleAssignmentRow.id);
      assert.equal(result.pointsEarned, 10);
    });

    it('should return null when not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.findCompletionByAssignment('non-existent');

      assert.equal(result, null);
    });
  });

  describe('getAssignmentWithPoints', () => {
    it('should return assignment with task points', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [
          {
            id: sampleAssignmentRow.id,
            household_id: 'household-123',
            child_id: 'child-123',
            task_id: 'task-123',
            status: 'pending',
            points: 10,
          },
        ],
        rowCount: 1,
      }));

      const result = await repository.getAssignmentWithPoints(sampleAssignmentRow.id);

      assert.ok(result);
      assert.equal(result.id, sampleAssignmentRow.id);
      assert.equal(result.points, 10);
      assert.equal(result.status, 'pending');
    });

    it('should return null when not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.getAssignmentWithPoints('non-existent');

      assert.equal(result, null);
    });
  });

  describe('withClient', () => {
    it('should create a new repository instance with client', () => {
      const mockClient = { query: mock.fn() };
      const newRepo = repository.withClient(mockClient as never);

      assert.ok(newRepo instanceof AssignmentRepository);
      assert.notEqual(newRepo, repository);
    });
  });
});
