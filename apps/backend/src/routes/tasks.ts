import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  TaskSchema,
  CreateTaskRequestSchema,
  UpdateTaskRequestSchema,
  PaginationQuerySchema,
  PaginationMetaSchema,
  calculatePaginationMeta,
  calculateOffset,
  type Task,
  type PaginationQuery,
} from '@st44/types';
import { z, zodToOpenAPI, generateAPISchemas, CommonErrors } from '@st44/types/generators';
import { db } from '../database.js';
import { authenticateUser } from '../middleware/auth.js';
import {
  validateHouseholdMembership,
  requireHouseholdParent,
} from '../middleware/household-membership.js';
import { validateRequest, handleZodError } from '../utils/validation.js';
import { stripResponseValidation } from '../schemas/common.js';
import type { TaskRow } from '../types/database.js';

interface HouseholdParams {
  householdId: string;
}

interface TaskParams extends HouseholdParams {
  taskId: string;
}

interface CreateTaskRequest {
  Params: HouseholdParams;
  Body: {
    name: string;
    description?: string;
    points?: number;
    ruleType: 'weekly_rotation' | 'repeating' | 'daily';
    ruleConfig?: {
      rotationType?: 'odd_even_week' | 'alternating';
      repeatDays?: number[];
      assignedChildren?: string[];
    };
  };
}

interface UpdateTaskRequest {
  Params: TaskParams;
  Body: {
    name?: string;
    description?: string;
    points?: number;
    ruleType?: string;
    ruleConfig?: {
      rotationType?: string;
      repeatDays?: number[];
      assignedChildren?: string[];
    };
    active?: boolean;
  };
}

