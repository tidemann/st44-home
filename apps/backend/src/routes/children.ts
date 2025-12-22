import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database.js';
import { authenticateUser } from '../middleware/auth.js';
import {
  validateHouseholdMembership,
  requireHouseholdParent,
  requireHouseholdAdmin,
} from '../middleware/household-membership.js';
import { ChildSchema, CreateChildRequestSchema, UpdateChildRequestSchema } from '@st44/types';
import { z, zodToOpenAPI, CommonErrors } from '@st44/types/generators';
import { validateRequest, handleZodError } from '../utils/validation.js';
import { stripResponseValidation } from '../schemas/common.js';

interface HouseholdParams {
  householdId: string;
}

interface ChildParams extends HouseholdParams {
  childId: string;
}

interface CreateChildRequest {
  Params: HouseholdParams;
  Body: {
    name: string;
    birthYear: number;
  };
}

interface UpdateChildRequest {
  Params: ChildParams;
  Body: {
    name: string;
    birthYear: number;
  };
}

interface DeleteChildRequest {
  Params: ChildParams;
}

/**
 * GET /api/households/:householdId/children - List children in household
 * Returns all children ordered by name
 */
async function listChildren(
  request: FastifyRequest<{ Params: HouseholdParams }>,
  reply: FastifyReply,
) {
  const { householdId } = request.params;

  try {
    const result = await db.query(
      `SELECT id, household_id, name, birth_year, created_at, updated_at
       FROM children
       WHERE household_id = $1
       ORDER BY name ASC`,
      [householdId],
    );

    const children = result.rows.map((row) => ({
      id: row.id,
      household_id: row.household_id,
      name: row.name,
      birth_year: row.birth_year,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return reply.send(children);
  } catch (error) {
    request.log.error(error, 'Failed to list children');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to retrieve children',
    });
  }
}

/**
 * POST /api/households/:householdId/children - Add child to household
 * Requires parent or admin role
 */
async function createChild(request: FastifyRequest<CreateChildRequest>, reply: FastifyReply) {
  const { householdId } = request.params;

  try {
    const validatedData = validateRequest(CreateChildRequestSchema, request.body);

    const result = await db.query(
      `INSERT INTO children (household_id, name, birth_year)
       VALUES ($1, $2, $3)
       RETURNING id, household_id, name, birth_year, created_at`,
      [householdId, validatedData.name, validatedData.birthYear],
    );

    const child = result.rows[0];

    return reply.status(201).send({
      id: child.id,
      household_id: child.household_id,
      name: child.name,
      birth_year: child.birth_year,
      created_at: child.created_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error, reply);
    }
    request.log.error(error, 'Failed to create child');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to create child',
    });
  }
}

/**
 * PUT /api/households/:householdId/children/:id - Update child
 * Requires parent or admin role
 */
async function updateChild(request: FastifyRequest<UpdateChildRequest>, reply: FastifyReply) {
  const { householdId, childId: id } = request.params;

  try {
    const validatedData = validateRequest(UpdateChildRequestSchema, request.body);

    const result = await db.query(
      `UPDATE children
       SET name = $1, birth_year = $2, updated_at = NOW()
       WHERE id = $3 AND household_id = $4
       RETURNING id, household_id, name, birth_year, created_at, updated_at`,
      [validatedData.name, validatedData.birthYear, id, householdId],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Child not found in this household',
      });
    }

    const child = result.rows[0];

    return reply.send({
      id: child.id,
      household_id: child.household_id,
      name: child.name,
      birth_year: child.birth_year,
      created_at: child.created_at,
      updated_at: child.updated_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error, reply);
    }
    request.log.error(error, 'Failed to update child');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to update child',
    });
  }
}

/**
 * DELETE /api/households/:householdId/children/:id - Remove child
 * Requires admin role
 */
async function deleteChild(request: FastifyRequest<DeleteChildRequest>, reply: FastifyReply) {
  const { householdId, childId: id } = request.params;

  // Validate child ID format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Invalid child ID format',
    });
  }

  try {
    const result = await db.query(
      `DELETE FROM children
       WHERE id = $1 AND household_id = $2
       RETURNING id`,
      [id, householdId],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Child not found in this household',
      });
    }

    return reply.send({
      success: true,
      message: 'Child removed successfully',
    });
  } catch (error) {
    request.log.error(error, 'Failed to delete child');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to delete child',
    });
  }
}

interface MyTasksQuerystring {
  household_id?: string;
  date?: string;
}

/**
 * GET /api/children/my-tasks - Get tasks for authenticated child user
 * Returns today's tasks (or specified date) for the child user
 */
