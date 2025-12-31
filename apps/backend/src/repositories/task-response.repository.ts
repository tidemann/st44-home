import type { Pool, PoolClient } from 'pg';
import type { TaskCandidateRow, TaskResponseRow, TaskResponseType } from '../types/database.js';

/**
 * TaskResponseRepository - Data access layer for task_candidates and task_responses tables
 *
 * Manages single task candidate assignments and accept/decline responses.
 * Services should use this repository instead of direct database access.
 */

export interface TaskCandidate {
  id: string;
  taskId: string;
  childId: string;
  householdId: string;
  createdAt: string;
}

export interface TaskResponse {
  id: string;
  taskId: string;
  childId: string;
  householdId: string;
  response: TaskResponseType;
  respondedAt: string;
}

export interface AvailableTask {
  id: string;
  householdId: string;
  name: string;
  description: string | null;
  points: number;
  deadline: Date | null;
  candidateCount: number;
  declineCount: number;
  hasDeadline: boolean;
  daysUntilDeadline: number | null;
}

export interface FailedTask {
  id: string;
  name: string;
  description: string | null;
  points: number;
  deadline: Date | null;
  candidateCount: number;
  declineCount: number;
}

export interface CandidateStatus {
  childId: string;
  childName: string;
  response: TaskResponseType | null;
  respondedAt: string | null;
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
 * Map database row to TaskCandidate domain object
 */
function mapRowToCandidate(row: TaskCandidateRow): TaskCandidate {
  return {
    id: row.id,
    taskId: row.task_id,
    childId: row.child_id,
    householdId: row.household_id,
    createdAt: toDateTimeString(row.created_at),
  };
}

/**
 * Map database row to TaskResponse domain object
 */
function mapRowToResponse(row: TaskResponseRow): TaskResponse {
  return {
    id: row.id,
    taskId: row.task_id,
    childId: row.child_id,
    householdId: row.household_id,
    response: row.response,
    respondedAt: toDateTimeString(row.responded_at),
  };
}

export class TaskResponseRepository {
  constructor(private db: DbExecutor) {}

  /**
   * Create a new instance with a different executor (for transactions)
   */
  withClient(client: PoolClient): TaskResponseRepository {
    return new TaskResponseRepository(client);
  }

  /**
   * Add candidate children to a single task
   */
  async addCandidates(
    taskId: string,
    childIds: string[],
    householdId: string,
  ): Promise<TaskCandidate[]> {
    if (childIds.length === 0) return [];

    // Build VALUES clause for bulk insert
    const values: string[] = [];
    const params: (string | number)[] = [taskId, householdId];
    let paramIndex = 3;

    for (const childId of childIds) {
      values.push(`($1, $${paramIndex}, $2)`);
      params.push(childId);
      paramIndex++;
    }

    const result = await this.db.query<TaskCandidateRow>(
      `INSERT INTO task_candidates (task_id, child_id, household_id)
       VALUES ${values.join(', ')}
       ON CONFLICT (task_id, child_id) DO NOTHING
       RETURNING id, task_id, child_id, household_id, created_at`,
      params,
    );

    return result.rows.map(mapRowToCandidate);
  }

  /**
   * Record a response (accept or decline) for a task
   */
  async recordResponse(
    taskId: string,
    childId: string,
    householdId: string,
    response: TaskResponseType,
  ): Promise<TaskResponse> {
    const result = await this.db.query<TaskResponseRow>(
      `INSERT INTO task_responses (task_id, child_id, household_id, response)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (task_id, child_id)
       DO UPDATE SET response = $4, responded_at = CURRENT_TIMESTAMP
       RETURNING id, task_id, child_id, household_id, response, responded_at`,
      [taskId, childId, householdId, response],
    );

    return mapRowToResponse(result.rows[0]);
  }

