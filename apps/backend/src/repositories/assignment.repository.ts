import type { Pool, PoolClient } from 'pg';
import type {
  TaskAssignmentRow,
  TaskAssignmentStatus,
  TaskCompletionRow,
} from '../types/database.js';

/**
 * AssignmentRepository - Data access layer for task_assignments and task_completions tables
 *
 * Encapsulates all SQL queries for assignment operations.
 * Services should use this repository instead of direct database access.
 */

export interface Assignment {
  id: string;
  householdId: string;
  taskId: string;
  childId: string | null;
  date: string;
  status: TaskAssignmentStatus;
  createdAt: string;
}

export interface AssignmentWithDetails extends Assignment {
  taskName: string;
  taskDescription: string | null;
  taskPoints: number;
  childName: string | null;
  completedAt: string | null;
}

export interface TaskCompletion {
  id: string;
  householdId: string;
  taskAssignmentId: string;
  childId: string;
  completedAt: string;
  pointsEarned: number;
}

export interface CreateAssignmentDto {
  householdId: string;
  taskId: string;
  childId: string | null;
  date: string;
  status?: TaskAssignmentStatus;
}

export interface CreateCompletionDto {
  householdId: string;
  taskAssignmentId: string;
  childId: string | null;
  completedAt: Date;
  pointsEarned: number;
}

export interface AssignmentFilters {
  childId?: string;
  status?: TaskAssignmentStatus;
  taskId?: string;
}

/**
 * Database executor type - supports both Pool and PoolClient
 */
type DbExecutor = Pool | PoolClient;

/**
 * Convert date to ISO string
 */
function toDateTimeString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date(String(value)).toISOString();
}

/**
 * Map database row to Assignment domain object
 */
function mapRowToAssignment(row: TaskAssignmentRow & { created_at?: Date }): Assignment {
  return {
    id: row.id,
    householdId: row.household_id,
    taskId: row.task_id,
    childId: row.child_id,
    date: row.date,
    status: row.status,
    createdAt: row.created_at ? toDateTimeString(row.created_at) : new Date().toISOString(),
  };
}

export class AssignmentRepository {
  constructor(private db: DbExecutor) {}

  /**
   * Create a new instance with a different executor (for transactions)
   */
  withClient(client: PoolClient): AssignmentRepository {
    return new AssignmentRepository(client);
  }

  /**
   * Find an assignment by ID
   */
  async findById(assignmentId: string): Promise<Assignment | null> {
    const result = await this.db.query<TaskAssignmentRow & { created_at: Date }>(
      `SELECT id, household_id, task_id, child_id, date::text as date, status, created_at
       FROM task_assignments WHERE id = $1`,
      [assignmentId],
    );

    if (result.rows.length === 0) return null;
    return mapRowToAssignment(result.rows[0]);
  }

