import { Pool, PoolClient } from 'pg';

/**
 * TaskService - Centralized task management business logic
 *
 * This service centralizes task-related business logic that was previously
 * scattered across route handlers. It provides consistent, reusable methods for:
 * - Task validation based on rule type
 * - Task CRUD operations
 * - Child validation for task assignments
 */

export type RuleType = 'weekly_rotation' | 'repeating' | 'daily' | 'single';

export interface RuleConfig {
  rotationType?: 'odd_even_week' | 'alternating';
  repeatDays?: number[];
  assignedChildren?: string[];
}

export interface TaskData {
  name: string;
  description?: string | null;
  points?: number;
  ruleType: RuleType;
  ruleConfig?: RuleConfig | null;
  deadline?: string | null;
}

export interface Task {
  id: string;
  householdId: string;
  name: string;
  description: string | null;
  points: number;
  ruleType: RuleType;
  ruleConfig: RuleConfig | null;
  deadline: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTaskData {
  name?: string;
  description?: string | null;
  points?: number;
  ruleType?: RuleType;
  ruleConfig?: RuleConfig | null;
  deadline?: string | null;
  active?: boolean;
}

export interface TaskValidationError {
  field: string;
  message: string;
}

/**
 * Normalize rule config from various input formats
 * Handles both camelCase and snake_case, and JSON string parsing
 */
function normalizeRuleConfig(ruleConfig: unknown): RuleConfig | null {
  if (ruleConfig === undefined || ruleConfig === null) return null;

  let value: unknown = ruleConfig;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (typeof value !== 'object' || value === null) return null;

  const obj = value as Record<string, unknown>;
  const rotationType = (obj.rotationType ?? obj['rotation_type']) as unknown;
  const repeatDays = (obj.repeatDays ?? obj['repeat_days']) as unknown;
  const assignedChildren = (obj.assignedChildren ?? obj['assigned_children']) as unknown;

  const normalized: RuleConfig = {};
  if (typeof rotationType === 'string') {
    normalized.rotationType = rotationType as 'odd_even_week' | 'alternating';
  }
  if (Array.isArray(repeatDays)) {
    normalized.repeatDays = repeatDays as number[];
  }
  if (Array.isArray(assignedChildren)) {
    normalized.assignedChildren = assignedChildren as string[];
  }

  return normalized;
}

/**
 * Convert date to ISO string
 */
function toDateTimeString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date(String(value)).toISOString();
}

/**
 * Map database row to Task object
 */
function mapRowToTask(row: Record<string, unknown>): Task {
  const normalizedRuleConfig = normalizeRuleConfig(row.rule_config);

  return {
    id: row.id as string,
    householdId: row.household_id as string,
    name: row.name as string,
    description: row.description as string | null,
    points: row.points as number,
    ruleType: row.rule_type as RuleType,
    ruleConfig: normalizedRuleConfig,
    deadline: row.deadline ? toDateTimeString(row.deadline) : null,
    active: row.active !== false,
    createdAt: toDateTimeString(row.created_at),
    updatedAt: toDateTimeString(row.updated_at),
  };
}

export class TaskService {
  constructor(private db: Pool) {}