  /**
   * Undo a response (delete the response record)
   */
  async undoResponse(taskId: string, childId: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM task_responses
       WHERE task_id = $1 AND child_id = $2`,
      [taskId, childId],
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Get all candidates for a task with their response status
   */
  async getTaskCandidates(taskId: string): Promise<CandidateStatus[]> {
    const result = await this.db.query<{
      child_id: string;
      child_name: string;
      response: TaskResponseType | null;
      responded_at: Date | null;
    }>(
      `SELECT
         tc.child_id,
         c.name as child_name,
         tr.response,
         tr.responded_at
       FROM task_candidates tc
       JOIN children c ON c.id = tc.child_id
       LEFT JOIN task_responses tr ON tr.task_id = tc.task_id AND tr.child_id = tc.child_id
       WHERE tc.task_id = $1
       ORDER BY c.name`,
      [taskId],
    );

    return result.rows.map((row) => ({
      childId: row.child_id,
      childName: row.child_name,
      response: row.response,
      respondedAt: row.responded_at ? toDateTimeString(row.responded_at) : null,
    }));
  }

  /**
   * Get available single tasks for a child
   * Returns tasks where:
   * - Child is a candidate
   * - Task has not been accepted by anyone
   * - Child has not declined (or has undone their decline)
   */
  async getAvailableTasksForChild(childId: string, householdId: string): Promise<AvailableTask[]> {
    const result = await this.db.query<{
      id: string;
      household_id: string;
      name: string;
      description: string | null;
      points: number;
      deadline: Date | null;
      candidate_count: string;
      decline_count: string;
    }>(
      `SELECT
         t.id,
         t.household_id,
         t.name,
         t.description,
         t.points,
         t.deadline,
         COUNT(DISTINCT tc.child_id) as candidate_count,
         COUNT(DISTINCT CASE WHEN tr.response = 'declined' THEN tr.child_id END) as decline_count
       FROM tasks t
       JOIN task_candidates tc ON tc.task_id = t.id
       LEFT JOIN task_responses tr ON tr.task_id = t.id
       WHERE t.household_id = $1
         AND t.rule_type = 'single'
         AND t.active = true
         AND tc.child_id = $2
         AND NOT EXISTS (
           SELECT 1 FROM task_assignments ta
           WHERE ta.task_id = t.id AND ta.status IN ('pending', 'completed')
         )
         AND NOT EXISTS (
           SELECT 1 FROM task_responses tr2
           WHERE tr2.task_id = t.id AND tr2.child_id = $2 AND tr2.response = 'declined'
         )
       GROUP BY t.id, t.household_id, t.name, t.description, t.points, t.deadline
       ORDER BY t.deadline NULLS LAST, t.created_at DESC`,
      [householdId, childId],
    );

    return result.rows.map((row) => {
      const deadline = row.deadline;
      const hasDeadline = deadline !== null;
      let daysUntilDeadline: number | null = null;

      if (hasDeadline && deadline) {
        const now = new Date();
        const diffMs = deadline.getTime() - now.getTime();
        daysUntilDeadline = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }

      return {
        id: row.id,
        householdId: row.household_id,
        name: row.name,
        description: row.description,
        points: row.points,
        deadline,
        candidateCount: parseInt(row.candidate_count, 10),
        declineCount: parseInt(row.decline_count, 10),
        hasDeadline,
        daysUntilDeadline,
      };
    });
  }

  /**
   * Get tasks where all candidates have declined
   */
  async getFailedTasks(householdId: string): Promise<FailedTask[]> {
    const result = await this.db.query<{
      id: string;
      name: string;
      description: string | null;
      points: number;
      deadline: Date | null;
      candidate_count: string;
      decline_count: string;
    }>(
      `SELECT
         t.id,
         t.name,
         t.description,
         t.points,
         t.deadline,
         COUNT(DISTINCT tc.child_id) as candidate_count,
         COUNT(DISTINCT CASE WHEN tr.response = 'declined' THEN tr.child_id END) as decline_count
       FROM tasks t
       JOIN task_candidates tc ON tc.task_id = t.id
       LEFT JOIN task_responses tr ON tr.task_id = t.id AND tr.child_id = tc.child_id
       WHERE t.household_id = $1
         AND t.rule_type = 'single'
         AND t.active = true
         AND NOT EXISTS (
           SELECT 1 FROM task_assignments ta
           WHERE ta.task_id = t.id AND ta.status IN ('pending', 'completed')
         )
       GROUP BY t.id, t.name, t.description, t.points, t.deadline
       HAVING COUNT(DISTINCT tc.child_id) = COUNT(DISTINCT CASE WHEN tr.response = 'declined' THEN tr.child_id END)
         AND COUNT(DISTINCT tc.child_id) > 0
       ORDER BY t.deadline NULLS LAST, t.created_at DESC`,
      [householdId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      points: row.points,
      deadline: row.deadline,
      candidateCount: parseInt(row.candidate_count, 10),
      declineCount: parseInt(row.decline_count, 10),
    }));
  }

  /**
   * Get tasks past deadline with no acceptance
   */
  async getExpiredTasks(householdId: string): Promise<FailedTask[]> {
    const result = await this.db.query<{
      id: string;
      name: string;
      description: string | null;
      points: number;
      deadline: Date | null;
      candidate_count: string;
      decline_count: string;
    }>(
      `SELECT
         t.id,
         t.name,
         t.description,
         t.points,
         t.deadline,
         COUNT(DISTINCT tc.child_id) as candidate_count,
         COUNT(DISTINCT CASE WHEN tr.response = 'declined' THEN tr.child_id END) as decline_count
       FROM tasks t
       JOIN task_candidates tc ON tc.task_id = t.id
       LEFT JOIN task_responses tr ON tr.task_id = t.id AND tr.child_id = tc.child_id
       WHERE t.household_id = $1
         AND t.rule_type = 'single'
         AND t.active = true
         AND t.deadline IS NOT NULL
         AND t.deadline < CURRENT_TIMESTAMP
         AND NOT EXISTS (
           SELECT 1 FROM task_assignments ta
           WHERE ta.task_id = t.id AND ta.status IN ('pending', 'completed')
         )
       GROUP BY t.id, t.name, t.description, t.points, t.deadline
       ORDER BY t.deadline DESC`,
      [householdId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      points: row.points,
      deadline: row.deadline,
      candidateCount: parseInt(row.candidate_count, 10),
      declineCount: parseInt(row.decline_count, 10),
    }));
  }

  /**
   * Check if a task has been accepted by any child
   */
  async hasTaskBeenAccepted(taskId: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM task_assignments
         WHERE task_id = $1 AND status IN ('pending', 'completed')
       ) as exists`,
      [taskId],
    );

