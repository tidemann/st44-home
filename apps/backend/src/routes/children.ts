import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database.js';
import { authenticateUser } from '../middleware/auth.js';
import {
  validateHouseholdMembership,
  requireHouseholdParent,
  requireHouseholdAdmin,
} from '../middleware/household-membership.js';
import {
  ChildSchema,
  CreateChildRequestSchema,
  UpdateChildRequestSchema,
  CreateChildUserAccountRequestSchema,
} from '@st44/types';
import { z, zodToOpenAPI, CommonErrors } from '@st44/types/generators';
import { validateRequest, handleZodError } from '../utils/validation.js';
import { stripResponseValidation } from '../schemas/common.js';
import bcrypt from 'bcrypt';

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
      `SELECT id, household_id, user_id, name, birth_year, created_at, updated_at
       FROM children
       WHERE household_id = $1
       ORDER BY name ASC`,
      [householdId],
    );

    const children = result.rows.map((row) => ({
      id: row.id,
      householdId: row.household_id,
      userId: row.user_id,
      name: row.name,
      birthYear: row.birth_year,
      avatarUrl: null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return reply.send({ children });
  } catch (error) {
    request.log.error(error, 'Failed to list children');
    return reply.status(500).send({
      statusCode: 500,
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
      householdId: child.household_id,
      name: child.name,
      birthYear: child.birth_year,
      avatarUrl: null,
      createdAt: child.created_at,
      updatedAt: child.created_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error, reply);
    }
    request.log.error(error, 'Failed to create child');
    return reply.status(500).send({
      statusCode: 500,
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
      householdId: child.household_id,
      name: child.name,
      birthYear: child.birth_year,
      avatarUrl: null,
      createdAt: child.created_at,
      updatedAt: child.updated_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error, reply);
    }
    request.log.error(error, 'Failed to update child');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to update child',
    });
  }
}

/**
 * GET /api/households/:householdId/children/:childId - Get single child
 * Returns child details including userId
 */
async function getChild(request: FastifyRequest<{ Params: ChildParams }>, reply: FastifyReply) {
  const { householdId, childId } = request.params;

  try {
    const result = await db.query(
      `SELECT id, household_id, user_id, name, birth_year, created_at, updated_at
       FROM children
       WHERE id = $1 AND household_id = $2`,
      [childId, householdId],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Child not found in this household',
      });
    }

    const child = result.rows[0];

    return reply.send({
      id: child.id,
      householdId: child.household_id,
      userId: child.user_id,
      name: child.name,
      birthYear: child.birth_year,
      avatarUrl: null,
      createdAt: child.created_at,
      updatedAt: child.updated_at,
    });
  } catch (error) {
    request.log.error(error, 'Failed to get child');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to retrieve child',
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
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to delete child',
    });
  }
}

interface CreateChildUserAccountRequest {
  Params: ChildParams;
  Body: {
    email: string;
    password: string;
  };
}

/**
 * POST /api/households/:householdId/children/:childId/create-account - Create user account for child
 * Requires parent or admin role
 * Creates user with hashed password and links to child profile
 */
async function createChildUserAccount(
  request: FastifyRequest<CreateChildUserAccountRequest>,
  reply: FastifyReply,
) {
  const { householdId, childId } = request.params;
  const { email, password } = request.body;

  // Validate request body
  try {
    CreateChildUserAccountRequestSchema.parse({ childId, email, password });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error, reply);
    }
  }

  // Start transaction
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Check child exists and doesn't already have a user account
    const childResult = await client.query(
      `SELECT id, user_id, household_id, name
       FROM children
       WHERE id = $1 AND household_id = $2`,
      [childId, householdId],
    );

    if (childResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Child not found in this household',
      });
    }

    const child = childResult.rows[0];

    if (child.user_id) {
      await client.query('ROLLBACK');
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Child already has a user account',
      });
    }

    // 2. Check email isn't already in use
    const emailCheckResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);

    if (emailCheckResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Email already in use',
      });
    }

    // 3. Hash password with bcrypt (10 rounds)
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create user in users table
    const userResult = await client.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email, passwordHash],
    );

    const userId = userResult.rows[0].id;

    // 5. Link child to user by setting children.user_id
    await client.query('UPDATE children SET user_id = $1, updated_at = NOW() WHERE id = $2', [
      userId,
      childId,
    ]);

    // 6. Add household_members entry with role='child'
    await client.query(
      `INSERT INTO household_members (household_id, user_id, role)
       VALUES ($1, $2, 'child')`,
      [householdId, userId],
    );

    // Commit transaction
    await client.query('COMMIT');

    request.log.info({ childId, userId, email }, 'Child user account created successfully');

    return reply.status(201).send({
      success: true,
      userId,
      message: 'User account created successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    request.log.error(error, 'Failed to create child user account');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to create user account',
    });
  } finally {
    client.release();
  }
}

