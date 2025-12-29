import { Pool, PoolClient } from 'pg';
import {
  generateAssignments as generateAssignmentsInternal,
  type AssignmentGenerationResult,
} from './assignment-generator.js';

/**
 * AssignmentService - Centralized task assignment business logic
 *
 * This service wraps the existing assignment-generator.ts logic and provides
 * additional methods for:
 * - Assignment completion with points
 * - Getting child assignments
 * - Manual assignment creation
 */

export interface Assignment {
  id: string;
  taskId: string;
  childId: string | null;
  householdId: string;
  date: string;
  status: 'pending' | 'completed' | 'overdue';
  createdAt?: string;
}

export interface AssignmentWithDetails extends Assignment {
  taskName: string;
  taskDescription: string | null;
  childName: string | null;
  completedAt: string | null;
}

export interface TaskCompletion {
  id: string;
  pointsEarned: number;
  completedAt: string;
}

export interface CompleteAssignmentResult {
  assignment: Assignment & { status: 'completed'; completedAt: string };
  completion: TaskCompletion;
}

/**
 * Convert date to ISO string
 */
function toDateTimeString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date(String(value)).toISOString();
}

export class AssignmentService {
  constructor(private db: Pool) {}

  /**
   * Generate assignments for a household
   *
   * Wraps the existing assignment-generator.ts logic
   *
   * @param householdId - UUID of the household
   * @param startDate - Start date for generation
   * @param days - Number of days to generate (1-365)
   * @returns Generation result with created/skipped counts
   */
  async generateAssignments(
    householdId: string,
    startDate: Date,
    days: number,
  ): Promise<AssignmentGenerationResult> {
    return generateAssignmentsInternal(householdId, startDate, days);
  }

  /**
   * Complete an assignment and record points
   *
   * This method:
   * 1. Updates the assignment status to 'completed'
   * 2. Creates a task_completion record with points earned
   *
   * @param assignmentId - UUID of the assignment
   * @returns Completion result with assignment and points info
   * @throws Error if assignment not found or already completed
   */
  async completeAssignment(assignmentId: string): Promise<CompleteAssignmentResult> {
    // Get assignment with task points
    const assignmentResult = await this.db.query<{
      id: string;
      household_id: string;
      child_id: string | null;
      status: string;
      task_id: string;
      points: number;
    }>(
      `SELECT ta.id, ta.household_id, ta.child_id, ta.status, ta.task_id, t.points
       FROM task_assignments ta
       JOIN tasks t ON ta.task_id = t.id
       WHERE ta.id = $1`,
      [assignmentId],
    );

    if (assignmentResult.rows.length === 0) {
      throw new Error('Assignment not found');
    }

    const assignment = assignmentResult.rows[0];

    // Check if already completed (idempotent - return existing)
    if (assignment.status === 'completed') {
      const existingCompletion = await this.db.query<{
        id: string;
        points_earned: number;
        completed_at: Date;
      }>(
        `SELECT id, points_earned, completed_at
         FROM task_completions
         WHERE task_assignment_id = $1`,
        [assignmentId],
      );

      if (existingCompletion.rows.length > 0) {
        const completion = existingCompletion.rows[0];
        return {
          assignment: {
            id: assignment.id,
            taskId: assignment.task_id,
            childId: assignment.child_id,
            householdId: assignment.household_id,
            date: '', // Not needed for response
            status: 'completed',
            completedAt: toDateTimeString(completion.completed_at),
          },
          completion: {
            id: completion.id,
            pointsEarned: completion.points_earned,
            completedAt: toDateTimeString(completion.completed_at),
          },
        };
      }
    }

    // Only pending assignments can be completed
    if (assignment.status !== 'pending') {
      throw new Error('Only pending assignments can be completed');
    }

    // Use transaction for atomicity
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Update assignment status
      const updateResult = await client.query<{
        id: string;
        child_id: string | null;
        task_id: string;
      }>(
        `UPDATE task_assignments
         SET status = 'completed'
         WHERE id = $1 AND status = 'pending'
         RETURNING id, child_id, task_id`,
        [assignmentId],
      );

      if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('Failed to complete assignment - status may have changed');
      }

      const completedAssignment = updateResult.rows[0];
      const completedAt = new Date();

      // Insert task completion record with points
      const completionResult = await client.query<{
        id: string;
        points_earned: number;
        completed_at: Date;
      }>(
        `INSERT INTO task_completions (household_id, task_assignment_id, child_id, completed_at, points_earned)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, points_earned, completed_at`,
        [
          assignment.household_id,
          assignmentId,
          completedAssignment.child_id,
          completedAt,
          assignment.points,
        ],
      );

