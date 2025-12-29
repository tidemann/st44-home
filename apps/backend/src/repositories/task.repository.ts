import type { Pool, PoolClient } from 'pg';
import type { TaskRow, TaskRuleConfig } from '../types/database.js';

/**
 * TaskRepository - Data access layer for tasks table
 *
 * Encapsulates all SQL queries for task operations.
 * Services should use this repository instead of direct database access.
 */

export type TaskRuleType = 'weekly_rotation' | 'repeating' | 'daily';

export interface Task {
  id: string;
  householdId: string;
  name: string;
  description: string | null;
  points: number;
  ruleType: TaskRuleType;
  ruleConfig: TaskRuleConfig | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  householdId: string;
  name: string;
  description?: string | null;
  points?: number;
  ruleType: TaskRuleType;
  ruleConfig?: TaskRuleConfig | null;
}

export interface UpdateTaskDto {
  name?: string;
  description?: string | null;
  points?: number;
  ruleType?: TaskRuleType;
  ruleConfig?: TaskRuleConfig | null;
  active?: boolean;
}

export interface TaskListOptions {
  active?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'points' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface TaskListResult {
  tasks: Task[];
  total: number;
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
 * Parse rule config from database (handles JSON string or object)
 */
function parseRuleConfig(value: unknown): TaskRuleConfig | null {
  if (value === null || value === undefined) return null;

  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (typeof parsed !== 'object' || parsed === null) return null;

  const obj = parsed as Record<string, unknown>;
  const result: TaskRuleConfig = {};

  // Handle both camelCase and snake_case
  const rotationType = obj.rotationType ?? obj.rotation_type;
  const repeatDays = obj.repeatDays ?? obj.repeat_days;
  const assignedChildren = obj.assignedChildren ?? obj.assigned_children;

  if (rotationType === 'odd_even_week' || rotationType === 'alternating') {
    result.rotation_type = rotationType;
  }

  if (Array.isArray(repeatDays)) {
    result.repeat_days = repeatDays as number[];
  }

  if (Array.isArray(assignedChildren)) {
    result.assigned_children = assignedChildren as string[];
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Map database row to Task domain object
 */
function mapRowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    description: row.description,
    points: row.points,
    ruleType: row.rule_type,
    ruleConfig: parseRuleConfig(row.rule_config),
    active: row.active,
    createdAt: toDateTimeString(row.created_at),
    updatedAt: toDateTimeString(row.updated_at),
  };
}

export class TaskRepository {
  constructor(private db: DbExecutor) {}

  /**
   * Create a new instance with a different executor (for transactions)
   */
  withClient(client: PoolClient): TaskRepository {
    return new TaskRepository(client);
  }

  /**
   * Find a task by ID
   */
  async findById(taskId: string): Promise<Task | null> {
    const result = await this.db.query<TaskRow>(
      `SELECT id, household_id, name, description, points, rule_type, rule_config, active, created_at, updated_at
       FROM tasks WHERE id = $1`,
      [taskId],
    );

    if (result.rows.length === 0) return null;
    return mapRowToTask(result.rows[0]);
  }

  /**
   * Find a task by ID and household (ownership check)
   */
  async findByIdAndHousehold(taskId: string, householdId: string): Promise<Task | null> {
    const result = await this.db.query<TaskRow>(
      `SELECT id, household_id, name, description, points, rule_type, rule_config, active, created_at, updated_at
       FROM tasks WHERE id = $1 AND household_id = $2`,
      [taskId, householdId],
    );

    if (result.rows.length === 0) return null;
    return mapRowToTask(result.rows[0]);
  }

  /**
   * Find all tasks for a household
   */
  async findByHousehold(householdId: string): Promise<Task[]> {
    const result = await this.db.query<TaskRow>(
      `SELECT id, household_id, name, description, points, rule_type, rule_config, active, created_at, updated_at
       FROM tasks WHERE household_id = $1
       ORDER BY created_at DESC`,
      [householdId],
    );

    return result.rows.map(mapRowToTask);
  }

  /**
   * Find active tasks for a household
   */
  async findActiveByHousehold(householdId: string): Promise<Task[]> {
    const result = await this.db.query<TaskRow>(
      `SELECT id, household_id, name, description, points, rule_type, rule_config, active, created_at, updated_at
       FROM tasks WHERE household_id = $1 AND active = true
       ORDER BY created_at DESC`,
      [householdId],
    );

    return result.rows.map(mapRowToTask);
  }

  /**
   * Create a new task
   */
  async create(data: CreateTaskDto): Promise<Task> {
    const ruleConfigJson =
      data.ruleConfig === null || data.ruleConfig === undefined
        ? null
        : JSON.stringify(data.ruleConfig);

    const result = await this.db.query<TaskRow>(
      `INSERT INTO tasks (household_id, name, description, points, rule_type, rule_config)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, household_id, name, description, points, rule_type, rule_config, active, created_at, updated_at`,
      [
        data.householdId,
        data.name.trim(),
        data.description ?? null,
        data.points ?? 10,
        data.ruleType,
        ruleConfigJson,
      ],
    );

    return mapRowToTask(result.rows[0]);
  }

  /**
   * Update a task
   */
  async update(taskId: string, householdId: string, data: UpdateTaskDto): Promise<Task | null> {
    const updates: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name.trim());
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description ?? null);
    }
    if (data.points !== undefined) {
      updates.push(`points = $${paramIndex++}`);
      values.push(data.points);
    }
    if (data.ruleType !== undefined) {
      updates.push(`rule_type = $${paramIndex++}`);
      values.push(data.ruleType);
    }
    if (data.ruleConfig !== undefined) {
      updates.push(`rule_config = $${paramIndex++}`);
      values.push(data.ruleConfig === null ? null : JSON.stringify(data.ruleConfig));
    }
    if (data.active !== undefined) {
      updates.push(`active = $${paramIndex++}`);
      values.push(data.active);
    }