interface MyTasksQuerystring {
  householdId?: string;
  date?: string;
}

/**
 * GET /api/children/me/tasks - Get tasks for authenticated child user
 * Returns tasks for the child user (today's tasks by default)
 * Security: Only returns tasks for child linked to authenticated user
 */
async function getMyTasks(
  request: FastifyRequest<{ Querystring: MyTasksQuerystring }>,
  reply: FastifyReply,
) {
  const userId = request.user?.userId;
  if (!userId) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  const { householdId: householdIdParam, date } = request.query;
  const taskDate = date || new Date().toISOString().split('T')[0];

  try {
    // Step 1: Find child profile linked to authenticated user
    let householdId = householdIdParam;

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

    // Step 2: Get child profile using user_id column (added in migration 022)
    // SECURITY: This ensures child can only access their own tasks
    const childResult = await db.query(
      `SELECT id, name, household_id
       FROM children
       WHERE user_id = $1 AND household_id = $2`,
      [userId, householdId],
    );

    if (childResult.rows.length === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Child profile not found',
      });
    }

    const child = childResult.rows[0];
    const childId = child.id;
    const childName = child.name;

    // Step 3: Query task assignments for this child and date
    // SECURITY: WHERE clause ensures only tasks for authenticated child are returned
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
      taskName: row.task_name,
      taskDescription: row.task_description,
      points: row.points,
      date: row.date,
      status: row.status,
      completedAt: row.completed_at ? row.completed_at.toISOString() : null,
    }));

    // Step 4: Calculate points
    const totalPoints = tasks.reduce((sum, task) => sum + task.points, 0);
    const completedPoints = tasks
      .filter((task) => task.status === 'completed')
      .reduce((sum, task) => sum + task.points, 0);

    return reply.send({
      tasks,
      totalPointsToday: totalPoints,
      completedPoints,
      childName,
    });
  } catch (error) {
    request.log.error(error, 'Failed to get my tasks');
    return reply.status(500).send({
      statusCode: 500,
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
    householdId: z.string().uuid().optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    status: z.enum(['pending', 'completed']).optional(),
  });

  // Schema for child's task assignment response
  const ChildTaskAssignmentSchema = z.object({
    id: z.string().uuid(),
    taskName: z.string(),
    taskDescription: z.string().nullable(),
    points: z.number(),
    date: z.string(),
    status: z.enum(['pending', 'completed', 'overdue']),
    completedAt: z.string().nullable(),
  });

  const MyTasksResponseSchema = z.object({
    tasks: z.array(ChildTaskAssignmentSchema),
    totalPointsToday: z.number(),
    completedPoints: z.number(),
    childName: z.string(),
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
        200: zodToOpenAPI(MyTasksResponseSchema),
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

  // Get single child (member access)
  server.get('/api/households/:householdId/children/:childId', {
    schema: stripResponseValidation({
      summary: 'Get child details',
      description: 'Returns details for a specific child',
      tags: ['children'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(ChildParamsSchema),
      response: {
        200: zodToOpenAPI(ChildSchema),
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership],
    handler: getChild,
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

  // Create child user account (parent/admin access)
  server.post('/api/households/:householdId/children/:childId/create-account', {
    schema: stripResponseValidation({
      summary: 'Create user account for child',
      description: 'Creates a user account for an existing child profile (parent/admin only)',
      tags: ['children'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(ChildParamsSchema),
      body: zodToOpenAPI(
        z.object({
          email: z.string().email(),
          password: z.string().min(8).max(128),
        }),
      ),
      response: {
        201: zodToOpenAPI(
          z.object({
            success: z.boolean(),
            userId: z.string().uuid(),
            message: z.string(),
          }),
        ),
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent],
    handler: createChildUserAccount,
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