      await client.query('COMMIT');

      const completion = completionResult.rows[0];

      return {
        assignment: {
          id: completedAssignment.id,
          taskId: completedAssignment.task_id,
          childId: completedAssignment.child_id,
          householdId: assignment.household_id,
          date: '',
          status: 'completed',
          completedAt: toDateTimeString(completion.completed_at),
        },
        completion: {
          id: completion.id,
          pointsEarned: completion.points_earned,
          completedAt: toDateTimeString(completion.completed_at),
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get assignments for a child within a date range
   *
   * @param childId - UUID of the child
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   * @returns Array of assignments with task details
   */
  async getChildAssignments(
    childId: string,
    startDate: string,
    endDate: string,
  ): Promise<AssignmentWithDetails[]> {
    const result = await this.db.query<{
      id: string;
      task_id: string;
      child_id: string;
      household_id: string;
      date: string;
      status: string;
      task_name: string;
      task_description: string | null;
      child_name: string;
      completed_at: Date | null;
    }>(
      `SELECT
        ta.id,
        ta.task_id,
        ta.child_id,
        ta.household_id,
        ta.date::text as date,
        ta.status,
        t.name as task_name,
        t.description as task_description,
        c.name as child_name,
        tc.completed_at
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      LEFT JOIN children c ON ta.child_id = c.id
      LEFT JOIN task_completions tc ON ta.id = tc.task_assignment_id
      WHERE ta.child_id = $1 AND ta.date >= $2 AND ta.date <= $3
      ORDER BY ta.date ASC, t.name ASC`,
      [childId, startDate, endDate],
    );

    return result.rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      childId: row.child_id,
      householdId: row.household_id,
      date: row.date,
      status: row.status as 'pending' | 'completed' | 'overdue',
      taskName: row.task_name,
      taskDescription: row.task_description,
      childName: row.child_name,
      completedAt: row.completed_at ? toDateTimeString(row.completed_at) : null,
    }));
  }

  /**
   * Get assignments for a household within a date range
   *
   * @param householdId - UUID of the household
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   * @param filters - Optional filters (childId, status)
   * @returns Array of assignments with task details
   */
  async getHouseholdAssignments(
    householdId: string,
    startDate: string,
    endDate: string,
    filters?: {
      childId?: string;
      status?: 'pending' | 'completed' | 'overdue';
    },
  ): Promise<AssignmentWithDetails[]> {
    let query = `
      SELECT
        ta.id,
        ta.task_id,
        ta.child_id,
        ta.household_id,
        ta.date::text as date,
        ta.status,
        t.name as task_name,
        t.description as task_description,
        c.name as child_name,
        tc.completed_at
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      LEFT JOIN children c ON ta.child_id = c.id
      LEFT JOIN task_completions tc ON ta.id = tc.task_assignment_id
      WHERE ta.household_id = $1 AND ta.date >= $2 AND ta.date <= $3
    `;

    const params: (string | undefined)[] = [householdId, startDate, endDate];
    let paramIndex = 4;

    if (filters?.childId) {
      query += ` AND ta.child_id = $${paramIndex++}`;
      params.push(filters.childId);
    }

    if (filters?.status) {
      query += ` AND ta.status = $${paramIndex++}`;
      params.push(filters.status);
    }

    query += ' ORDER BY ta.date ASC, c.name ASC, t.name ASC';

    const result = await this.db.query<{
      id: string;
      task_id: string;
      child_id: string | null;
      household_id: string;
      date: string;
      status: string;
      task_name: string;
      task_description: string | null;
      child_name: string | null;
      completed_at: Date | null;
    }>(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      childId: row.child_id,
      householdId: row.household_id,
      date: row.date,
      status: row.status as 'pending' | 'completed' | 'overdue',
      taskName: row.task_name,
      taskDescription: row.task_description,
      childName: row.child_name,
      completedAt: row.completed_at ? toDateTimeString(row.completed_at) : null,
    }));
  }

  /**
   * Get a single assignment by ID
   *
   * @param assignmentId - UUID of the assignment
   * @returns Assignment or null if not found
   */
  async getAssignment(assignmentId: string): Promise<Assignment | null> {
    const result = await this.db.query<{
      id: string;
      task_id: string;
      child_id: string | null;
      household_id: string;
      date: string;
      status: string;
      created_at: Date;
    }>(
      `SELECT id, task_id, child_id, household_id, date::text as date, status, created_at
       FROM task_assignments WHERE id = $1`,
      [assignmentId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      taskId: row.task_id,
      childId: row.child_id,
      householdId: row.household_id,
      date: row.date,
      status: row.status as 'pending' | 'completed' | 'overdue',
      createdAt: toDateTimeString(row.created_at),
    };
  }

  /**
   * Create a manual assignment
   *
   * @param householdId - UUID of the household
   * @param taskId - UUID of the task
   * @param childId - UUID of the child (or null for household-wide)
   * @param date - Assignment date (YYYY-MM-DD)
   * @returns Created assignment
   * @throws Error if assignment already exists
   */
  async createManualAssignment(
    householdId: string,
    taskId: string,
    childId: string | null,
    date: string,
  ): Promise<Assignment> {
    // Check if task exists and belongs to household
    const taskResult = await this.db.query<{ id: string; active: boolean }>(
      'SELECT id, active FROM tasks WHERE id = $1 AND household_id = $2',
      [taskId, householdId],
    );

    if (taskResult.rows.length === 0) {
      throw new Error('Task not found');
    }

    if (!taskResult.rows[0].active) {
      throw new Error('Cannot assign inactive task');
    }

    // If childId provided, verify child belongs to household
    if (childId) {
      const childResult = await this.db.query(
        'SELECT id FROM children WHERE id = $1 AND household_id = $2',
        [childId, householdId],
      );

      if (childResult.rows.length === 0) {
        throw new Error('Child not found in this household');
      }
    }

    // Create the assignment
    const result = await this.db.query<{
      id: string;
      task_id: string;
      child_id: string | null;
      household_id: string;
      date: string;
      status: string;
      created_at: Date;
    }>(
      `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
       VALUES ($1, $2, $3, $4, 'pending')
       ON CONFLICT (task_id, child_id, date) WHERE child_id IS NOT NULL DO NOTHING
       RETURNING id, task_id, child_id, household_id, date::text as date, status, created_at`,
      [householdId, taskId, childId, date],
    );

    // Handle conflict (duplicate)
    if (result.rows.length === 0) {
      // Check for household-wide conflict if childId is null
      if (!childId) {
        const conflictCheck = await this.db.query(
          'SELECT id FROM task_assignments WHERE task_id = $1 AND date = $2 AND child_id IS NULL',
          [taskId, date],
        );

        if (conflictCheck.rows.length > 0) {
          throw new Error('Assignment already exists for this task and date');
        }
      }

      throw new Error('Assignment already exists for this task, child, and date');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      taskId: row.task_id,
      childId: row.child_id,
      householdId: row.household_id,
      date: row.date,
      status: row.status as 'pending' | 'completed' | 'overdue',
      createdAt: toDateTimeString(row.created_at),
    };
  }

  /**
   * Reassign an assignment to a different child
   *
   * @param assignmentId - UUID of the assignment
   * @param childId - UUID of the new child
   * @returns Updated assignment or null if not found
   * @throws Error if assignment is not pending
   */
  async reassignAssignment(assignmentId: string, childId: string): Promise<Assignment | null> {
    // Get current assignment
    const currentResult = await this.db.query<{
      id: string;
      status: string;
      household_id: string;
    }>('SELECT id, status, household_id FROM task_assignments WHERE id = $1', [assignmentId]);

    if (currentResult.rows.length === 0) {
      return null;
    }

    const current = currentResult.rows[0];

    if (current.status !== 'pending') {
      throw new Error('Only pending assignments can be reassigned');
    }

    // Verify child belongs to household
    const childResult = await this.db.query(
      'SELECT id FROM children WHERE id = $1 AND household_id = $2',
      [childId, current.household_id],
    );

    if (childResult.rows.length === 0) {
      throw new Error('Child not found in this household');
    }

    // Update assignment
    const result = await this.db.query<{
      id: string;
      task_id: string;
      child_id: string;
      household_id: string;
      date: string;
      status: string;
    }>(
      `UPDATE task_assignments
       SET child_id = $2
       WHERE id = $1 AND status = 'pending'
       RETURNING id, task_id, child_id, household_id, date::text as date, status`,
      [assignmentId, childId],
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to reassign - assignment may have been completed');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      taskId: row.task_id,
      childId: row.child_id,
      householdId: row.household_id,
      date: row.date,
      status: row.status as 'pending' | 'completed' | 'overdue',
    };
  }
}

/**
 * Singleton instance and factory function
 */
let assignmentServiceInstance: AssignmentService | undefined;

export function getAssignmentService(db: Pool): AssignmentService {
  if (!assignmentServiceInstance) {
    assignmentServiceInstance = new AssignmentService(db);
  }
  return assignmentServiceInstance;
}

// Re-export the generation result type
export type { AssignmentGenerationResult };
