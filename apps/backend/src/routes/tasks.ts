import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  TaskSchema,
  CreateTaskRequestSchema,
  UpdateTaskRequestSchema,
  type Task,
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
    rule_type: 'weekly_rotation' | 'repeating' | 'daily';
    rule_config?: {
      rotation_type?: 'odd_even_week' | 'alternating';
      repeat_days?: number[];
      assigned_children?: string[];
    };
  };
}

interface UpdateTaskRequest {
  Params: TaskParams;
  Body: {
    name?: string;
    description?: string;
    points?: number;
    rule_type?: string;
    rule_config?: {
      rotation_type?: string;
      repeat_days?: number[];
      assigned_children?: string[];
    };
  };
}

interface ListTasksRequest {
  Params: HouseholdParams;
  Querystring: {
    active?: string;
  };
}

/**
 * Validates task data based on rule type
 * Returns array of error messages (empty if valid)
 * Zod handles basic validation (types, min/max), this handles business logic
 */
function validateTaskData(
  data: {
    name?: string;
    description?: string | null;
    points?: number;
    rule_type?: string;
    rule_config?: any;
  },
  isUpdate: boolean = false,
): string[] {
  const errors: string[] = [];

  // Basic Zod validation is already done, this is business logic validation

  // Rule-specific validation
  if (data.rule_type) {
    const config = data.rule_config || {};

    if (data.rule_type === 'weekly_rotation') {
      // Rotation type required
      if (!config.rotation_type) {
        errors.push('rotation_type required for weekly_rotation (odd_even_week or alternating)');
      } else if (!['odd_even_week', 'alternating'].includes(config.rotation_type)) {
        errors.push('rotation_type must be odd_even_week or alternating');
      }

      // Assigned children required (min 2 for rotation)
      if (!config.assigned_children || config.assigned_children.length < 2) {
        errors.push('At least 2 assigned_children required for weekly_rotation');
      }
    }

    if (data.rule_type === 'repeating') {
      // Repeat days required
      if (!config.repeat_days || config.repeat_days.length < 1) {
        errors.push('repeat_days required for repeating tasks (array of 0-6)');
      }

      // Assigned children required (min 1)
      if (!config.assigned_children || config.assigned_children.length < 1) {
        errors.push('At least 1 assigned_child required for repeating tasks');
      }
    }

    if (data.rule_type === 'daily') {
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
    const { name, description, points, rule_type, rule_config } = validatedData;

    // Validate task data based on rule type
    const validationErrors = validateTaskData({
      name,
      description,
      points,
      rule_type,
      rule_config,
    });
    if (validationErrors.length > 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Validation failed',
        details: validationErrors,
      });
    }

    // Validate assigned children belong to household
    if (rule_config?.assigned_children && rule_config.assigned_children.length > 0) {
      const childrenValid = await validateChildrenBelongToHousehold(
        rule_config.assigned_children,
        householdId,
      );
      if (!childrenValid) {
        return reply.status(400).send({
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
        points || 10,
        rule_type,
        rule_config ? JSON.stringify(rule_config) : null,
      ],
    );

    const task = result.rows[0];

    return reply.status(201).send({
      id: task.id,
      household_id: task.household_id,
      name: task.name,
      description: task.description,
      points: task.points,
      rule_type: task.rule_type,
      rule_config: task.rule_config,
      created_at: task.created_at,
      updated_at: task.updated_at,
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return handleZodError(error, reply);
    }

    request.log.error(error, 'Failed to create task');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to create task',
    });
  }
}

/**
 * GET /api/households/:householdId/tasks - List all household tasks
 * Supports ?active=true/false filter
 */