  /**
   * Find an assignment by ID with task and child details
   */
  async findByIdWithDetails(assignmentId: string): Promise<AssignmentWithDetails | null> {
    const result = await this.db.query<{
      id: string;
      household_id: string;
      task_id: string;
      child_id: string | null;
      date: string;
      status: TaskAssignmentStatus;
      created_at: Date;
      task_name: string;
      task_description: string | null;
      task_points: number;
      child_name: string | null;
      completed_at: Date | null;
    }>(
      `SELECT
        ta.id, ta.household_id, ta.task_id, ta.child_id, ta.date::text as date, ta.status, ta.created_at,
        t.name as task_name, t.description as task_description, t.points as task_points,
        c.name as child_name,
        tc.completed_at
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      LEFT JOIN children c ON ta.child_id = c.id
      LEFT JOIN task_completions tc ON ta.id = tc.task_assignment_id
      WHERE ta.id = $1`,
      [assignmentId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      householdId: row.household_id,
      taskId: row.task_id,
      childId: row.child_id,
      date: row.date,
      status: row.status,
      createdAt: toDateTimeString(row.created_at),
      taskName: row.task_name,
      taskDescription: row.task_description,
      taskPoints: row.task_points,
      childName: row.child_name,
      completedAt: row.completed_at ? toDateTimeString(row.completed_at) : null,
    };
  }

  /**
   * Find assignments for a child within a date range
   */
  async findByChild(
    childId: string,
    startDate: string,
    endDate: string,
  ): Promise<AssignmentWithDetails[]> {
    const result = await this.db.query<{
      id: string;
      household_id: string;
      task_id: string;
      child_id: string;
      date: string;
      status: TaskAssignmentStatus;
      created_at: Date;
      task_name: string;
      task_description: string | null;
      task_points: number;
      child_name: string;
      completed_at: Date | null;
    }>(
      `SELECT
        ta.id, ta.household_id, ta.task_id, ta.child_id, ta.date::text as date, ta.status, ta.created_at,
        t.name as task_name, t.description as task_description, t.points as task_points,
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
      householdId: row.household_id,
      taskId: row.task_id,
      childId: row.child_id,
      date: row.date,
      status: row.status,
      createdAt: toDateTimeString(row.created_at),
      taskName: row.task_name,
      taskDescription: row.task_description,
      taskPoints: row.task_points,
      childName: row.child_name,
      completedAt: row.completed_at ? toDateTimeString(row.completed_at) : null,
    }));
  }

  /**
   * Find assignments for a household within a date range
   */
  async findByHousehold(
    householdId: string,
    startDate: string,
    endDate: string,
    filters: AssignmentFilters = {},
  ): Promise<AssignmentWithDetails[]> {
    let query = `
      SELECT
        ta.id, ta.household_id, ta.task_id, ta.child_id, ta.date::text as date, ta.status, ta.created_at,
        t.name as task_name, t.description as task_description, t.points as task_points,
        c.name as child_name,
        tc.completed_at
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      LEFT JOIN children c ON ta.child_id = c.id
      LEFT JOIN task_completions tc ON ta.id = tc.task_assignment_id
      WHERE ta.household_id = $1 AND ta.date >= $2 AND ta.date <= $3
    `;

    const params: string[] = [householdId, startDate, endDate];
    let paramIndex = 4;

    if (filters.childId) {
      query += ` AND ta.child_id = $${paramIndex++}`;
      params.push(filters.childId);
    }

    if (filters.status) {
      query += ` AND ta.status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters.taskId) {
      query += ` AND ta.task_id = $${paramIndex++}`;
      params.push(filters.taskId);
    }

    query += ' ORDER BY ta.date ASC, c.name ASC, t.name ASC';

    const result = await this.db.query<{
      id: string;
      household_id: string;
      task_id: string;
      child_id: string | null;
      date: string;
      status: TaskAssignmentStatus;
      created_at: Date;
      task_name: string;
      task_description: string | null;
      task_points: number;
      child_name: string | null;
      completed_at: Date | null;
    }>(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      householdId: row.household_id,
      taskId: row.task_id,
      childId: row.child_id,
      date: row.date,
      status: row.status,
      createdAt: toDateTimeString(row.created_at),
      taskName: row.task_name,
      taskDescription: row.task_description,
      taskPoints: row.task_points,
      childName: row.child_name,
      completedAt: row.completed_at ? toDateTimeString(row.completed_at) : null,
    }));
  }

  /**
   * Find pending assignments for a child
   */
  async findPending(childId: string): Promise<Assignment[]> {
    const result = await this.db.query<TaskAssignmentRow & { created_at: Date }>(
      `SELECT id, household_id, task_id, child_id, date::text as date, status, created_at
       FROM task_assignments
       WHERE child_id = $1 AND status = 'pending'
       ORDER BY date ASC`,
      [childId],
    );

    return result.rows.map(mapRowToAssignment);
  }

  /**
   * Create a new assignment
   */
  async create(data: CreateAssignmentDto): Promise<Assignment> {
    const result = await this.db.query<TaskAssignmentRow & { created_at: Date }>(
      `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, household_id, task_id, child_id, date::text as date, status, created_at`,
      [data.householdId, data.taskId, data.childId, data.date, data.status || 'pending'],
    );

    return mapRowToAssignment(result.rows[0]);
  }

  /**
   * Create multiple assignments in batch
   */
  async batchCreate(assignments: CreateAssignmentDto[]): Promise<Assignment[]> {
    if (assignments.length === 0) return [];

    const values: string[] = [];
    const params: (string | null)[] = [];
    let paramIndex = 1;

    for (const assignment of assignments) {
      values.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`,
      );
      params.push(
        assignment.householdId,
        assignment.taskId,
        assignment.childId,
        assignment.date,
        assignment.status || 'pending',
      );
    }

    const result = await this.db.query<TaskAssignmentRow & { created_at: Date }>(
      `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
       VALUES ${values.join(', ')}
       ON CONFLICT (task_id, child_id, date) WHERE child_id IS NOT NULL DO NOTHING
       RETURNING id, household_id, task_id, child_id, date::text as date, status, created_at`,
      params,
    );

    return result.rows.map(mapRowToAssignment);
  }

  /**
   * Update assignment status
   */
  async updateStatus(assignmentId: string, status: TaskAssignmentStatus): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE task_assignments SET status = $2 WHERE id = $1 RETURNING id`,
      [assignmentId, status],
    );

    return result.rows.length > 0;
  }

  /**
   * Update assignment status if pending (atomic check-and-update)
   */
  async completeIfPending(assignmentId: string): Promise<Assignment | null> {
    const result = await this.db.query<TaskAssignmentRow & { created_at: Date }>(
      `UPDATE task_assignments
       SET status = 'completed'
       WHERE id = $1 AND status = 'pending'
       RETURNING id, household_id, task_id, child_id, date::text as date, status, created_at`,
      [assignmentId],
    );

    if (result.rows.length === 0) return null;
    return mapRowToAssignment(result.rows[0]);
  }

  /**
   * Reassign an assignment to a different child
   */
  async reassign(assignmentId: string, childId: string): Promise<Assignment | null> {
    const result = await this.db.query<TaskAssignmentRow & { created_at: Date }>(
      `UPDATE task_assignments
       SET child_id = $2
       WHERE id = $1 AND status = 'pending'
       RETURNING id, household_id, task_id, child_id, date::text as date, status, created_at`,
      [assignmentId, childId],
    );

    if (result.rows.length === 0) return null;
    return mapRowToAssignment(result.rows[0]);
  }

  /**
   * Delete an assignment
   */
  async delete(assignmentId: string): Promise<boolean> {
    const result = await this.db.query('DELETE FROM task_assignments WHERE id = $1 RETURNING id', [
      assignmentId,
    ]);

    return result.rows.length > 0;
  }

  /**
   * Get household ID for an assignment
   */
  async getHouseholdId(assignmentId: string): Promise<string | null> {
    const result = await this.db.query<{ household_id: string }>(
      'SELECT household_id FROM task_assignments WHERE id = $1',
      [assignmentId],
    );

    if (result.rows.length === 0) return null;
    return result.rows[0].household_id;
  }

  /**
   * Check if assignment exists for task, child, and date
   */
  async exists(taskId: string, childId: string | null, date: string): Promise<boolean> {
    const result = await this.db.query(
      childId
        ? 'SELECT 1 FROM task_assignments WHERE task_id = $1 AND child_id = $2 AND date = $3'
        : 'SELECT 1 FROM task_assignments WHERE task_id = $1 AND child_id IS NULL AND date = $2',
      childId ? [taskId, childId, date] : [taskId, date],
    );

    return result.rows.length > 0;
  }

  // ============================================================================
  // Task Completions
  // ============================================================================

  /**
   * Create a task completion record
   */
  async createCompletion(data: CreateCompletionDto): Promise<TaskCompletion> {
    const result = await this.db.query<TaskCompletionRow>(
      `INSERT INTO task_completions (household_id, task_assignment_id, child_id, completed_at, points_earned)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, household_id, task_assignment_id, child_id, completed_at, points_earned`,
      [data.householdId, data.taskAssignmentId, data.childId, data.completedAt, data.pointsEarned],
    );

    const row = result.rows[0];
    return {
      id: row.id,
      householdId: row.household_id,
      taskAssignmentId: row.task_assignment_id,
      childId: row.child_id,
      completedAt: toDateTimeString(row.completed_at),
      pointsEarned: row.points_earned,
    };
  }

  /**
   * Find completion by assignment ID
   */
  async findCompletionByAssignment(assignmentId: string): Promise<TaskCompletion | null> {
    const result = await this.db.query<TaskCompletionRow>(
      `SELECT id, household_id, task_assignment_id, child_id, completed_at, points_earned
       FROM task_completions WHERE task_assignment_id = $1`,
      [assignmentId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      householdId: row.household_id,
      taskAssignmentId: row.task_assignment_id,
      childId: row.child_id,
      completedAt: toDateTimeString(row.completed_at),
      pointsEarned: row.points_earned,
    };
  }

  /**
   * Get assignment with task points (for completion)
   */
  async getAssignmentWithPoints(assignmentId: string): Promise<{
    id: string;
    householdId: string;
    childId: string | null;
    taskId: string;
    status: TaskAssignmentStatus;
    points: number;
  } | null> {
    const result = await this.db.query<{
      id: string;
      household_id: string;
      child_id: string | null;
      task_id: string;
      status: TaskAssignmentStatus;
      points: number;
    }>(
      `SELECT ta.id, ta.household_id, ta.child_id, ta.task_id, ta.status, t.points
       FROM task_assignments ta
       JOIN tasks t ON ta.task_id = t.id
       WHERE ta.id = $1`,
      [assignmentId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      householdId: row.household_id,
      childId: row.child_id,
      taskId: row.task_id,
      status: row.status,
      points: row.points,
    };
  }
}

/**
 * Factory function for creating AssignmentRepository instances
 */
export function createAssignmentRepository(db: Pool | PoolClient): AssignmentRepository {
  return new AssignmentRepository(db);
}
