/**
 * TaskResponseRepository Unit Tests
 *
 * Tests the TaskResponseRepository using mocked database connections.
 * No actual database is required to run these tests.
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { TaskResponseRepository } from './task-response.repository.js';

// Mock Pool implementation
function createMockPool() {
  const queryMock = mock.fn();
  return {
    query: queryMock,
    connect: mock.fn(),
    end: mock.fn(),
  };
}

// Sample data
const sampleTaskId = '123e4567-e89b-12d3-a456-426614174000';
const sampleChildId = '223e4567-e89b-12d3-a456-426614174000';
const sampleHouseholdId = '323e4567-e89b-12d3-a456-426614174000';

const sampleCandidateRow = {
  id: 'candidate-123',
  task_id: sampleTaskId,
  child_id: sampleChildId,
  household_id: sampleHouseholdId,
  created_at: new Date('2024-01-01T00:00:00Z'),
};

const sampleResponseRow = {
  id: 'response-123',
  task_id: sampleTaskId,
  child_id: sampleChildId,
  household_id: sampleHouseholdId,
  response: 'accepted' as const,
  responded_at: new Date('2024-01-01T00:00:00Z'),
};

describe('TaskResponseRepository', () => {
  let pool: ReturnType<typeof createMockPool>;
  let repository: TaskResponseRepository;

  beforeEach(() => {
    pool = createMockPool();
    repository = new TaskResponseRepository(pool as never);
  });

  describe('addCandidates', () => {
    it('should add multiple candidates to a task', async () => {
      const childIds = ['child-1', 'child-2', 'child-3'];
      pool.query.mock.mockImplementation(async () => ({
        rows: childIds.map((childId, i) => ({
          id: `candidate-${i}`,
          task_id: sampleTaskId,
          child_id: childId,
          household_id: sampleHouseholdId,
          created_at: new Date(),
        })),
        rowCount: 3,
      }));

      const result = await repository.addCandidates(sampleTaskId, childIds, sampleHouseholdId);

      assert.equal(result.length, 3);
      assert.equal(result[0].taskId, sampleTaskId);
      assert.equal(result[0].childId, 'child-1');
    });

    it('should return empty array when no child IDs provided', async () => {
      const result = await repository.addCandidates(sampleTaskId, [], sampleHouseholdId);

      assert.equal(result.length, 0);
      assert.equal(pool.query.mock.callCount(), 0);
    });
  });

  describe('recordResponse', () => {
    it('should record an accept response', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleResponseRow],
        rowCount: 1,
      }));

      const result = await repository.recordResponse(
        sampleTaskId,
        sampleChildId,
        sampleHouseholdId,
        'accepted',
      );

      assert.ok(result);
      assert.equal(result.taskId, sampleTaskId);
      assert.equal(result.childId, sampleChildId);
      assert.equal(result.response, 'accepted');
    });

    it('should record a decline response', async () => {
      const declineRow = { ...sampleResponseRow, response: 'declined' as const };
      pool.query.mock.mockImplementation(async () => ({
        rows: [declineRow],
        rowCount: 1,
      }));

      const result = await repository.recordResponse(
        sampleTaskId,
        sampleChildId,
        sampleHouseholdId,
        'declined',
      );

      assert.ok(result);
      assert.equal(result.response, 'declined');
    });
  });

  describe('undoResponse', () => {
    it('should delete a response and return true', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 1,
      }));

      const result = await repository.undoResponse(sampleTaskId, sampleChildId);

      assert.equal(result, true);
    });

    it('should return false when no response to delete', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.undoResponse(sampleTaskId, sampleChildId);

      assert.equal(result, false);
    });
  });

  describe('getTaskCandidates', () => {
    it('should return candidates with response status', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [
          {
            child_id: 'child-1',
            child_name: 'Alice',
            response: 'accepted' as const,
            responded_at: new Date(),
          },
          {
            child_id: 'child-2',
            child_name: 'Bob',
            response: 'declined' as const,
            responded_at: new Date(),
          },
          {
            child_id: 'child-3',
            child_name: 'Charlie',
            response: null,
            responded_at: null,
          },
        ],
        rowCount: 3,
      }));

      const result = await repository.getTaskCandidates(sampleTaskId);

      assert.equal(result.length, 3);
      assert.equal(result[0].childName, 'Alice');
      assert.equal(result[0].response, 'accepted');
      assert.equal(result[2].response, null);
    });
  });

  describe('getAvailableTasksForChild', () => {
    it('should return available tasks with deadline info', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      pool.query.mock.mockImplementation(async () => ({
        rows: [
          {
            id: sampleTaskId,
            household_id: sampleHouseholdId,
            name: 'Clean garage',
            description: 'Organize and sweep',
            points: 50,
            deadline: futureDate,
            candidate_count: '3',
            decline_count: '1',
          },
        ],
        rowCount: 1,
      }));

      const result = await repository.getAvailableTasksForChild(
        sampleChildId,
        sampleHouseholdId,
      );

      assert.equal(result.length, 1);
      assert.equal(result[0].name, 'Clean garage');
      assert.equal(result[0].candidateCount, 3);
      assert.equal(result[0].declineCount, 1);
      assert.equal(result[0].hasDeadline, true);
      assert.ok(result[0].daysUntilDeadline !== null);
    });

    it('should calculate days until deadline correctly', async () => {
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);

      pool.query.mock.mockImplementation(async () => ({
        rows: [
          {
            id: sampleTaskId,
            household_id: sampleHouseholdId,
            name: 'Urgent task',
            description: null,
            points: 30,
            deadline: tomorrowDate,
            candidate_count: '2',
            decline_count: '0',
          },
        ],
        rowCount: 1,
      }));

      const result = await repository.getAvailableTasksForChild(
        sampleChildId,
        sampleHouseholdId,
      );

      assert.ok(result[0].daysUntilDeadline !== null);
      assert.ok(result[0].daysUntilDeadline >= 0);
    });
  });

  describe('getFailedTasks', () => {
    it('should return tasks where all candidates declined', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [
          {
            id: sampleTaskId,
            name: 'Failed task',
            description: 'Nobody wanted this',
            points: 25,
            deadline: null,
            candidate_count: '3',
            decline_count: '3',
          },
        ],
        rowCount: 1,
      }));

      const result = await repository.getFailedTasks(sampleHouseholdId);

      assert.equal(result.length, 1);
      assert.equal(result[0].candidateCount, 3);
      assert.equal(result[0].declineCount, 3);
    });
  });

  describe('getExpiredTasks', () => {
    it('should return tasks past deadline', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      pool.query.mock.mockImplementation(async () => ({
        rows: [
          {
            id: sampleTaskId,
            name: 'Expired task',
            description: 'Deadline passed',
            points: 40,
            deadline: pastDate,
            candidate_count: '2',
            decline_count: '0',
          },
        ],
        rowCount: 1,
      }));

      const result = await repository.getExpiredTasks(sampleHouseholdId);

      assert.equal(result.length, 1);
      assert.equal(result[0].name, 'Expired task');
      assert.ok(result[0].deadline);
    });
  });

  describe('hasTaskBeenAccepted', () => {
    it('should return true when task has assignment', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ exists: true }],
        rowCount: 1,
      }));

      const result = await repository.hasTaskBeenAccepted(sampleTaskId);

      assert.equal(result, true);
    });

    it('should return false when task has no assignment', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ exists: false }],
        rowCount: 1,
      }));

      const result = await repository.hasTaskBeenAccepted(sampleTaskId);

      assert.equal(result, false);
    });
  });

  describe('haveAllCandidatesDeclined', () => {
    it('should return true when all declined', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ all_declined: true }],
        rowCount: 1,
      }));

      const result = await repository.haveAllCandidatesDeclined(sampleTaskId);

      assert.equal(result, true);
    });

    it('should return false when not all declined', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ all_declined: false }],
        rowCount: 1,
      }));

      const result = await repository.haveAllCandidatesDeclined(sampleTaskId);

      assert.equal(result, false);
    });
  });

  describe('getResponse', () => {
    it('should return response when exists', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleResponseRow],
        rowCount: 1,
      }));

      const result = await repository.getResponse(sampleTaskId, sampleChildId);

      assert.ok(result);
      assert.equal(result.response, 'accepted');
    });

    it('should return null when no response', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.getResponse(sampleTaskId, sampleChildId);

      assert.equal(result, null);
    });
  });

  describe('isCandidate', () => {
    it('should return true when child is candidate', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ exists: true }],
        rowCount: 1,
      }));

      const result = await repository.isCandidate(sampleTaskId, sampleChildId);

      assert.equal(result, true);
    });

    it('should return false when child is not candidate', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ exists: false }],
        rowCount: 1,
      }));

      const result = await repository.isCandidate(sampleTaskId, sampleChildId);

      assert.equal(result, false);
    });
  });
});