interface ListTasksRequest {
  Params: HouseholdParams;
  Querystring: {
    active?: string;
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

/**
 * Validates task data based on rule type
 * Returns array of error messages (empty if valid)
 * Zod handles basic validation (types, min/max), this handles business logic
 */
type NormalizedRuleConfig = {
  rotationType?: 'odd_even_week' | 'alternating';
  repeatDays?: number[];
  assignedChildren?: string[];
} | null;

function normalizeRuleConfig(ruleConfig: unknown): NormalizedRuleConfig | undefined {
  if (ruleConfig === undefined) return undefined;
  if (ruleConfig === null) return null;

  let value: unknown = ruleConfig;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  if (typeof value !== 'object' || value === null) return undefined;

  const obj = value as Record<string, unknown>;
  const rotationType = (obj.rotationType ?? obj['rotation_type']) as unknown;
  const repeatDays = (obj.repeatDays ?? obj['repeat_days']) as unknown;
  const assignedChildren = (obj.assignedChildren ?? obj['assigned_children']) as unknown;

  const normalized: Exclude<NormalizedRuleConfig, null> = {};
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

function toDateTimeString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date(String(value)).toISOString();
}

function mapTaskRowToTask(row: TaskRow): Task {
  const normalizedRuleConfig = normalizeRuleConfig(row.rule_config);

  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    description: row.description,
    points: row.points,
    ruleType: row.rule_type,
    ruleConfig: normalizedRuleConfig === undefined ? null : normalizedRuleConfig,
    active: row.active !== false,
    createdAt: toDateTimeString(row.created_at),
    updatedAt: toDateTimeString(row.updated_at),
  };
}

function validateTaskData(
  data: {
    name?: string;
    description?: string | null;
    points?: number;
    ruleType?: string;
    ruleConfig?: unknown;
  },
  isUpdate: boolean = false,
): string[] {
  const errors: string[] = [];

  // Basic Zod validation is already done, this is business logic validation

  // Rule-specific validation
  if (data.ruleType) {
    const config = normalizeRuleConfig(data.ruleConfig) || {};

    if (data.ruleType === 'weekly_rotation') {
      // Rotation type required
      if (!config.rotationType) {
        errors.push('rotationType required for weekly_rotation (odd_even_week or alternating)');
      } else if (!['odd_even_week', 'alternating'].includes(config.rotationType)) {
        errors.push('rotationType must be odd_even_week or alternating');
      }

      // Assigned children optional for now (TODO: make required when child assignment is implemented)
      // NOTE: Will need at least 2 children for rotation to work properly
    }

    if (data.ruleType === 'repeating') {
      // Repeat days required
      if (!config.repeatDays || config.repeatDays.length < 1) {
        errors.push('repeatDays required for repeating tasks (array of 0-6)');
      }

      // Assigned children optional for now (TODO: make required when child assignment is implemented)
    }

    if (data.ruleType === 'daily') {
      // Assigned children optional for daily tasks
      // No specific validation needed
    }
  }

  return errors;
}

/**
 * Validates that all child IDs belong to the household
 */
async function validateChildrenBelongToHousehold(
  childIds: string[],
  householdId: string,
): Promise<boolean> {
  if (childIds.length === 0) return true;

  const result = await db.query(
    'SELECT COUNT(*) as count FROM children WHERE id = ANY($1) AND household_id = $2',
    [childIds, householdId],
  );

  const count = parseInt(result.rows[0].count, 10);
  return count === childIds.length;
}

/**
 * POST /api/households/:householdId/tasks - Create task template
 * Requires parent or admin role
 */
async function createTask(request: FastifyRequest<CreateTaskRequest>, reply: FastifyReply) {
  const { householdId } = request.params;

  try {
    // Validate request body with Zod schema
    const validatedData = validateRequest(CreateTaskRequestSchema, request.body);
    const { name, description, points, ruleType, ruleConfig } = validatedData;
    const normalizedRuleConfig = normalizeRuleConfig(ruleConfig);

    // Validate task data based on rule type
    const validationErrors = validateTaskData({
      name,
      description,
      points,
      ruleType,
      ruleConfig: normalizedRuleConfig,
    });
    if (validationErrors.length > 0) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed',
        details: validationErrors,
      });
    }

    // Validate assigned children belong to household
    if (
      normalizedRuleConfig?.assignedChildren &&
      normalizedRuleConfig.assignedChildren.length > 0
    ) {
      const childrenValid = await validateChildrenBelongToHousehold(
        normalizedRuleConfig.assignedChildren,
        householdId,
      );
      if (!childrenValid) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'One or more assigned children do not belong to this household',
        });
      }
    }

    const result = await db.query(
      `INSERT INTO tasks (household_id, name, description, points, rule_type, rule_config)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, household_id, name, description, points, rule_type, rule_config, created_at, updated_at`,
      [
        householdId,
        name.trim(),
        description || null,
        points,
        ruleType,
        normalizedRuleConfig === undefined || normalizedRuleConfig === null
          ? null
          : JSON.stringify(normalizedRuleConfig),
      ],
    );

    return reply.status(201).send(mapTaskRowToTask(result.rows[0]));
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return handleZodError(error, reply);
    }

    request.log.error(error, 'Failed to create task');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to create task',
    });
  }
}

/**
 * GET /api/households/:householdId/tasks - List all household tasks
 * Supports ?active=true/false filter and pagination
 */