    return result.rows[0]?.exists ?? false;
  }

  /**
   * Check if all candidates have declined a task
   */
  async haveAllCandidatesDeclined(taskId: string): Promise<boolean> {
    const result = await this.db.query<{ all_declined: boolean }>(
      `SELECT
         COUNT(DISTINCT tc.child_id) = COUNT(DISTINCT CASE WHEN tr.response = 'declined' THEN tr.child_id END)
         AND COUNT(DISTINCT tc.child_id) > 0 as all_declined
       FROM task_candidates tc
       LEFT JOIN task_responses tr ON tr.task_id = tc.task_id AND tr.child_id = tc.child_id
       WHERE tc.task_id = $1`,
      [taskId],
    );

    return result.rows[0]?.all_declined ?? false;
  }

  /**
   * Get a child's response to a specific task
   */
  async getResponse(taskId: string, childId: string): Promise<TaskResponse | null> {
    const result = await this.db.query<TaskResponseRow>(
      `SELECT id, task_id, child_id, household_id, response, responded_at
       FROM task_responses
       WHERE task_id = $1 AND child_id = $2`,
      [taskId, childId],
    );

    if (result.rows.length === 0) return null;
    return mapRowToResponse(result.rows[0]);
  }

  /**
   * Check if a child is a candidate for a task
   */
  async isCandidate(taskId: string, childId: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM task_candidates
         WHERE task_id = $1 AND child_id = $2
       ) as exists`,
      [taskId, childId],
    );

    return result.rows[0]?.exists ?? false;
  }
}
