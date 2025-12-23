import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  HouseholdSchema,
  CreateHouseholdRequestSchema,
  UpdateHouseholdRequestSchema,
  type Household,
} from '@st44/types';
import { z, zodToOpenAPI, CommonErrors } from '@st44/types/generators';
import { db } from '../database.js';
import { authenticateUser } from '../middleware/auth.js';
import {
  validateHouseholdMembership,
  requireHouseholdAdmin,
} from '../middleware/household-membership.js';
import { validateRequest, handleZodError } from '../utils/validation.js';
import { stripResponseValidation } from '../schemas/common.js';

function toDateTimeString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date(String(value)).toISOString();
}

interface CreateHouseholdRequest {
  Body: {
    name: string;
  };
}

interface GetHouseholdRequest {
  Params: {
    householdId: string;
  };
}

interface UpdateHouseholdRequest {
  Params: {
    householdId: string;
  };
  Body: {
    name: string;
  };
}

/**
 * POST /api/households - Create new household
 * Creates household and automatically assigns creator as admin
 */
async function createHousehold(
  request: FastifyRequest<CreateHouseholdRequest>,
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

  try {
    // Validate request body with Zod schema
    const validatedData = validateRequest(CreateHouseholdRequestSchema, request.body);
    const { name } = validatedData;

    // Begin transaction
    await db.query('BEGIN');

    // Insert household
    const householdResult = await db.query(
      'INSERT INTO households (name) VALUES ($1) RETURNING id, name, created_at, updated_at',
      [name.trim()],
    );

    const household = householdResult.rows[0];

    // Insert household_members (creator as admin)
    await db.query(
      'INSERT INTO household_members (household_id, user_id, role, joined_at) VALUES ($1, $2, $3, NOW())',
      [household.id, userId, 'admin'],
    );

    await db.query('COMMIT');

    return reply.status(201).send({
      id: household.id,
      name: household.name,
      role: 'admin',
      createdAt: household.created_at,
      updatedAt: household.updated_at,
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return handleZodError(error, reply);
    }
    await db.query('ROLLBACK');
    request.log.error(error, 'Failed to create household');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to create household',
    });
  }
}

/**
 * GET /api/households - List user's households
 * Returns all households user belongs to with their role
 */
async function listHouseholds(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user?.userId;

  if (!userId) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  try {
    const result = await db.query(
      `SELECT 
        h.id, 
        h.name,
        h.created_at,
        h.updated_at,
        hm.role, 
        hm.joined_at,
        (SELECT COUNT(*) FROM household_members WHERE household_id = h.id) as member_count,
        (SELECT COUNT(*) FROM children WHERE household_id = h.id) as children_count
      FROM households h
      JOIN household_members hm ON h.id = hm.household_id
      WHERE hm.user_id = $1
      ORDER BY hm.joined_at DESC`,
      [userId],
    );

    const households = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      memberCount: parseInt(row.member_count, 10),
      childrenCount: parseInt(row.children_count, 10),
      joinedAt: row.joined_at,
      createdAt: toDateTimeString(row.created_at),
      updatedAt: toDateTimeString(row.updated_at),
    }));

    return reply.send(households);
  } catch (error) {
    request.log.error(error, 'Failed to list households');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to retrieve households',
    });
  }
}

/**
 * GET /api/households/:id - Get household details
 * Returns household details if user is a member
 */
async function getHousehold(request: FastifyRequest<GetHouseholdRequest>, reply: FastifyReply) {
  const { householdId: id } = request.params;
  const role = request.household?.role;

  if (!role) {
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Household context missing',
    });
  }

  try {
    // Get household details
    const householdResult = await db.query(
      `SELECT 
        h.id, 
        h.name, 
        h.created_at, 
        h.updated_at,
        (SELECT COUNT(*) FROM household_members WHERE household_id = h.id) as member_count,
        (SELECT COUNT(*) FROM children WHERE household_id = h.id) as children_count
      FROM households h
      WHERE h.id = $1`,
      [id],
    );

    if (householdResult.rows.length === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Household not found',
      });
    }

    const household = householdResult.rows[0];

    return reply.send({
      id: household.id,
      name: household.name,
      role,
      memberCount: parseInt(household.member_count, 10),
      childrenCount: parseInt(household.children_count, 10),
      createdAt: toDateTimeString(household.created_at),
      updatedAt: toDateTimeString(household.updated_at),
    });
  } catch (error) {
    request.log.error(error, 'Failed to get household');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to retrieve household',
    });
  }
}