async function listTasks(request: FastifyRequest<ListTasksRequest>, reply: FastifyReply) {
  const { householdId } = request.params;
  const { active, page: pageStr, pageSize: pageSizeStr, sortBy, sortOrder } = request.query;

  // Parse pagination with defaults
  const page = pageStr ? parseInt(pageStr, 10) : 1;
  const pageSize = pageSizeStr ? Math.min(parseInt(pageSizeStr, 10), 100) : 20;
  const validPage = Math.max(1, page);
  const validPageSize = Math.max(1, pageSize);

  // Validate sort field to prevent SQL injection
  const allowedSortFields = ['name', 'points', 'createdAt', 'updatedAt'];
  const sortField =
    sortBy && allowedSortFields.includes(sortBy)
      ? sortBy === 'createdAt'
        ? 'created_at'
        : sortBy === 'updatedAt'
          ? 'updated_at'
          : sortBy
      : 'created_at';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

  try {
    let countQuery = 'SELECT COUNT(*) FROM tasks WHERE household_id = $1';
    let dataQuery = 'SELECT * FROM tasks WHERE household_id = $1';
    const params: (string | boolean)[] = [householdId];

    // Add active filter if provided
    if (active !== undefined) {
      const activeBoolean = active === 'true';
      countQuery += ' AND active = $2';
      dataQuery += ' AND active = $2';
      params.push(activeBoolean);
    }

    // Get total count for pagination
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Add sorting and pagination
    dataQuery += ` ORDER BY ${sortField} ${order}`;
    dataQuery += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const offset = calculateOffset(validPage, validPageSize);
    const dataResult = await db.query(dataQuery, [...params, validPageSize, offset]);

    const pagination = calculatePaginationMeta(validPage, validPageSize, total);

    return reply.send({
      tasks: dataResult.rows.map(mapTaskRowToTask),
      pagination,
    });
  } catch (error) {
    request.log.error(error, 'Failed to list tasks');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to retrieve tasks',
    });
  }
}

/**
 * GET /api/households/:householdId/tasks/:taskId - Get task details
 */
async function getTask(request: FastifyRequest<{ Params: TaskParams }>, reply: FastifyReply) {
  const { householdId, taskId } = request.params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(taskId)) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid task ID format',
    });
  }

  try {
    const result = await db.query('SELECT * FROM tasks WHERE id = $1 AND household_id = $2', [
      taskId,
      householdId,
    ]);

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Task not found',
      });
    }

    const task = result.rows[0];

    return reply.send(mapTaskRowToTask(task));
  } catch (error) {
    request.log.error(error, 'Failed to get task');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to retrieve task',
    });
  }
}

/**
 * PUT /api/households/:householdId/tasks/:taskId - Update task template
 * Requires parent or admin role
 */