async function listTasks(request: FastifyRequest<ListTasksRequest>, reply: FastifyReply) {
  const { householdId } = request.params;
  const { active } = request.query;

  try {
    let query = 'SELECT * FROM tasks WHERE household_id = $1';
    const params: (string | boolean)[] = [householdId];

    // Add active filter if provided
    if (active !== undefined) {
      const activeBoolean = active === 'true';
      query += ' AND active = $2';
      params.push(activeBoolean);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);

    const tasks = result.rows.map((row) => ({
      id: row.id,
      household_id: row.household_id,
      name: row.name,
      description: row.description,
      points: row.points,
      rule_type: row.rule_type,
      rule_config: row.rule_config,
      active: row.active !== false, // Default to true if column doesn't exist yet
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return reply.send(tasks);
  } catch (error) {
    request.log.error(error, 'Failed to list tasks');
    return reply.status(500).send({
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
        error: 'Not Found',
        message: 'Task not found',
      });
    }

    const task = result.rows[0];

    return reply.send({
      id: task.id,
      household_id: task.household_id,
      name: task.name,
      description: task.description,
      points: task.points,
      rule_type: task.rule_type,
      rule_config: task.rule_config,
      active: task.active !== false,
      created_at: task.created_at,
      updated_at: task.updated_at,
    });
  } catch (error) {
    request.log.error(error, 'Failed to get task');
    return reply.status(500).send({
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
      error: 'Bad Request',
      message: 'Invalid task ID format',
    });
  }

  try {
    // Validate request body with Zod schema
    const validatedData = validateRequest(UpdateTaskRequestSchema, request.body);
    const { name, description, points, rule_type, rule_config } = validatedData;

    // Validate update data if rule_type is being changed
    if (rule_type) {
      const validationErrors = validateTaskData({ ...validatedData, rule_type }, true);
      if (validationErrors.length > 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Validation failed',
          details: validationErrors,
        });
      }
    }

    // Validate assigned children if provided
    if (rule_config?.assigned_children && rule_config.assigned_children.length > 0) {
      const childrenValid = await validateChildrenBelongToHousehold(
        rule_config.assigned_children,
        householdId,
      );
      if (!childrenValid) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'One or more assigned children do not belong to this household',
        });
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
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
    if (rule_type !== undefined) {
      updates.push(`rule_type = $${paramIndex++}`);
      values.push(rule_type);
    }
    if (rule_config !== undefined) {
      updates.push(`rule_config = $${paramIndex++}`);
      values.push(JSON.stringify(rule_config));
    }

    if (updates.length === 0) {
      return reply.status(400).send({
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
        error: 'Not Found',
        message: 'Task not found in this household',
      });
    }

    const task = result.rows[0];

    return reply.send({
      id: task.id,
      household_id: task.household_id,
      name: task.name,
      description: task.description,
      points: task.points,
      rule_type: task.rule_type,
      rule_config: task.rule_config,
      active: task.active !== false,
      created_at: task.created_at,
      updated_at: task.updated_at,
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return handleZodError(error, reply);
    }

    request.log.error(error, 'Failed to update task');
    return reply.status(500).send({
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
      error: 'Bad Request',
      message: 'Invalid task ID format',
    });
  }

  try {
    // First check if active column exists, if not add it
    // This handles the case where migration hasn't been run yet
    try {
      await db.query(`
        ALTER TABLE tasks 
        ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true
      `);
    } catch (alterError) {
      // Column might already exist, continue
      request.log.debug('Active column already exists or could not be added');
    }

    const result = await db.query(
      `UPDATE tasks 
       SET active = false, updated_at = NOW()
       WHERE id = $1 AND household_id = $2
       RETURNING id`,
      [taskId, householdId],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
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
  const QuerySchema = z.object({ active: z.enum(['true', 'false']).optional() });

  // List tasks (member access)
  server.get('/api/households/:householdId/tasks', {
    schema: stripResponseValidation({
      summary: 'List all task templates for household',
      description: 'Get all task templates, optionally filtered by active status',
      tags: ['tasks'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(ParamsSchema),
      querystring: zodToOpenAPI(QuerySchema),
      response: {
        200: zodToOpenAPI(z.array(TaskSchema), {
          description: 'List of task templates',
        }),
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