/**
 * PUT /api/households/:id - Update household
 * Updates household name (admin only)
 */
async function updateHousehold(
  request: FastifyRequest<UpdateHouseholdRequest>,
  reply: FastifyReply,
) {
  const { householdId: id } = request.params;

  try {
    // Validate request body with Zod schema
    const validatedData = validateRequest(UpdateHouseholdRequestSchema, request.body);
    const { name } = validatedData;

    // Update household (middleware already validated admin role)
    const result = await db.query(
      'UPDATE households SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, created_at, updated_at',
      [name.trim(), id],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Household not found',
      });
    }

    const household = result.rows[0];

    return reply.send({
      id: household.id,
      name: household.name,
      createdAt: toDateTimeString(household.created_at),
      updatedAt: toDateTimeString(household.updated_at),
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return handleZodError(error, reply);
    }

    request.log.error(error, 'Failed to update household');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to update household',
    });
  }
}

/**
 * GET /api/households/:id/dashboard - Get dashboard summary
 * Returns week summary, children stats for parent dashboard
 */
async function getHouseholdDashboard(
  request: FastifyRequest<GetHouseholdRequest>,
  reply: FastifyReply,
) {
  const { householdId: id } = request.params;

  try {
    // Get household info
    const householdResult = await db.query(
      'SELECT id, name, created_at, updated_at FROM households WHERE id = $1',
      [id],
    );

    if (householdResult.rows.length === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Household not found',
      });
    }

    const household = householdResult.rows[0];

    // Get week summary from task_assignments
    // Week starts on Monday, ends on Sunday
    const weekSummaryResult = await db.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'pending' AND date >= CURRENT_DATE THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'pending' AND date < CURRENT_DATE THEN 1 ELSE 0 END) as overdue
      FROM task_assignments
      WHERE household_id = $1 
        AND date >= date_trunc('week', CURRENT_DATE)
        AND date < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'`,
      [id],
    );

    const weekStats = weekSummaryResult.rows[0];
    const total = parseInt(weekStats.total || '0', 10);
    const completed = parseInt(weekStats.completed || '0', 10);
    const pending = parseInt(weekStats.pending || '0', 10);
    const overdue = parseInt(weekStats.overdue || '0', 10);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Get per-child statistics
    const childrenResult = await db.query(
      `SELECT 
        c.id, 
        c.name,
        COUNT(ta.id) as tasks_total,
        SUM(CASE WHEN ta.status = 'completed' THEN 1 ELSE 0 END) as tasks_completed
      FROM children c
      LEFT JOIN task_assignments ta ON ta.child_id = c.id 
        AND ta.date >= date_trunc('week', CURRENT_DATE)
        AND ta.date < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
      WHERE c.household_id = $1
      GROUP BY c.id, c.name
      ORDER BY c.name`,
      [id],
    );

    const children = childrenResult.rows.map((row) => {
      const tasksTotal = parseInt(row.tasks_total || '0', 10);
      const tasksCompleted = parseInt(row.tasks_completed || '0', 10);
      return {
        id: row.id,
        name: row.name,
        tasksCompleted,
        tasksTotal,
        completionRate: tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0,
      };
    });

    return reply.send({
      household: {
        id: household.id,
        name: household.name,
        createdAt: toDateTimeString(household.created_at),
        updatedAt: toDateTimeString(household.updated_at),
      },
      weekSummary: {
        total,
        completed,
        pending,
        overdue,
        completionRate,
      },
      children,
    });
  } catch (error) {
    request.log.error(error, 'Failed to get household dashboard');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to retrieve dashboard data',
    });
  }
}