  /**
   * Validate task data based on rule type
   *
   * This extracts the business validation logic from route handlers.
   * Zod handles basic type validation; this handles rule-specific business logic.
   *
   * @param data - Task data to validate
   * @returns Array of validation errors (empty if valid)
   */
  validateTaskRules(data: TaskData): TaskValidationError[] {
    const errors: TaskValidationError[] = [];
    const config = data.ruleConfig || {};

    if (data.ruleType === 'weekly_rotation') {
      // Rotation type required
      if (!config.rotationType) {
        errors.push({
          field: 'ruleConfig.rotationType',
          message: 'rotationType required for weekly_rotation (odd_even_week or alternating)',
        });
      } else if (!['odd_even_week', 'alternating'].includes(config.rotationType)) {
        errors.push({
          field: 'ruleConfig.rotationType',
          message: 'rotationType must be odd_even_week or alternating',
        });
      }

      // Assigned children optional but recommended
      // NOTE: Will need at least 2 children for rotation to work properly
    }

    if (data.ruleType === 'repeating') {
      // Repeat days required
      if (!config.repeatDays || config.repeatDays.length < 1) {
        errors.push({
          field: 'ruleConfig.repeatDays',
          message: 'repeatDays required for repeating tasks (array of 0-6)',
        });
      } else {
        // Validate day values are 0-6
        const invalidDays = config.repeatDays.filter((d) => d < 0 || d > 6);
        if (invalidDays.length > 0) {
          errors.push({
            field: 'ruleConfig.repeatDays',
            message: 'repeatDays values must be between 0 (Sunday) and 6 (Saturday)',
          });
        }
      }
    }

    // Daily tasks have no specific validation requirements

    if (data.ruleType === 'single') {
      // Assigned children required (at least one candidate)
      if (!config.assignedChildren || config.assignedChildren.length < 1) {
        errors.push({
          field: 'ruleConfig.assignedChildren',
          message: 'At least one candidate child is required for single tasks',
        });
      }

      // Deadline must be in the future if provided
      if (data.deadline) {
        const deadlineDate = new Date(data.deadline);
        const now = new Date();
        if (deadlineDate <= now) {
          errors.push({
            field: 'deadline',
            message: 'Deadline must be in the future',
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate that all child IDs belong to the household
   *
   * @param childIds - Array of child UUIDs to validate
   * @param householdId - Household UUID to check against
   * @returns true if all children belong to household, false otherwise
   */
  async validateChildrenBelongToHousehold(
    childIds: string[],
    householdId: string,
  ): Promise<boolean> {
    if (childIds.length === 0) return true;

    const result = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM children WHERE id = ANY($1) AND household_id = $2',
      [childIds, householdId],
    );

    const count = parseInt(result.rows[0].count, 10);
    return count === childIds.length;
  }

  /**
   * Create a new task
   *
   * @param householdId - UUID of the household
   * @param data - Task data
   * @returns Created task
   * @throws Error if validation fails or children don't belong to household
   */
  async createTask(householdId: string, data: TaskData): Promise<Task> {
    // Validate business rules
    const validationErrors = this.validateTaskRules(data);
    if (validationErrors.length > 0) {
      const error = new Error('Validation failed') as Error & {
        validationErrors: TaskValidationError[];
      };
      error.validationErrors = validationErrors;
      throw error;
    }

    // Validate assigned children belong to household
    const assignedChildren = data.ruleConfig?.assignedChildren || [];
    if (assignedChildren.length > 0) {
      const childrenValid = await this.validateChildrenBelongToHousehold(
        assignedChildren,
        householdId,
      );
      if (!childrenValid) {
        throw new Error('One or more assigned children do not belong to this household');
      }
    }

    // Insert task
    const ruleConfigJson =
      data.ruleConfig === null || data.ruleConfig === undefined
        ? null
        : JSON.stringify(data.ruleConfig);

    const result = await this.db.query(
      `INSERT INTO tasks (household_id, name, description, points, rule_type, rule_config)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, household_id, name, description, points, rule_type, rule_config, active, created_at, updated_at`,
      [
        householdId,
        data.name.trim(),
        data.description || null,
        data.points ?? 10,
        data.ruleType,
        ruleConfigJson,
      ],
    );

    return mapRowToTask(result.rows[0]);
  }

  /**
   * Update an existing task
   *
   * @param taskId - UUID of the task
   * @param householdId - UUID of the household (for validation)
   * @param data - Update data
   * @returns Updated task or null if not found
   * @throws Error if validation fails
   */
  async updateTask(
    taskId: string,
    householdId: string,
    data: UpdateTaskData,
  ): Promise<Task | null> {
    // If rule type is changing, validate new configuration
    if (data.ruleType) {
      const validationErrors = this.validateTaskRules({
        name: data.name || '',
        ruleType: data.ruleType,
        ruleConfig: data.ruleConfig,
      });
      if (validationErrors.length > 0) {
        const error = new Error('Validation failed') as Error & {
          validationErrors: TaskValidationError[];
        };
        error.validationErrors = validationErrors;
        throw error;
      }
    }

    // Validate assigned children if provided
    const assignedChildren = data.ruleConfig?.assignedChildren || [];
    if (assignedChildren.length > 0) {
      const childrenValid = await this.validateChildrenBelongToHousehold(
        assignedChildren,
        householdId,
      );
      if (!childrenValid) {
        throw new Error('One or more assigned children do not belong to this household');
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name.trim());
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description || null);
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
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = NOW()`);

    // Add WHERE clause parameters
    values.push(taskId, householdId);

    const query = `
      UPDATE tasks
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND household_id = $${paramIndex++}
      RETURNING id, household_id, name, description, points, rule_type, rule_config, active, created_at, updated_at
    `;

    const result = await this.db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return mapRowToTask(result.rows[0]);
  }

  /**
   * Deactivate a task (soft delete)
   *
   * @param taskId - UUID of the task
   * @param householdId - UUID of the household (for validation)
   * @returns true if task was deactivated, false if not found
   */
  async deactivateTask(taskId: string, householdId: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE tasks
       SET active = false, updated_at = NOW()
       WHERE id = $1 AND household_id = $2
       RETURNING id`,
      [taskId, householdId],
    );

    return result.rows.length > 0;
  }

  /**
   * Get a task by ID
   *
   * @param taskId - UUID of the task
   * @param householdId - UUID of the household (for validation)
   * @returns Task or null if not found
   */
  async getTask(taskId: string, householdId: string): Promise<Task | null> {
    const result = await this.db.query(
      `SELECT id, household_id, name, description, points, rule_type, rule_config, active, created_at, updated_at
       FROM tasks WHERE id = $1 AND household_id = $2`,
      [taskId, householdId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return mapRowToTask(result.rows[0]);
  }

  /**
   * Get a task by ID (without household validation)
   *
   * @param taskId - UUID of the task
   * @returns Task or null if not found
   */
  async getTaskById(taskId: string): Promise<Task | null> {
    const result = await this.db.query(
      `SELECT id, household_id, name, description, points, rule_type, rule_config, active, created_at, updated_at
       FROM tasks WHERE id = $1`,
      [taskId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return mapRowToTask(result.rows[0]);
  }

  /**
   * List tasks for a household with optional filtering and pagination
   *
   * @param householdId - UUID of the household
   * @param options - Filtering and pagination options
   * @returns Array of tasks and total count
   */
  async listTasks(
    householdId: string,
    options?: {
      active?: boolean;
      page?: number;
      pageSize?: number;
      sortBy?: 'name' | 'points' | 'createdAt' | 'updatedAt';
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{ tasks: Task[]; total: number }> {
    const {
      active,
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options || {};

    // Build query
    let countQuery = 'SELECT COUNT(*) as count FROM tasks WHERE household_id = $1';
    let dataQuery =
      'SELECT id, household_id, name, description, points, rule_type, rule_config, active, created_at, updated_at FROM tasks WHERE household_id = $1';
    const params: (string | boolean)[] = [householdId];

    if (active !== undefined) {
      countQuery += ' AND active = $2';
      dataQuery += ' AND active = $2';
      params.push(active);
    }

    // Get total count
    const countResult = await this.db.query<{ count: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Map sort field
    const sortFieldMap: Record<string, string> = {
      name: 'name',
      points: 'points',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    };
    const sortField = sortFieldMap[sortBy] || 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Add sorting and pagination
    dataQuery += ` ORDER BY ${sortField} ${order}`;
    const offset = (page - 1) * pageSize;
    dataQuery += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const dataResult = await this.db.query(dataQuery, [...params, pageSize, offset]);

    return {
      tasks: dataResult.rows.map(mapRowToTask),
      total,
    };
  }
}

/**
 * Singleton instance and factory function
 */
let taskServiceInstance: TaskService | undefined;

export function getTaskService(db: Pool): TaskService {
  if (!taskServiceInstance) {
    taskServiceInstance = new TaskService(db);
  }
  return taskServiceInstance;
}

/**
 * Type guard to check if an error has validation errors
 */
export function hasValidationErrors(
  error: unknown,
): error is Error & { validationErrors: TaskValidationError[] } {
  return (
    error instanceof Error &&
    'validationErrors' in error &&
    Array.isArray((error as { validationErrors: unknown }).validationErrors)
  );
}
