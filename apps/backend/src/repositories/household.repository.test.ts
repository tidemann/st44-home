/**
 * HouseholdRepository Unit Tests
 *
 * Tests the HouseholdRepository using mocked database connections.
 * No actual database is required to run these tests.
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { HouseholdRepository, type CreateHouseholdDto } from './household.repository.js';

// Mock Pool implementation
function createMockPool() {
  const queryMock = mock.fn();
  return {
    query: queryMock,
    connect: mock.fn(),
    end: mock.fn(),
  };
}

// Sample household row data
const sampleHouseholdRow = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Test Household',
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
};

const sampleMemberRow = {
  id: 'member-123',
  user_id: 'user-123',
  household_id: sampleHouseholdRow.id,
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin' as const,
  joined_at: new Date('2024-01-01T00:00:00Z'),
};

describe('HouseholdRepository', () => {
  let pool: ReturnType<typeof createMockPool>;
  let repository: HouseholdRepository;

  beforeEach(() => {
    pool = createMockPool();
    repository = new HouseholdRepository(pool as never);
  });

  describe('findById', () => {
    it('should return a household when found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleHouseholdRow],
        rowCount: 1,
      }));

      const result = await repository.findById(sampleHouseholdRow.id);

      assert.ok(result);
      assert.equal(result.id, sampleHouseholdRow.id);
      assert.equal(result.name, sampleHouseholdRow.name);
      assert.equal(typeof result.createdAt, 'string');
      assert.equal(typeof result.updatedAt, 'string');
    });

    it('should return null when household not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.findById('non-existent-id');

      assert.equal(result, null);
    });
  });

  describe('findByIdWithCounts', () => {
    it('should return household with member and children counts', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [
          {
            ...sampleHouseholdRow,
            member_count: '3',
            children_count: '2',
          },
        ],
        rowCount: 1,
      }));

      const result = await repository.findByIdWithCounts(sampleHouseholdRow.id);

      assert.ok(result);
      assert.equal(result.id, sampleHouseholdRow.id);
      assert.equal(result.memberCount, 3);
      assert.equal(result.childrenCount, 2);
    });

    it('should return null when household not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.findByIdWithCounts('non-existent-id');

      assert.equal(result, null);
    });
  });

  describe('create', () => {
    it('should create a new household', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleHouseholdRow],
        rowCount: 1,
      }));

      const data: CreateHouseholdDto = {
        name: 'New Household',
      };

      const result = await repository.create(data);

      assert.ok(result);
      assert.equal(pool.query.mock.callCount(), 1);
      const call = pool.query.mock.calls[0];
      assert.ok(call.arguments[0].includes('INSERT INTO households'));
    });

    it('should trim household name', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleHouseholdRow],
        rowCount: 1,
      }));

      await repository.create({ name: '  Untrimmed Name  ' });

      const call = pool.query.mock.calls[0];
      const params = call.arguments[1] as unknown[];
      assert.equal(params[0], 'Untrimmed Name');
    });
  });

  describe('update', () => {
    it('should update household name', async () => {
      const updatedRow = { ...sampleHouseholdRow, name: 'Updated Name' };
      pool.query.mock.mockImplementation(async () => ({
        rows: [updatedRow],
        rowCount: 1,
      }));

      const result = await repository.update(sampleHouseholdRow.id, 'Updated Name');

      assert.ok(result);
      assert.equal(result.name, 'Updated Name');
    });

    it('should return null when household not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.update('non-existent', 'New Name');

      assert.equal(result, null);
    });
  });

  describe('delete', () => {
    it('should return true when household is deleted', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ id: sampleHouseholdRow.id }],
        rowCount: 1,
      }));

      const result = await repository.delete(sampleHouseholdRow.id);

      assert.equal(result, true);
    });

    it('should return false when household not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.delete('non-existent');

      assert.equal(result, false);
    });
  });

  describe('findByUserId', () => {
    it('should return all households for a user', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [
          {
            ...sampleHouseholdRow,
            role: 'admin' as const,
            joined_at: new Date(),
            member_count: '2',
            children_count: '1',
          },
          {
            ...sampleHouseholdRow,
            id: 'household-2',
            name: 'Second Household',
            role: 'parent' as const,
            joined_at: new Date(),
            member_count: '3',
            children_count: '2',
          },
        ],
        rowCount: 2,
      }));

      const result = await repository.findByUserId('user-123');

      assert.equal(result.length, 2);
      assert.equal(result[0].name, 'Test Household');
      assert.equal(result[0].role, 'admin');
      assert.equal(result[1].name, 'Second Household');
      assert.equal(result[1].role, 'parent');
    });

    it('should return empty array when user has no households', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.findByUserId('user-with-no-households');

      assert.deepEqual(result, []);
    });
  });

  describe('addMember', () => {
    it('should add a member to a household', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 1,
      }));

      await repository.addMember(sampleHouseholdRow.id, 'user-123', 'parent');

      assert.equal(pool.query.mock.callCount(), 1);
      const call = pool.query.mock.calls[0];
      assert.ok(call.arguments[0].includes('INSERT INTO household_members'));
      const params = call.arguments[1] as unknown[];
      assert.equal(params[0], sampleHouseholdRow.id);
      assert.equal(params[1], 'user-123');
      assert.equal(params[2], 'parent');
    });
  });

  describe('removeMember', () => {
    it('should return true when member is removed', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ id: 'member-id' }],
        rowCount: 1,
      }));

      const result = await repository.removeMember(sampleHouseholdRow.id, 'user-123');

      assert.equal(result, true);
    });

    it('should return false when member not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.removeMember(sampleHouseholdRow.id, 'non-existent');

      assert.equal(result, false);
    });
  });

  describe('updateMemberRole', () => {
    it('should return true when role is updated', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ id: 'member-id' }],
        rowCount: 1,
      }));

      const result = await repository.updateMemberRole(sampleHouseholdRow.id, 'user-123', 'parent');

      assert.equal(result, true);
    });

    it('should return false when member not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.updateMemberRole(
        sampleHouseholdRow.id,
        'non-existent',
        'parent',
      );

      assert.equal(result, false);
    });
  });

  describe('getMemberRole', () => {
    it('should return role when member exists', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ role: 'admin' }],
        rowCount: 1,
      }));

      const result = await repository.getMemberRole('user-123', sampleHouseholdRow.id);

      assert.equal(result, 'admin');
    });

    it('should return null when member not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.getMemberRole('non-existent', sampleHouseholdRow.id);

      assert.equal(result, null);
    });
  });

  describe('getMembers', () => {
    it('should return all members of a household', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [
          sampleMemberRow,
          {
            ...sampleMemberRow,
            id: 'member-456',
            user_id: 'user-456',
            email: 'member@example.com',
            name: 'Member User',
            role: 'parent',
          },
        ],
        rowCount: 2,
      }));

      const result = await repository.getMembers(sampleHouseholdRow.id);

      assert.equal(result.length, 2);
      assert.equal(result[0].email, 'test@example.com');
      assert.equal(result[0].role, 'admin');
      assert.equal(result[1].email, 'member@example.com');
      assert.equal(result[1].role, 'parent');
    });

    it('should return empty array when household has no members', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.getMembers('empty-household');

      assert.deepEqual(result, []);
    });
  });

  describe('countAdmins', () => {
    it('should return count of admins', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ count: '2' }],
        rowCount: 1,
      }));

      const result = await repository.countAdmins(sampleHouseholdRow.id);

      assert.equal(result, 2);
    });
  });

  describe('isMember', () => {
    it('should return true when user is a member', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ 1: 1 }],
        rowCount: 1,
      }));

      const result = await repository.isMember('user-123', sampleHouseholdRow.id);

      assert.equal(result, true);
    });

    it('should return false when user is not a member', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.isMember('non-member', sampleHouseholdRow.id);

      assert.equal(result, false);
    });
  });

  describe('withClient', () => {
    it('should create new repository with different executor', () => {
      const mockClient = {
        query: mock.fn(),
        release: mock.fn(),
      };

      const clientRepo = repository.withClient(mockClient as never);

      assert.ok(clientRepo instanceof HouseholdRepository);
      assert.notEqual(clientRepo, repository);
    });
  });
});