/**
 * GET /api/households/:id/members - Get household members
 * Returns list of all members in the household
 */
async function getHouseholdMembers(
  request: FastifyRequest<GetHouseholdRequest>,
  reply: FastifyReply,
) {
  const { householdId: id } = request.params;

  try {
    const result = await db.query(
      `SELECT
        u.id as user_id,
        u.email,
        hm.role,
        hm.joined_at
      FROM household_members hm
      JOIN users u ON hm.user_id = u.id
      WHERE hm.household_id = $1
      ORDER BY hm.role DESC, u.email ASC`,
      [id],
    );

    return reply.send(
      result.rows.map((row: unknown) => ({
        userId: (row as { user_id: string }).user_id,
        email: (row as { email: string }).email,
        displayName: null, // TODO: Add display_name column to users table
        role: (row as { role: string }).role,
        joinedAt: toDateTimeString((row as { joined_at: Date }).joined_at),
      })),
    );
  } catch (error) {
    request.log.error(error, 'Failed to get household members');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to retrieve household members',
    });
  }
}

/**
 * Register household routes
 */
export default async function householdRoutes(server: FastifyInstance) {
  // Define param schemas
  const HouseholdParamsSchema = z.object({ householdId: z.string().uuid() });

  // Create household
  server.post('/api/households', {
    schema: stripResponseValidation({
      summary: 'Create new household',
      description: 'Creates a household and assigns creator as admin',
      tags: ['households'],
      security: [{ bearerAuth: [] }],
      body: zodToOpenAPI(CreateHouseholdRequestSchema),
      response: {
        201: zodToOpenAPI(HouseholdSchema),
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser],
    handler: createHousehold,
  });

  // List user's households
  server.get('/api/households', {
    schema: stripResponseValidation({
      summary: 'List user households',
      description: 'Get all households the authenticated user is a member of',
      tags: ['households'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'array',
          items: zodToOpenAPI(HouseholdSchema),
        },
        ...CommonErrors.Unauthorized,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser],
    handler: listHouseholds,
  });

  // Get household details (member access)
  server.get('/api/households/:householdId', {
    schema: stripResponseValidation({
      summary: 'Get household details',
      description: 'Get details of a specific household',
      tags: ['households'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(HouseholdParamsSchema),
      response: {
        200: zodToOpenAPI(HouseholdSchema),
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership],
    handler: getHousehold,
  });

  // Update household (admin only)
  server.put('/api/households/:householdId', {
    schema: stripResponseValidation({
      summary: 'Update household',
      description: 'Update household details (admin only)',
      tags: ['households'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(HouseholdParamsSchema),
      body: zodToOpenAPI(UpdateHouseholdRequestSchema),
      response: {
        200: zodToOpenAPI(HouseholdSchema),
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdAdmin],
    handler: updateHousehold,
  });

  // Get household members (member access)
  server.get('/api/households/:householdId/members', {
    schema: stripResponseValidation({
      summary: 'List household members',
      description: 'Get all members of a household',
      tags: ['households'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(HouseholdParamsSchema),
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              displayName: { type: ['string', 'null'] },
              role: { type: 'string', enum: ['admin', 'parent', 'child'] },
              joinedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership],
    handler: getHouseholdMembers,
  });

  // Get household dashboard (member access)
  server.get('/api/households/:householdId/dashboard', {
    schema: stripResponseValidation({
      summary: 'Get household dashboard data',
      description: 'Get summary statistics for household dashboard',
      tags: ['households'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(HouseholdParamsSchema),
      response: {
        200: {
          type: 'object',
          properties: {
            household: zodToOpenAPI(HouseholdSchema),
            stats: {
              type: 'object',
              properties: {
                totalChildren: { type: 'integer' },
                activeTasks: { type: 'integer' },
                completedToday: { type: 'integer' },
                pointsEarnedThisWeek: { type: 'integer' },
              },
            },
            children: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  points_balance: { type: 'integer' },
                  tasks_completed_today: { type: 'integer' },
                },
              },
            },
          },
        },
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership],
    handler: getHouseholdDashboard,
  });
}
