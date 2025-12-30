/**
 * ChildRepository Unit Tests
 *
 * Tests the ChildRepository using mocked database connections.
 * No actual database is required to run these tests.
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ChildRepository, type CreateChildDto, type UpdateChildDto } from './child.repository.js';

// Mock Pool implementation
function createMockPool() {
  const queryMock = mock.fn();
  return {
    query: queryMock,
    connect: mock.fn(),
    end: mock.fn(),
  };
}

// Sample child row data
const sampleChildRow = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  household_id: '123e4567-e89b-12d3-a456-426614174001',
  user_id: null,
  name: 'Test Child',
  birth_year: 2015,
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
};

const sampleChildRowWithUser = {
  ...sampleChildRow,
  user_id: '123e4567-e89b-12d3-a456-426614174002',
};

describe('ChildRepository', () => {
  let pool: ReturnType<typeof createMockPool>;
  let repository: ChildRepository;

  beforeEach(() => {
    pool = createMockPool();
    repository = new ChildRepository(pool as never);
  });

  describe('findById', () => {
    it('should return a child when found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleChildRow],
        rowCount: 1,
      }));

      const result = await repository.findById(sampleChildRow.id);

      assert.ok(result);
      assert.equal(result.id, sampleChildRow.id);
      assert.equal(result.householdId, sampleChildRow.household_id);
      assert.equal(result.name, sampleChildRow.name);
      assert.equal(result.birthYear, sampleChildRow.birth_year);
      assert.equal(result.userId, null);
    });

    it('should return null when child not found', async () => {
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

  describe('findByIdAndHousehold', () => {
    it('should return a child when found in household', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleChildRow],
        rowCount: 1,
      }));

      const result = await repository.findByIdAndHousehold(
        sampleChildRow.id,
        sampleChildRow.household_id,
      );

      assert.ok(result);
      assert.equal(result.id, sampleChildRow.id);
      assert.equal(result.householdId, sampleChildRow.household_id);
    });

    it('should return null when child not in household', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.findByIdAndHousehold('child-id', 'other-household-id');

      assert.equal(result, null);
    });

    it('should call query with correct parameters', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.findByIdAndHousehold('child-id', 'household-id');

      assert.equal(pool.query.mock.callCount(), 1);
      const [query, params] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('WHERE id = $1 AND household_id = $2'));
      assert.deepEqual(params, ['child-id', 'household-id']);
    });
  });

  describe('findByHousehold', () => {
    it('should return all children for a household', async () => {
      const secondChild = { ...sampleChildRow, id: 'child-2', name: 'Second Child' };
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleChildRow, secondChild],
        rowCount: 2,
      }));

      const result = await repository.findByHousehold(sampleChildRow.household_id);

      assert.equal(result.length, 2);
      assert.equal(result[0].name, 'Test Child');
      assert.equal(result[1].name, 'Second Child');
    });

    it('should return empty array when no children', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.findByHousehold('household-id');

      assert.deepEqual(result, []);
    });

    it('should call query with correct parameters', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.findByHousehold('household-id');

      assert.equal(pool.query.mock.callCount(), 1);
      const [query, params] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('WHERE household_id = $1'));
      assert.ok(query.includes('ORDER BY name ASC'));
      assert.deepEqual(params, ['household-id']);
    });
  });

  describe('findByHouseholdWithPoints', () => {
    it('should return children with points balance', async () => {
      const childWithPoints = {
        ...sampleChildRow,
        points_earned: '100',
        points_spent: '30',
        points_balance: '70',
      };
      pool.query.mock.mockImplementation(async () => ({
        rows: [childWithPoints],
        rowCount: 1,
      }));

      const result = await repository.findByHouseholdWithPoints(sampleChildRow.household_id);

      assert.equal(result.length, 1);
      assert.equal(result[0].name, 'Test Child');
      assert.equal(result[0].pointsEarned, 100);
      assert.equal(result[0].pointsSpent, 30);
      assert.equal(result[0].pointsBalance, 70);
    });
  });

  describe('findByUserId', () => {
    it('should return a child when found by user ID', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleChildRowWithUser],
        rowCount: 1,
      }));

      const result = await repository.findByUserId(sampleChildRowWithUser.user_id!);

      assert.ok(result);
      assert.equal(result.userId, sampleChildRowWithUser.user_id);
    });

    it('should return null when no child linked to user', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.findByUserId('user-id');

      assert.equal(result, null);
    });
  });

  describe('findByUserIdAndHousehold', () => {
    it('should return a child when found by user ID and household', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleChildRowWithUser],
        rowCount: 1,
      }));

      const result = await repository.findByUserIdAndHousehold(
        sampleChildRowWithUser.user_id!,
        sampleChildRowWithUser.household_id,
      );

      assert.ok(result);
      assert.equal(result.userId, sampleChildRowWithUser.user_id);
      assert.equal(result.householdId, sampleChildRowWithUser.household_id);
    });

    it('should return null when child not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.findByUserIdAndHousehold('user-id', 'household-id');

      assert.equal(result, null);
    });
  });

  describe('create', () => {
    it('should create a new child', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleChildRow],
        rowCount: 1,
      }));

      const data: CreateChildDto = {
        householdId: sampleChildRow.household_id,
        name: 'Test Child',
        birthYear: 2015,
      };

      const result = await repository.create(data);

      assert.ok(result);
      assert.equal(result.name, 'Test Child');
      assert.equal(result.birthYear, 2015);
    });

    it('should call query with correct INSERT statement', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleChildRow],
        rowCount: 1,
      }));

      const data: CreateChildDto = {
        householdId: 'household-id',
        name: '  Test Child  ', // With whitespace
        birthYear: 2015,
      };

      await repository.create(data);

      assert.equal(pool.query.mock.callCount(), 1);
      const [query, params] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('INSERT INTO children'));
      assert.ok(query.includes('RETURNING'));
      // Name should be trimmed
      assert.equal(params[2], 'Test Child');
    });

    it('should handle optional fields', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ ...sampleChildRow, birth_year: null, user_id: null }],
        rowCount: 1,
      }));

      const data: CreateChildDto = {
        householdId: 'household-id',
        name: 'Test Child',
        // No birthYear or userId
      };

      const result = await repository.create(data);

      assert.ok(result);
      assert.equal(result.birthYear, null);
      assert.equal(result.userId, null);
    });
  });

  describe('update', () => {
    it('should update child name', async () => {
      const updatedRow = { ...sampleChildRow, name: 'Updated Name' };
      pool.query.mock.mockImplementation(async () => ({
        rows: [updatedRow],
        rowCount: 1,
      }));

      const data: UpdateChildDto = { name: 'Updated Name' };
      const result = await repository.update(sampleChildRow.id, sampleChildRow.household_id, data);

      assert.ok(result);
      assert.equal(result.name, 'Updated Name');
    });

    it('should update birth year', async () => {
      const updatedRow = { ...sampleChildRow, birth_year: 2016 };
      pool.query.mock.mockImplementation(async () => ({
        rows: [updatedRow],
        rowCount: 1,
      }));

      const data: UpdateChildDto = { birthYear: 2016 };
      const result = await repository.update(sampleChildRow.id, sampleChildRow.household_id, data);

      assert.ok(result);
      assert.equal(result.birthYear, 2016);
    });

    it('should return null when child not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const data: UpdateChildDto = { name: 'Updated Name' };
      const result = await repository.update('non-existent', 'household-id', data);

      assert.equal(result, null);
    });

    it('should return current child when no updates provided', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleChildRow],
        rowCount: 1,
      }));

      const data: UpdateChildDto = {};
      const result = await repository.update(sampleChildRow.id, sampleChildRow.household_id, data);

      assert.ok(result);
      // Should call findByIdAndHousehold instead of UPDATE
      const [query] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('SELECT'));
    });
  });

  describe('delete', () => {
    it('should delete a child and return true', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ id: sampleChildRow.id }],
        rowCount: 1,
      }));

      const result = await repository.delete(sampleChildRow.id, sampleChildRow.household_id);

      assert.equal(result, true);
    });

    it('should return false when child not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.delete('non-existent', 'household-id');

      assert.equal(result, false);
    });

    it('should call query with correct DELETE statement', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.delete('child-id', 'household-id');

      assert.equal(pool.query.mock.callCount(), 1);
      const [query, params] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('DELETE FROM children'));
      assert.ok(query.includes('WHERE id = $1 AND household_id = $2'));
      assert.deepEqual(params, ['child-id', 'household-id']);
    });
  });

  describe('linkToUser', () => {
    it('should link child to user and return true', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ id: sampleChildRow.id }],
        rowCount: 1,
      }));

      const result = await repository.linkToUser(sampleChildRow.id, 'user-id');

      assert.equal(result, true);
    });

    it('should return false when child not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.linkToUser('non-existent', 'user-id');

      assert.equal(result, false);
    });
  });

  describe('unlinkFromUser', () => {
    it('should unlink child from user and return true', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ id: sampleChildRow.id }],
        rowCount: 1,
      }));

      const result = await repository.unlinkFromUser(sampleChildRow.id);

      assert.equal(result, true);
    });

    it('should return false when child not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.unlinkFromUser('non-existent');

      assert.equal(result, false);
    });
  });

  describe('getHouseholdId', () => {
    it('should return household ID for child', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ household_id: sampleChildRow.household_id }],
        rowCount: 1,
      }));

      const result = await repository.getHouseholdId(sampleChildRow.id);

      assert.equal(result, sampleChildRow.household_id);
    });

    it('should return null when child not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.getHouseholdId('non-existent');

      assert.equal(result, null);
    });
  });

  describe('belongsToHousehold', () => {
    it('should return true when child belongs to household', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ id: 1 }],
        rowCount: 1,
      }));

      const result = await repository.belongsToHousehold(
        sampleChildRow.id,
        sampleChildRow.household_id,
      );

      assert.equal(result, true);
    });

    it('should return false when child does not belong to household', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.belongsToHousehold('child-id', 'other-household');

      assert.equal(result, false);
    });
  });

  describe('countByHousehold', () => {
    it('should return count of children', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ count: '5' }],
        rowCount: 1,
      }));

      const result = await repository.countByHousehold('household-id');

      assert.equal(result, 5);
    });

    it('should return 0 when no children', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ count: '0' }],
        rowCount: 1,
      }));

      const result = await repository.countByHousehold('household-id');

      assert.equal(result, 0);
    });
  });

  describe('getPointsBalance', () => {
    it('should return points balance for child', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ points_earned: '100', points_spent: '30', points_balance: '70' }],
        rowCount: 1,
      }));

      const result = await repository.getPointsBalance(sampleChildRow.id);

      assert.ok(result);
      assert.equal(result.pointsEarned, 100);
      assert.equal(result.pointsSpent, 30);
      assert.equal(result.pointsBalance, 70);
    });

    it('should return zeros when no points data exists', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.getPointsBalance(sampleChildRow.id);

      assert.ok(result);
      assert.equal(result.pointsEarned, 0);
      assert.equal(result.pointsSpent, 0);
      assert.equal(result.pointsBalance, 0);
    });
  });

  describe('withClient', () => {
    it('should create a new repository instance with client', () => {
      const mockClient = { query: mock.fn() };
      const newRepo = repository.withClient(mockClient as never);

      assert.ok(newRepo instanceof ChildRepository);
      assert.notEqual(newRepo, repository);
    });
  });
});