async function getMyTasks(
  request: FastifyRequest<{ Querystring: MyTasksQuerystring }>,
  reply: FastifyReply,
) {
  const userId = request.user?.userId;
  if (!userId) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  const { household_id, date } = request.query;
  const taskDate = date || new Date().toISOString().split('T')[0];

  try {
    // Step 1: Find child profile for this user
    // First, verify user has 'child' role in household_members
    let householdId = household_id;

    if (!householdId) {
      // Get the user's current household (first one with 'child' role)
      const membershipResult = await db.query(
        `SELECT household_id 
         FROM household_members 
         WHERE user_id = $1 AND role = 'child'
         LIMIT 1`,
        [userId],
      );

      if (membershipResult.rows.length === 0) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'User is not a child in any household',
        });
      }

      householdId = membershipResult.rows[0].household_id;
    } else {
      // Verify user has 'child' role in specified household
      const membershipResult = await db.query(
        `SELECT id 
         FROM household_members 
         WHERE user_id = $1 AND household_id = $2 AND role = 'child'`,
        [userId, householdId],
      );

      if (membershipResult.rows.length === 0) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'User is not a child in this household',
        });
      }
    }

    // Step 2: Get child profile associated with this user's household membership
    // Note: This assumes one child profile per household per user
    // In the current schema, children table doesn't have user_id foreign key
    // So we need to implement a different approach or add that relationship
    // For now, we'll query by household and return error if multiple children exist

    const childResult = await db.query(
      `SELECT c.id, c.name
       FROM children c
       WHERE c.household_id = $1
       LIMIT 1`,
      [householdId],
    );

    if (childResult.rows.length === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Child profile not found for this user',
      });
    }

    const child = childResult.rows[0];
    const childId = child.id;
    const childName = child.name;

    // Step 3: Query task assignments for this child and date
    const tasksResult = await db.query(
      `SELECT 
        ta.id,
        t.name as task_name,
        t.description as task_description,
        t.points,
        ta.date,
        ta.status,
        tc.completed_at
       FROM task_assignments ta
       JOIN tasks t ON ta.task_id = t.id
       LEFT JOIN task_completions tc ON ta.id = tc.task_assignment_id
       WHERE ta.child_id = $1 
         AND ta.household_id = $2
         AND ta.date = $3
       ORDER BY t.name ASC`,
      [childId, householdId, taskDate],
    );

    const tasks = tasksResult.rows.map((row) => ({
      id: row.id,
      task_name: row.task_name,
      task_description: row.task_description,
      points: row.points,
      date: row.date,
      status: row.status,
      completed_at: row.completed_at ? row.completed_at.toISOString() : null,
    }));

    // Step 4: Calculate points
    const totalPoints = tasks.reduce((sum, task) => sum + task.points, 0);
    const completedPoints = tasks
      .filter((task) => task.status === 'completed')
      .reduce((sum, task) => sum + task.points, 0);

    return reply.send({
      tasks,
      total_points_today: totalPoints,
      completed_points: completedPoints,
      child_name: childName,
    });
  } catch (error) {
    request.log.error(error, 'Failed to get my tasks');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to retrieve tasks',
    });
  }
}

/**
 * Register children routes
 */
export default async function childrenRoutes(server: FastifyInstance) {
  // Get my tasks (child access)
  // Define local param schemas
  const HouseholdParamsSchema = z.object({
    householdId: z.string().uuid(),
  });

  const ChildParamsSchema = z.object({
    householdId: z.string().uuid(),
    childId: z.string().uuid(),
  });

  const TaskQuerySchema = z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    status: z.enum(['pending', 'completed']).optional(),
  });

  // Get my tasks (for logged-in children)
  server.get('/api/children/my-tasks', {
    schema: stripResponseValidation({
      summary: 'Get tasks for logged-in child',
      description: 'Returns tasks assigned to the authenticated child user',
      tags: ['children'],
      security: [{ bearerAuth: [] }],
      querystring: zodToOpenAPI(TaskQuerySchema),
      response: {
        200: zodToOpenAPI(
          z.object({
            tasks: z.array(z.any()), // TaskAssignment type not in shared schemas yet
          }),
        ),
        ...CommonErrors.Unauthorized,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser],
    handler: getMyTasks,
  });

  // List children (member access)
  server.get('/api/households/:householdId/children', {
    schema: stripResponseValidation({
      summary: 'List children in household',
      description: 'Returns all children in the specified household',
      tags: ['children'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(HouseholdParamsSchema),
      response: {
        200: zodToOpenAPI(
          z.object({
            children: z.array(ChildSchema),
          }),
        ),
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership],
    handler: listChildren,
  });

  // Create child (parent/admin access)
  server.post('/api/households/:householdId/children', {
    schema: stripResponseValidation({
      summary: 'Create new child',
      description: 'Creates a new child in the household (parent/admin only)',
      tags: ['children'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(HouseholdParamsSchema),
      body: zodToOpenAPI(CreateChildRequestSchema),
      response: {
        201: zodToOpenAPI(ChildSchema),
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent],
    handler: createChild,
  });

  // Update child (parent/admin access)
  server.put('/api/households/:householdId/children/:childId', {
    schema: stripResponseValidation({
      summary: 'Update child details',
      description: 'Updates child information (parent/admin only)',
      tags: ['children'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(ChildParamsSchema),
      body: zodToOpenAPI(UpdateChildRequestSchema),
      response: {
        200: zodToOpenAPI(ChildSchema),
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent],
    handler: updateChild,
  });

  // Delete child (admin only)
  server.delete('/api/households/:householdId/children/:childId', {
    schema: stripResponseValidation({
      summary: 'Delete child',
      description: 'Permanently deletes a child from the household (admin only)',
      tags: ['children'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(ChildParamsSchema),
      response: {
        204: {
          type: 'object',
          properties: {},
          required: [],
          description: 'Child deleted successfully',
        },
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdAdmin],
    handler: deleteChild,
  });
}