    if (updates.length === 0) {
      return this.findByIdAndHousehold(taskId, householdId);
    }

    updates.push('updated_at = NOW()');
    values.push(taskId, householdId);

    const result = await this.db.query<TaskRow>(
      `UPDATE tasks
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND household_id = $${paramIndex}
       RETURNING id, household_id, name, description, points, rule_type, rule_config, active, created_at, updated_at`,
      values,
    );

    if (result.rows.length === 0) return null;
    return mapRowToTask(result.rows[0]);
  }

  /**
   * Soft delete a task (set active = false)
   */
  async deactivate(taskId: string, householdId: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE tasks SET active = false, updated_at = NOW()
       WHERE id = $1 AND household_id = $2
       RETURNING id`,
      [taskId, householdId],
    );

    return result.rows.length > 0;
  }

  /**
   * List tasks with filtering, sorting, and pagination
   */
  async list(householdId: string, options: TaskListOptions = {}): Promise<TaskListResult> {
    const { active, page = 1, pageSize = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;

    // Build base query
    let whereClause = 'household_id = $1';
    const countParams: (string | boolean)[] = [householdId];
    const dataParams: (string | boolean | number)[] = [householdId];

    if (active !== undefined) {
      whereClause += ' AND active = $2';
      countParams.push(active);
      dataParams.push(active);
    }

    // Get total count
    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM tasks WHERE ${whereClause}`,
      countParams,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Map sort fields
    const sortFieldMap: Record<string, string> = {
      name: 'name',
      points: 'points',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    };
    const sortField = sortFieldMap[sortBy] || 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Calculate pagination
    const offset = (page - 1) * pageSize;
    const limitParamIndex = dataParams.length + 1;
    const offsetParamIndex = dataParams.length + 2;
    dataParams.push(pageSize, offset);

    const dataResult = await this.db.query<TaskRow>(
      `SELECT id, household_id, name, description, points, rule_type, rule_config, active, created_at, updated_at
       FROM tasks WHERE ${whereClause}
       ORDER BY ${sortField} ${order}
       LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
      dataParams,
    );

    return {
      tasks: dataResult.rows.map(mapRowToTask),
      total,
    };
  }

  /**
   * Count children that belong to a household
   * Used for validation in services
   */
  async countChildrenInHousehold(childIds: string[], householdId: string): Promise<number> {
    if (childIds.length === 0) return 0;

    const result = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM children WHERE id = ANY($1) AND household_id = $2',
      [childIds, householdId],
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get household ID for a task
   */
  async getHouseholdId(taskId: string): Promise<string | null> {
    const result = await this.db.query<{ household_id: string }>(
      'SELECT household_id FROM tasks WHERE id = $1',
      [taskId],
    );

    if (result.rows.length === 0) return null;
    return result.rows[0].household_id;
  }
}

/**
 * Factory function for creating TaskRepository instances
 */
export function createTaskRepository(db: Pool | PoolClient): TaskRepository {
  return new TaskRepository(db);
}
