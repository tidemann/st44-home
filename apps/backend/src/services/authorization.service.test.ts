import { test, describe, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import pg from 'pg';
import { AuthorizationService, isAuthorizationError } from './authorization.service.js';

/**
 * AuthorizationService Unit Tests
 *
 * Tests all authorization methods including:
 * - Household membership checks
 * - Role-based access control
 * - Task and assignment authorization
 */

describe('AuthorizationService', () => {
  let pool: pg.Pool;
  let service: AuthorizationService;
  let testHouseholdId: string;
  let testUserId: string;
  let testParentUserId: string;
  let testChildUserId: string;
  let testChildId: string;
  let testTaskId: string;
  let testAssignmentId: string;

  before(async () => {
    pool = new pg.Pool({
      host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '55432'),
      database: process.env.TEST_DB_NAME || 'st44_test',
      user: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
    });
    service = new AuthorizationService(pool);
  });

  after(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Create test users
    const adminUserResult = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2) RETURNING id`,
      [`admin-${Date.now()}@test.com`, 'hashedpassword'],
    );
    testUserId = adminUserResult.rows[0].id;

    const parentUserResult = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2) RETURNING id`,
      [`parent-${Date.now()}@test.com`, 'hashedpassword'],
    );
    testParentUserId = parentUserResult.rows[0].id;

    const childUserResult = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2) RETURNING id`,
      [`child-${Date.now()}@test.com`, 'hashedpassword'],
    );
    testChildUserId = childUserResult.rows[0].id;

    // Create test household
    const householdResult = await pool.query(
      'INSERT INTO households (name) VALUES ($1) RETURNING id',
      [`Test Household ${Date.now()}`],
    );
    testHouseholdId = householdResult.rows[0].id;

    // Add admin user to household
    await pool.query(
      'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
      [testHouseholdId, testUserId, 'admin'],
    );

    // Add parent user to household
    await pool.query(
      'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
      [testHouseholdId, testParentUserId, 'parent'],
    );

    // Add child user to household
    await pool.query(
      'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
      [testHouseholdId, testChildUserId, 'child'],
    );

    // Create test child profile linked to child user
    const childResult = await pool.query(
      `INSERT INTO children (household_id, user_id, name, birth_year)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [testHouseholdId, testChildUserId, 'Test Child', 2015],
    );
    testChildId = childResult.rows[0].id;

    // Create test task
    const taskResult = await pool.query(
      `INSERT INTO tasks (household_id, name, rule_type, rule_config, active)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [testHouseholdId, 'Test Task', 'daily', {}, true],
    );
    testTaskId = taskResult.rows[0].id;

    // Create test assignment
    const assignmentResult = await pool.query(
      `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [testHouseholdId, testTaskId, testChildId, '2025-01-01', 'pending'],
    );
    testAssignmentId = assignmentResult.rows[0].id;
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
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    if (testParentUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testParentUserId]);
    }
    if (testChildUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testChildUserId]);
    }
  });

  // ==================== checkHouseholdMembership ====================

  describe('checkHouseholdMembership', () => {
    test('returns membership info for valid member', async () => {
      const result = await service.checkHouseholdMembership(testUserId, testHouseholdId);

      assert.ok(result, 'Should return membership info');
      assert.strictEqual(result.role, 'admin');
      assert.strictEqual(result.householdId, testHouseholdId);
      assert.strictEqual(result.userId, testUserId);
    });

    test('returns null for non-member', async () => {
      const nonMemberResult = await pool.query(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
        [`nonmember-${Date.now()}@test.com`, 'hashedpassword'],
      );
      const nonMemberId = nonMemberResult.rows[0].id;

      try {
        const result = await service.checkHouseholdMembership(nonMemberId, testHouseholdId);
        assert.strictEqual(result, null, 'Should return null for non-member');
      } finally {
        await pool.query('DELETE FROM users WHERE id = $1', [nonMemberId]);
      }
    });

    test('returns null for invalid household', async () => {
      const fakeHouseholdId = '00000000-0000-0000-0000-000000000000';
      const result = await service.checkHouseholdMembership(testUserId, fakeHouseholdId);
      assert.strictEqual(result, null, 'Should return null for invalid household');
    });

    test('returns correct role for parent', async () => {
      const result = await service.checkHouseholdMembership(testParentUserId, testHouseholdId);

      assert.ok(result, 'Should return membership info');
      assert.strictEqual(result.role, 'parent');
    });

    test('returns correct role for child', async () => {
      const result = await service.checkHouseholdMembership(testChildUserId, testHouseholdId);

      assert.ok(result, 'Should return membership info');
      assert.strictEqual(result.role, 'child');
    });
  });

  // ==================== requireRole ====================

  describe('requireRole', () => {
    test('returns membership for allowed role', async () => {
      const result = await service.requireRole(testUserId, testHouseholdId, ['admin', 'parent']);

      assert.ok(result, 'Should return membership');
      assert.strictEqual(result.role, 'admin');
    });

    test('allows parent when parent role is specified', async () => {
      const result = await service.requireRole(testParentUserId, testHouseholdId, [
        'admin',
        'parent',
      ]);

      assert.ok(result, 'Should return membership');
      assert.strictEqual(result.role, 'parent');
    });

    test('throws NOT_MEMBER for non-member', async () => {
      const nonMemberResult = await pool.query(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
        [`nonmember-${Date.now()}@test.com`, 'hashedpassword'],
      );
      const nonMemberId = nonMemberResult.rows[0].id;

      try {
        await service.requireRole(nonMemberId, testHouseholdId, ['admin', 'parent']);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(isAuthorizationError(error), 'Should be AuthorizationError');
        assert.strictEqual(error.code, 'NOT_MEMBER');
      } finally {
        await pool.query('DELETE FROM users WHERE id = $1', [nonMemberId]);
      }
    });

    test('throws INSUFFICIENT_ROLE for wrong role', async () => {
      try {
        await service.requireRole(testChildUserId, testHouseholdId, ['admin', 'parent']);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(isAuthorizationError(error), 'Should be AuthorizationError');
        assert.strictEqual(error.code, 'INSUFFICIENT_ROLE');
        assert.ok(error.message.includes('admin or parent'));
      }
    });

    test('allows child when child role is specified', async () => {
      const result = await service.requireRole(testChildUserId, testHouseholdId, ['child']);

      assert.ok(result, 'Should return membership');
      assert.strictEqual(result.role, 'child');
    });
  });

  // ==================== canModifyTask ====================

  describe('canModifyTask', () => {
    test('returns true for admin', async () => {
      const result = await service.canModifyTask(testUserId, testTaskId);
      assert.strictEqual(result, true, 'Admin should be able to modify task');
    });

    test('returns true for parent', async () => {
      const result = await service.canModifyTask(testParentUserId, testTaskId);
      assert.strictEqual(result, true, 'Parent should be able to modify task');
    });

    test('returns false for child', async () => {
      const result = await service.canModifyTask(testChildUserId, testTaskId);
      assert.strictEqual(result, false, 'Child should not be able to modify task');
    });

    test('returns false for non-member', async () => {
      const nonMemberResult = await pool.query(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
        [`nonmember-${Date.now()}@test.com`, 'hashedpassword'],
      );
      const nonMemberId = nonMemberResult.rows[0].id;

      try {
        const result = await service.canModifyTask(nonMemberId, testTaskId);
        assert.strictEqual(result, false, 'Non-member should not be able to modify task');
      } finally {
        await pool.query('DELETE FROM users WHERE id = $1', [nonMemberId]);
      }
    });

    test('returns false for non-existent task', async () => {
      const fakeTaskId = '00000000-0000-0000-0000-000000000000';
      const result = await service.canModifyTask(testUserId, fakeTaskId);
      assert.strictEqual(result, false, 'Should return false for non-existent task');
    });
  });

  // ==================== canCompleteAssignment ====================

  describe('canCompleteAssignment', () => {
    test('returns true for admin', async () => {
      const result = await service.canCompleteAssignment(testUserId, testAssignmentId);
      assert.strictEqual(result, true, 'Admin should be able to complete assignment');
    });

    test('returns true for parent', async () => {
      const result = await service.canCompleteAssignment(testParentUserId, testAssignmentId);
      assert.strictEqual(result, true, 'Parent should be able to complete assignment');
    });

    test('returns true for assigned child', async () => {
      const result = await service.canCompleteAssignment(testChildUserId, testAssignmentId);
      assert.strictEqual(result, true, 'Assigned child should be able to complete assignment');
    });

    test('returns false for different child', async () => {
      // Create another child user and child profile
      const otherChildUserResult = await pool.query(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
        [`other-child-${Date.now()}@test.com`, 'hashedpassword'],
      );
      const otherChildUserId = otherChildUserResult.rows[0].id;

      await pool.query(
        'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
        [testHouseholdId, otherChildUserId, 'child'],
      );

      await pool.query(
        `INSERT INTO children (household_id, user_id, name, birth_year) VALUES ($1, $2, $3, $4)`,
        [testHouseholdId, otherChildUserId, 'Other Child', 2016],
      );

      try {
        const result = await service.canCompleteAssignment(otherChildUserId, testAssignmentId);
        assert.strictEqual(
          result,
          false,
          'Different child should not be able to complete assignment',
        );
      } finally {
        await pool.query('DELETE FROM children WHERE user_id = $1', [otherChildUserId]);
        await pool.query('DELETE FROM household_members WHERE user_id = $1', [otherChildUserId]);
        await pool.query('DELETE FROM users WHERE id = $1', [otherChildUserId]);
      }
    });

    test('returns false for household-wide task completion by child', async () => {
      // Create assignment without child (household-wide)
      const householdAssignmentResult = await pool.query(
        `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
         VALUES ($1, $2, NULL, $3, $4) RETURNING id`,
        [testHouseholdId, testTaskId, '2025-01-02', 'pending'],
      );
      const householdAssignmentId = householdAssignmentResult.rows[0].id;

      try {
        const result = await service.canCompleteAssignment(testChildUserId, householdAssignmentId);
        assert.strictEqual(
          result,
          false,
          'Child should not be able to complete household-wide task',
        );
      } finally {
        await pool.query('DELETE FROM task_assignments WHERE id = $1', [householdAssignmentId]);
      }
    });

    test('returns false for non-member', async () => {
      const nonMemberResult = await pool.query(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
        [`nonmember-${Date.now()}@test.com`, 'hashedpassword'],
      );
      const nonMemberId = nonMemberResult.rows[0].id;

      try {
        const result = await service.canCompleteAssignment(nonMemberId, testAssignmentId);
        assert.strictEqual(result, false, 'Non-member should not be able to complete assignment');
      } finally {
        await pool.query('DELETE FROM users WHERE id = $1', [nonMemberId]);
      }
    });

    test('returns false for non-existent assignment', async () => {
      const fakeAssignmentId = '00000000-0000-0000-0000-000000000000';
      const result = await service.canCompleteAssignment(testUserId, fakeAssignmentId);
      assert.strictEqual(result, false, 'Should return false for non-existent assignment');
    });
  });

  // ==================== getLinkedChildId ====================

  describe('getLinkedChildId', () => {
    test('returns child ID for user with linked child', async () => {
      const result = await service.getLinkedChildId(testChildUserId, testHouseholdId);
      assert.strictEqual(result, testChildId, 'Should return linked child ID');
    });

    test('returns null for user without linked child', async () => {
      const result = await service.getLinkedChildId(testUserId, testHouseholdId);
      assert.strictEqual(result, null, 'Should return null for user without linked child');
    });

    test('returns null for non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const result = await service.getLinkedChildId(fakeUserId, testHouseholdId);
      assert.strictEqual(result, null, 'Should return null for non-existent user');
    });
  });

  // ==================== childBelongsToHousehold ====================

  describe('childBelongsToHousehold', () => {
    test('returns true for child in household', async () => {
      const result = await service.childBelongsToHousehold(testChildId, testHouseholdId);
      assert.strictEqual(result, true, 'Child should belong to household');
    });

    test('returns false for child in different household', async () => {
      // Create another household
      const otherHouseholdResult = await pool.query(
        'INSERT INTO households (name) VALUES ($1) RETURNING id',
        ['Other Household'],
      );
      const otherHouseholdId = otherHouseholdResult.rows[0].id;

      try {
        const result = await service.childBelongsToHousehold(testChildId, otherHouseholdId);
        assert.strictEqual(result, false, 'Child should not belong to other household');
      } finally {
        await pool.query('DELETE FROM households WHERE id = $1', [otherHouseholdId]);
      }
    });

    test('returns false for non-existent child', async () => {
      const fakeChildId = '00000000-0000-0000-0000-000000000000';
      const result = await service.childBelongsToHousehold(fakeChildId, testHouseholdId);
      assert.strictEqual(result, false, 'Should return false for non-existent child');
    });
  });

  // ==================== taskBelongsToHousehold ====================

  describe('taskBelongsToHousehold', () => {
    test('returns true for task in household', async () => {
      const result = await service.taskBelongsToHousehold(testTaskId, testHouseholdId);
      assert.strictEqual(result, true, 'Task should belong to household');
    });

    test('returns false for task in different household', async () => {
      // Create another household
      const otherHouseholdResult = await pool.query(
        'INSERT INTO households (name) VALUES ($1) RETURNING id',
        ['Other Household'],
      );
      const otherHouseholdId = otherHouseholdResult.rows[0].id;

      try {
        const result = await service.taskBelongsToHousehold(testTaskId, otherHouseholdId);
        assert.strictEqual(result, false, 'Task should not belong to other household');
      } finally {
        await pool.query('DELETE FROM households WHERE id = $1', [otherHouseholdId]);
      }
    });

    test('returns false for non-existent task', async () => {
      const fakeTaskId = '00000000-0000-0000-0000-000000000000';
      const result = await service.taskBelongsToHousehold(fakeTaskId, testHouseholdId);
      assert.strictEqual(result, false, 'Should return false for non-existent task');
    });
  });

  // ==================== getTaskHouseholdId ====================

  describe('getTaskHouseholdId', () => {
    test('returns household ID for existing task', async () => {
      const result = await service.getTaskHouseholdId(testTaskId);
      assert.strictEqual(result, testHouseholdId, 'Should return correct household ID');
    });

    test('returns null for non-existent task', async () => {
      const fakeTaskId = '00000000-0000-0000-0000-000000000000';
      const result = await service.getTaskHouseholdId(fakeTaskId);
      assert.strictEqual(result, null, 'Should return null for non-existent task');
    });
  });

  // ==================== getAssignmentHouseholdId ====================

  describe('getAssignmentHouseholdId', () => {
    test('returns household ID for existing assignment', async () => {
      const result = await service.getAssignmentHouseholdId(testAssignmentId);
      assert.strictEqual(result, testHouseholdId, 'Should return correct household ID');
    });

    test('returns null for non-existent assignment', async () => {
      const fakeAssignmentId = '00000000-0000-0000-0000-000000000000';
      const result = await service.getAssignmentHouseholdId(fakeAssignmentId);
      assert.strictEqual(result, null, 'Should return null for non-existent assignment');
    });
  });

  // ==================== isAuthorizationError type guard ====================

  describe('isAuthorizationError', () => {
    test('returns true for valid AuthorizationError', () => {
      const error = { code: 'NOT_MEMBER', message: 'Test message' };
      assert.strictEqual(isAuthorizationError(error), true);
    });

    test('returns false for non-object', () => {
      assert.strictEqual(isAuthorizationError('string'), false);
      assert.strictEqual(isAuthorizationError(123), false);
      assert.strictEqual(isAuthorizationError(null), false);
      assert.strictEqual(isAuthorizationError(undefined), false);
    });

    test('returns false for object without code', () => {
      const error = { message: 'Test message' };
      assert.strictEqual(isAuthorizationError(error), false);
    });

    test('returns false for object without message', () => {
      const error = { code: 'NOT_MEMBER' };
      assert.strictEqual(isAuthorizationError(error), false);
    });
  });
});
