import { Pool } from 'pg';

/**
 * AuthorizationService - Centralized authorization logic for household operations
 *
 * This service centralizes the authorization checks that were previously duplicated
 * across route handlers. It provides consistent, reusable methods for:
 * - Checking household membership
 * - Role-based access control
 * - Task and assignment authorization
 */

export interface HouseholdMembership {
  role: 'admin' | 'parent' | 'child';
  householdId: string;
  userId: string;
}

export interface AuthorizationError {
  code: 'NOT_MEMBER' | 'INSUFFICIENT_ROLE' | 'NOT_FOUND' | 'UNAUTHORIZED';
  message: string;
}

export class AuthorizationService {
  constructor(private db: Pool) {}

  /**
   * Check if a user is a member of a household and get their role
   *
   * @param userId - UUID of the user
   * @param householdId - UUID of the household
   * @returns Membership info if member, null otherwise
   */
  async checkHouseholdMembership(
    userId: string,
    householdId: string,
  ): Promise<HouseholdMembership | null> {
    const result = await this.db.query<{ role: 'admin' | 'parent' | 'child' }>(
      'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
      [householdId, userId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      role: result.rows[0].role,
      householdId,
      userId,
    };
  }

  /**
   * Require a user to have one of the specified roles in a household
   *
   * @param userId - UUID of the user
   * @param householdId - UUID of the household
   * @param allowedRoles - Array of allowed roles (e.g., ['admin', 'parent'])
   * @throws AuthorizationError if user is not a member or doesn't have required role
   */
  async requireRole(
    userId: string,
    householdId: string,
    allowedRoles: Array<'admin' | 'parent' | 'child'>,
  ): Promise<HouseholdMembership> {
    const membership = await this.checkHouseholdMembership(userId, householdId);

    if (!membership) {
      const error: AuthorizationError = {
        code: 'NOT_MEMBER',
        message: 'You are not a member of this household',
      };
      throw error;
    }

    if (!allowedRoles.includes(membership.role)) {
      const error: AuthorizationError = {
        code: 'INSUFFICIENT_ROLE',
        message: `${allowedRoles.join(' or ')} role required for this action`,
      };
      throw error;
    }

    return membership;
  }

  /**
   * Check if a user can modify a specific task
   *
   * @param userId - UUID of the user
   * @param taskId - UUID of the task
   * @returns true if user can modify, false otherwise
   */
  async canModifyTask(userId: string, taskId: string): Promise<boolean> {
    // Get task's household
    const taskResult = await this.db.query<{ household_id: string }>(
      'SELECT household_id FROM tasks WHERE id = $1',
      [taskId],
    );

    if (taskResult.rows.length === 0) {
      return false;
    }

    const householdId = taskResult.rows[0].household_id;

    // Check if user is admin or parent in the household
    const membership = await this.checkHouseholdMembership(userId, householdId);

    if (!membership) {
      return false;
    }

    return membership.role === 'admin' || membership.role === 'parent';
  }

  /**
   * Check if a user can complete an assignment
   *
   * Rules:
   * - Parents/admins can complete any assignment in their household
   * - Children can only complete assignments assigned to them
   *
   * @param userId - UUID of the user
   * @param assignmentId - UUID of the task assignment
   * @returns true if user can complete, false otherwise
   */
  async canCompleteAssignment(userId: string, assignmentId: string): Promise<boolean> {
    // Get assignment with household info
    const assignmentResult = await this.db.query<{
      household_id: string;
      child_id: string | null;
    }>(`SELECT household_id, child_id FROM task_assignments WHERE id = $1`, [assignmentId]);

    if (assignmentResult.rows.length === 0) {
      return false;
    }

    const { household_id: householdId, child_id: assignedChildId } = assignmentResult.rows[0];

    // Check membership
    const membership = await this.checkHouseholdMembership(userId, householdId);

    if (!membership) {
      return false;
    }

    // Parents and admins can complete any assignment
    if (membership.role === 'admin' || membership.role === 'parent') {
      return true;
    }

    // Children can only complete their own assigned tasks
    if (membership.role === 'child') {
      // Household-wide tasks (no assigned child) can only be completed by parents
      if (!assignedChildId) {
        return false;
      }

      // Get child profile linked to this user
      const childResult = await this.db.query<{ id: string }>(
        'SELECT id FROM children WHERE user_id = $1 AND household_id = $2',
        [userId, householdId],
      );

      if (childResult.rows.length === 0) {
        return false;
      }

      const childId = childResult.rows[0].id;

      // Check if this assignment belongs to this child
      return assignedChildId === childId;
    }

    return false;
  }

  /**
   * Get the child profile linked to a user in a household
   *
   * @param userId - UUID of the user
   * @param householdId - UUID of the household
   * @returns Child ID if found, null otherwise
   */
  async getLinkedChildId(userId: string, householdId: string): Promise<string | null> {
    const result = await this.db.query<{ id: string }>(
      'SELECT id FROM children WHERE user_id = $1 AND household_id = $2',
      [userId, householdId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].id;
  }

  /**
   * Check if a child belongs to a household
   *
   * @param childId - UUID of the child
   * @param householdId - UUID of the household
   * @returns true if child belongs to household, false otherwise
   */
  async childBelongsToHousehold(childId: string, householdId: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT id FROM children WHERE id = $1 AND household_id = $2',
      [childId, householdId],
    );

    return result.rows.length > 0;
  }

  /**
   * Check if a task belongs to a household
   *
   * @param taskId - UUID of the task
   * @param householdId - UUID of the household
   * @returns true if task belongs to household, false otherwise
   */
  async taskBelongsToHousehold(taskId: string, householdId: string): Promise<boolean> {
    const result = await this.db.query('SELECT id FROM tasks WHERE id = $1 AND household_id = $2', [
      taskId,
      householdId,
    ]);

    return result.rows.length > 0;
  }

  /**
   * Get the household ID for a task
   *
   * @param taskId - UUID of the task
   * @returns Household ID if found, null otherwise
   */
  async getTaskHouseholdId(taskId: string): Promise<string | null> {
    const result = await this.db.query<{ household_id: string }>(
      'SELECT household_id FROM tasks WHERE id = $1',
      [taskId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].household_id;
  }

  /**
   * Get the household ID for an assignment
   *
   * @param assignmentId - UUID of the assignment
   * @returns Household ID if found, null otherwise
   */
  async getAssignmentHouseholdId(assignmentId: string): Promise<string | null> {
    const result = await this.db.query<{ household_id: string }>(
      'SELECT household_id FROM task_assignments WHERE id = $1',
      [assignmentId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].household_id;
  }
}

/**
 * Singleton instance and factory function
 */
let authorizationServiceInstance: AuthorizationService | undefined;

export function getAuthorizationService(db: Pool): AuthorizationService {
  if (!authorizationServiceInstance) {
    authorizationServiceInstance = new AuthorizationService(db);
  }
  return authorizationServiceInstance;
}

/**
 * Type guard to check if an error is an AuthorizationError
 */
export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as AuthorizationError).code === 'string' &&
    typeof (error as AuthorizationError).message === 'string'
  );
}