async function updateTask(request: FastifyRequest<UpdateTaskRequest>, reply: FastifyReply) {
  const { householdId, taskId } = request.params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(taskId)) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid task ID format',
    });
  }

  try {
    // Validate request body with Zod schema
    const validatedData = validateRequest(UpdateTaskRequestSchema, request.body);
    const { name, description, points, ruleType, ruleConfig, active } = validatedData;
    const normalizedRuleConfig = normalizeRuleConfig(ruleConfig);

    // Validate update data if rule_type is being changed
    if (ruleType) {
      const validationErrors = validateTaskData(
        {
          ...validatedData,
          ruleType,
          ruleConfig: normalizedRuleConfig,
        },
        true,
      );
      if (validationErrors.length > 0) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation failed',
          details: validationErrors,
        });
      }
    }

    // Validate assigned children if provided
    if (
      normalizedRuleConfig?.assignedChildren &&
      normalizedRuleConfig.assignedChildren.length > 0
    ) {
      const childrenValid = await validateChildrenBelongToHousehold(
        normalizedRuleConfig.assignedChildren,
        householdId,
      );
      if (!childrenValid) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'One or more assigned children do not belong to this household',
        });
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description || null);
    }
    if (points !== undefined) {
      updates.push(`points = $${paramIndex++}`);
      values.push(points);
    }
    if (ruleType !== undefined) {
      updates.push(`rule_type = $${paramIndex++}`);
      values.push(ruleType);
    }
    if (ruleConfig !== undefined) {
      updates.push(`rule_config = $${paramIndex++}`);
      values.push(
        normalizedRuleConfig === undefined || normalizedRuleConfig === null
          ? null
          : JSON.stringify(normalizedRuleConfig),
      );
    }
    if (active !== undefined) {
      updates.push(`active = $${paramIndex++}`);
      values.push(active);
    }

    if (updates.length === 0) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'No fields to update',
      });
    }

    updates.push(`updated_at = NOW()`);

    // Add WHERE clause parameters
    values.push(taskId, householdId);

    const query = `
      UPDATE tasks 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND household_id = $${paramIndex++}
      RETURNING id, household_id, name, description, points, rule_type, rule_config, created_at, updated_at
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Task not found in this household',
      });
    }

    const task = result.rows[0];

    return reply.send(mapTaskRowToTask(task));
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return handleZodError(error, reply);
    }

    request.log.error(error, 'Failed to update task');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to update task',
    });
  }
}

/**
 * DELETE /api/households/:householdId/tasks/:taskId - Soft delete task
 * Requires parent or admin role
 * Sets active=false instead of deleting record
 */
async function deleteTask(request: FastifyRequest<{ Params: TaskParams }>, reply: FastifyReply) {
  const { householdId, taskId } = request.params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(taskId)) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid task ID format',
    });
  }

  try {
    const result = await db.query(
      `UPDATE tasks 
       SET active = false, updated_at = NOW()
       WHERE id = $1 AND household_id = $2
       RETURNING id`,
      [taskId, householdId],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Task not found in this household',
      });
    }

    return reply.send({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    request.log.error(error, 'Failed to delete task');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to delete task',
    });
  }
}

/**
 * Register task routes
 */
export default async function taskRoutes(server: FastifyInstance) {
  // OpenAPI schemas from Zod
  const ParamsSchema = z.object({ householdId: z.string().uuid() });
  const TaskParamsSchema = z.object({
    householdId: z.string().uuid(),
    taskId: z.string().uuid(),
  });
  const QuerySchema = z.object({
    active: z.enum(['true', 'false']).optional(),
    page: z.string().optional().describe('Page number (1-indexed, default: 1)'),
    pageSize: z.string().optional().describe('Items per page (max 100, default: 20)'),
    sortBy: z
      .enum(['name', 'points', 'createdAt', 'updatedAt'])
      .optional()
      .describe('Field to sort by'),
    sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: desc)'),
  });

  // List tasks (member access)
  server.get('/api/households/:householdId/tasks', {
    schema: stripResponseValidation({
      summary: 'List all task templates for household',
      description: 'Get all task templates with pagination, optionally filtered by active status',
      tags: ['tasks'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(ParamsSchema),
      querystring: zodToOpenAPI(QuerySchema),
      response: {
        200: zodToOpenAPI(
          z.object({
            tasks: z.array(TaskSchema),
            pagination: PaginationMetaSchema,
          }),
          {
            description: 'Paginated list of task templates',
          },
        ),
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership],
    handler: listTasks,
  });

  // Get task details (member access)
  server.get('/api/households/:householdId/tasks/:taskId', {
    schema: stripResponseValidation({
      summary: 'Get task template details',
      description: 'Get a single task template by ID',
      tags: ['tasks'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(TaskParamsSchema),
      response: {
        200: zodToOpenAPI(TaskSchema),
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership],
    handler: getTask,
  });

  // Create task (parent/admin access)
  server.post('/api/households/:householdId/tasks', {
    schema: stripResponseValidation({
      summary: 'Create new task template',
      description: 'Create a task template with assignment rules',
      tags: ['tasks'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(ParamsSchema),
      body: zodToOpenAPI(CreateTaskRequestSchema),
      response: {
        201: zodToOpenAPI(TaskSchema, { description: 'Task created successfully' }),
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent],
    handler: createTask,
  });

  // Update task (parent/admin access)
  server.put('/api/households/:householdId/tasks/:taskId', {
    schema: stripResponseValidation({
      summary: 'Update task template',
      description: 'Update task template properties',
      tags: ['tasks'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(TaskParamsSchema),
      body: zodToOpenAPI(UpdateTaskRequestSchema),
      response: {
        200: zodToOpenAPI(TaskSchema, { description: 'Task updated successfully' }),
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent],
    handler: updateTask,
  });

  // Delete task (parent/admin access)
  server.delete('/api/households/:householdId/tasks/:taskId', {
    schema: stripResponseValidation({
      summary: 'Delete task template',
      description: 'Soft delete a task template (sets active to false)',
      tags: ['tasks'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(TaskParamsSchema),
      response: {
        200: {
          description: 'Task deleted successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent],
    handler: deleteTask,
  });
}
