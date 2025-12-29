import { test, describe, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import pg from 'pg';
import { HouseholdService, type HouseholdRole } from './household.service.js';

/**
 * HouseholdService Unit Tests
 *
 * Tests household CRUD operations and member management
 */

describe('HouseholdService', () => {
  let pool: pg.Pool;
  let service: HouseholdService;
  let testUserId: string;
  let testUser2Id: string;
  let testHouseholdId: string;

  before(async () => {
    pool = new pg.Pool({
      host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '55432'),
      database: process.env.TEST_DB_NAME || 'st44_test',
      user: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
    });
    service = new HouseholdService(pool);
  });

  after(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Create test users
    const user1Result = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2) RETURNING id`,
      [`user1-${Date.now()}@test.com`, 'hashedpassword'],
    );
    testUserId = user1Result.rows[0].id;

    const user2Result = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2) RETURNING id`,
      [`user2-${Date.now()}@test.com`, 'hashedpassword'],
    );
    testUser2Id = user2Result.rows[0].id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testHouseholdId) {
      await pool.query('DELETE FROM task_assignments WHERE household_id = $1', [testHouseholdId]);
      await pool.query('DELETE FROM tasks WHERE household_id = $1', [testHouseholdId]);
      await pool.query('DELETE FROM children WHERE household_id = $1', [testHouseholdId]);
      await pool.query('DELETE FROM household_members WHERE household_id = $1', [testHouseholdId]);
      await pool.query('DELETE FROM households WHERE id = $1', [testHouseholdId]);
      testHouseholdId = '';
    }
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    if (testUser2Id) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUser2Id]);
    }
  });

  // ==================== createHousehold ====================

  describe('createHousehold', () => {
    test('creates household with creator as admin', async () => {
      const result = await service.createHousehold(testUserId, { name: 'Test Household' });
      testHouseholdId = result.id;

      assert.ok(result.id, 'Should have an ID');
      assert.strictEqual(result.name, 'Test Household');
      assert.strictEqual(result.role, 'admin');
      assert.ok(result.createdAt, 'Should have createdAt');
      assert.ok(result.updatedAt, 'Should have updatedAt');
    });

    test('trims whitespace from name', async () => {
      const result = await service.createHousehold(testUserId, { name: '  Trimmed Name  ' });
      testHouseholdId = result.id;

      assert.strictEqual(result.name, 'Trimmed Name');
    });

    test('creates household_members record', async () => {
      const result = await service.createHousehold(testUserId, { name: 'Member Test' });
      testHouseholdId = result.id;

      const memberResult = await pool.query(
        'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
        [result.id, testUserId],
      );

      assert.strictEqual(memberResult.rows.length, 1, 'Should create member record');
      assert.strictEqual(memberResult.rows[0].role, 'admin', 'Creator should be admin');
    });
  });

  // ==================== getHousehold ====================

  describe('getHousehold', () => {
    beforeEach(async () => {
      const result = await pool.query('INSERT INTO households (name) VALUES ($1) RETURNING id', [
        'Get Test Household',
      ]);
      testHouseholdId = result.rows[0].id;
    });

    test('returns household for valid ID', async () => {
      const household = await service.getHousehold(testHouseholdId);

      assert.ok(household, 'Should return household');
      assert.strictEqual(household.id, testHouseholdId);
      assert.strictEqual(household.name, 'Get Test Household');
    });

    test('returns null for non-existent ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const household = await service.getHousehold(fakeId);

      assert.strictEqual(household, null, 'Should return null');
    });
  });

  // ==================== getHouseholdWithCounts ====================

  describe('getHouseholdWithCounts', () => {
    beforeEach(async () => {
      const result = await pool.query('INSERT INTO households (name) VALUES ($1) RETURNING id', [
        'Counts Test Household',
      ]);
      testHouseholdId = result.rows[0].id;

      // Add members
      await pool.query(
        'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
        [testHouseholdId, testUserId, 'admin'],
      );
      await pool.query(
        'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
        [testHouseholdId, testUser2Id, 'parent'],
      );

      // Add children
      await pool.query(
        'INSERT INTO children (household_id, name, birth_year) VALUES ($1, $2, $3)',
        [testHouseholdId, 'Child 1', 2015],
      );
      await pool.query(
        'INSERT INTO children (household_id, name, birth_year) VALUES ($1, $2, $3)',
        [testHouseholdId, 'Child 2', 2017],
      );
    });

    test('returns household with correct counts', async () => {
      const household = await service.getHouseholdWithCounts(testHouseholdId);

      assert.ok(household, 'Should return household');
      assert.strictEqual(household.memberCount, 2, 'Should have 2 members');
      assert.strictEqual(household.childrenCount, 2, 'Should have 2 children');
    });

    test('returns null for non-existent ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const household = await service.getHouseholdWithCounts(fakeId);

      assert.strictEqual(household, null, 'Should return null');
    });
  });

  // ==================== updateHousehold ====================

  describe('updateHousehold', () => {
    beforeEach(async () => {
      const result = await pool.query('INSERT INTO households (name) VALUES ($1) RETURNING id', [
        'Original Name',
      ]);
      testHouseholdId = result.rows[0].id;
    });

    test('updates household name', async () => {
      const result = await service.updateHousehold(testHouseholdId, 'New Name');

      assert.ok(result, 'Should return updated household');
      assert.strictEqual(result.name, 'New Name');
    });

    test('trims whitespace from name', async () => {
      const result = await service.updateHousehold(testHouseholdId, '  Trimmed  ');

      assert.ok(result, 'Should return updated household');
      assert.strictEqual(result.name, 'Trimmed');
    });

    test('returns null for non-existent ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const result = await service.updateHousehold(fakeId, 'New Name');

      assert.strictEqual(result, null, 'Should return null');
    });
  });

  // ==================== addMember ====================

  describe('addMember', () => {
    beforeEach(async () => {
      const result = await pool.query('INSERT INTO households (name) VALUES ($1) RETURNING id', [
        'Add Member Test',
      ]);
      testHouseholdId = result.rows[0].id;
    });

    test('adds member with specified role', async () => {
      await service.addMember(testHouseholdId, testUserId, 'parent');

      const memberResult = await pool.query(
        'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
        [testHouseholdId, testUserId],
      );

      assert.strictEqual(memberResult.rows.length, 1);
      assert.strictEqual(memberResult.rows[0].role, 'parent');
    });

    test('throws error for duplicate member', async () => {
      await service.addMember(testHouseholdId, testUserId, 'parent');

      try {
        await service.addMember(testHouseholdId, testUserId, 'admin');
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('already a member'));
      }
    });
  });

  // ==================== removeMember ====================

  describe('removeMember', () => {
    beforeEach(async () => {
      const result = await pool.query('INSERT INTO households (name) VALUES ($1) RETURNING id', [
        'Remove Member Test',
      ]);
      testHouseholdId = result.rows[0].id;

      // Add admin
      await pool.query(
        'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
        [testHouseholdId, testUserId, 'admin'],
      );

      // Add parent
      await pool.query(
        'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
        [testHouseholdId, testUser2Id, 'parent'],
      );
    });

    test('removes non-admin member', async () => {
      const result = await service.removeMember(testHouseholdId, testUser2Id);

      assert.strictEqual(result, true, 'Should return true for successful removal');

      const memberResult = await pool.query(
        'SELECT * FROM household_members WHERE household_id = $1 AND user_id = $2',
        [testHouseholdId, testUser2Id],
      );

      assert.strictEqual(memberResult.rows.length, 0, 'Member should be removed');
    });

    test('returns false for non-existent member', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const result = await service.removeMember(testHouseholdId, fakeUserId);

      assert.strictEqual(result, false, 'Should return false');
    });

    test('throws error when removing last admin', async () => {
      try {
        await service.removeMember(testHouseholdId, testUserId);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('last admin'));
      }
    });

    test('allows removing admin when another admin exists', async () => {
      // Add another admin
      const admin2Result = await pool.query(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
        [`admin2-${Date.now()}@test.com`, 'hashedpassword'],
      );
      const admin2Id = admin2Result.rows[0].id;

      await pool.query(
        'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
        [testHouseholdId, admin2Id, 'admin'],
      );

      try {
        const result = await service.removeMember(testHouseholdId, testUserId);
        assert.strictEqual(result, true, 'Should allow removing admin when another exists');
      } finally {
        await pool.query('DELETE FROM household_members WHERE user_id = $1', [admin2Id]);
        await pool.query('DELETE FROM users WHERE id = $1', [admin2Id]);
      }
    });
  });

  // ==================== getHouseholdMembers ====================

  describe('getHouseholdMembers', () => {
    beforeEach(async () => {
      const result = await pool.query('INSERT INTO households (name) VALUES ($1) RETURNING id', [
        'Members List Test',
      ]);
      testHouseholdId = result.rows[0].id;

      // Add members
      await pool.query(
        'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
        [testHouseholdId, testUserId, 'admin'],
      );
      await pool.query(
        'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
        [testHouseholdId, testUser2Id, 'child'],
      );
    });

    test('returns all members with correct data', async () => {
      const members = await service.getHouseholdMembers(testHouseholdId);

      assert.strictEqual(members.length, 2, 'Should return 2 members');

      // Should be sorted by role DESC (alphabetically: parent > child > admin), then email ASC
      // With roles 'admin' and 'child', child comes first in DESC alphabetical order
      assert.strictEqual(members[0].role, 'child');
      assert.strictEqual(members[1].role, 'admin');

      // Check member data
      assert.ok(members[0].userId, 'Should have userId');
      assert.ok(members[0].email, 'Should have email');
      assert.ok(members[0].joinedAt, 'Should have joinedAt');
    });

    test('returns empty array for household with no members', async () => {
      const emptyHouseholdResult = await pool.query(
        'INSERT INTO households (name) VALUES ($1) RETURNING id',
        ['Empty Household'],
      );
      const emptyHouseholdId = emptyHouseholdResult.rows[0].id;

      try {
        const members = await service.getHouseholdMembers(emptyHouseholdId);
        assert.strictEqual(members.length, 0, 'Should return empty array');
      } finally {
        await pool.query('DELETE FROM households WHERE id = $1', [emptyHouseholdId]);
      }
    });
  });

  // ==================== listUserHouseholds ====================

  describe('listUserHouseholds', () => {
    beforeEach(async () => {
      // Create first household
      const result1 = await pool.query('INSERT INTO households (name) VALUES ($1) RETURNING id', [
        'Household 1',
      ]);
      testHouseholdId = result1.rows[0].id;

      await pool.query(
        'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
        [testHouseholdId, testUserId, 'admin'],
      );

      // Create second household
      const result2 = await pool.query('INSERT INTO households (name) VALUES ($1) RETURNING id', [
        'Household 2',
      ]);
      const household2Id = result2.rows[0].id;

      await pool.query(
        'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
        [household2Id, testUserId, 'parent'],
      );

      // Add children to first household
      await pool.query(
        'INSERT INTO children (household_id, name, birth_year) VALUES ($1, $2, $3)',
        [testHouseholdId, 'Child', 2015],
      );
    });

    afterEach(async () => {
      // Clean up second household
      const households = await pool.query(
        'SELECT household_id FROM household_members WHERE user_id = $1',
        [testUserId],
      );

      for (const row of households.rows) {
        await pool.query('DELETE FROM children WHERE household_id = $1', [row.household_id]);
        await pool.query('DELETE FROM household_members WHERE household_id = $1', [
          row.household_id,
        ]);
        await pool.query('DELETE FROM households WHERE id = $1', [row.household_id]);
      }
    });

    test('returns all households for user', async () => {
      const households = await service.listUserHouseholds(testUserId);

      assert.strictEqual(households.length, 2, 'Should return 2 households');
    });

    test('includes role and counts', async () => {
      const households = await service.listUserHouseholds(testUserId);

      // Find the first household (admin role with 1 child)
      const adminHousehold = households.find((h) => h.role === 'admin');
      assert.ok(adminHousehold, 'Should have admin household');
      assert.strictEqual(adminHousehold.memberCount, 1);
      assert.strictEqual(adminHousehold.childrenCount, 1);
    });

    test('returns empty array for user with no households', async () => {
      const newUserResult = await pool.query(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
        [`nohouse-${Date.now()}@test.com`, 'hashedpassword'],
      );
      const newUserId = newUserResult.rows[0].id;

      try {
        const households = await service.listUserHouseholds(newUserId);
        assert.strictEqual(households.length, 0, 'Should return empty array');
      } finally {
        await pool.query('DELETE FROM users WHERE id = $1', [newUserId]);
      }
    });
  });

  // ==================== updateMemberRole ====================

  describe('updateMemberRole', () => {
    beforeEach(async () => {
      const result = await pool.query('INSERT INTO households (name) VALUES ($1) RETURNING id', [
        'Role Update Test',
      ]);
      testHouseholdId = result.rows[0].id;

      // Add admin
      await pool.query(
        'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
        [testHouseholdId, testUserId, 'admin'],
      );

      // Add parent
      await pool.query(
        'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
        [testHouseholdId, testUser2Id, 'parent'],
      );
    });

    test('updates member role', async () => {
      const result = await service.updateMemberRole(testHouseholdId, testUser2Id, 'admin');

      assert.strictEqual(result, true, 'Should return true for successful update');

      const memberResult = await pool.query(
        'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
        [testHouseholdId, testUser2Id],
      );

      assert.strictEqual(memberResult.rows[0].role, 'admin');
    });

    test('returns false for non-existent member', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const result = await service.updateMemberRole(testHouseholdId, fakeUserId, 'parent');

      assert.strictEqual(result, false, 'Should return false');
    });

    test('throws error when demoting last admin', async () => {
      try {
        await service.updateMemberRole(testHouseholdId, testUserId, 'parent');
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('last admin'));
      }
    });

    test('allows demoting admin when another admin exists', async () => {
      // First promote the other user to admin
      await service.updateMemberRole(testHouseholdId, testUser2Id, 'admin');

      // Now demote the first admin
      const result = await service.updateMemberRole(testHouseholdId, testUserId, 'parent');
      assert.strictEqual(result, true, 'Should allow demoting when another admin exists');
    });
  });

  // ==================== getMemberRole ====================

  describe('getMemberRole', () => {
    beforeEach(async () => {
      const result = await pool.query('INSERT INTO households (name) VALUES ($1) RETURNING id', [
        'Get Role Test',
      ]);
      testHouseholdId = result.rows[0].id;

      await pool.query(
        'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
        [testHouseholdId, testUserId, 'admin'],
      );
    });

    test('returns role for existing member', async () => {
      const role = await service.getMemberRole(testUserId, testHouseholdId);
      assert.strictEqual(role, 'admin');
    });

    test('returns null for non-member', async () => {
      const role = await service.getMemberRole(testUser2Id, testHouseholdId);
      assert.strictEqual(role, null);
    });

    test('returns null for non-existent household', async () => {
      const fakeHouseholdId = '00000000-0000-0000-0000-000000000000';
      const role = await service.getMemberRole(testUserId, fakeHouseholdId);
      assert.strictEqual(role, null);
    });
  });
});
