import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database.js';
import { authenticateUser } from '../middleware/auth.js';
import {
  validateHouseholdMembership,
  requireHouseholdAdmin,
} from '../middleware/household-membership.js';

interface CreateHouseholdRequest {
  Body: {
    name: string;
  };
}

interface GetHouseholdRequest {
  Params: {
    id: string;
  };
}

interface UpdateHouseholdRequest {
  Params: {
    id: string;
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
  const { name } = request.body;
  const userId = request.user?.userId;

  if (!userId) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  // Validate household name
  if (!name || name.trim().length === 0) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Household name is required',
    });
  }

  if (name.length > 100) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Household name must be 100 characters or less',
    });
  }

  try {
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
    await db.query('ROLLBACK');
    request.log.error(error, 'Failed to create household');
    return reply.status(500).send({
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
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  try {
    const result = await db.query(
      `SELECT 
        h.id, 
        h.name, 
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
    }));

    return reply.send({ households });
  } catch (error) {
    request.log.error(error, 'Failed to list households');
    return reply.status(500).send({
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
  const { id } = request.params;
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
      createdAt: household.created_at,
      updatedAt: household.updated_at,
    });
  } catch (error) {
    request.log.error(error, 'Failed to get household');
    return reply.status(500).send({
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
  const { id } = request.params;
  const { name } = request.body;

  // Validate household name
  if (!name || name.trim().length === 0) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Household name is required',
    });
  }

  if (name.length > 100) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Household name must be 100 characters or less',
    });
  }

  try {
    // Update household (middleware already validated admin role)
    const result = await db.query(
      'UPDATE households SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, updated_at',
      [name.trim(), id],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Household not found',
      });
    }

    const household = result.rows[0];

    return reply.send({
      id: household.id,
      name: household.name,
      updatedAt: household.updated_at,
    });
  } catch (error) {
    request.log.error(error, 'Failed to update household');
    return reply.status(500).send({
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
  const { id } = request.params;

  try {
    // Get household info
    const householdResult = await db.query('SELECT id, name FROM households WHERE id = $1', [id]);

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
        SUM(CASE WHEN status = 'pending' AND due_date >= CURRENT_DATE THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN 1 ELSE 0 END) as overdue
      FROM task_assignments
      WHERE household_id = $1 
        AND due_date >= date_trunc('week', CURRENT_DATE)
        AND due_date < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'`,
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
        AND ta.due_date >= date_trunc('week', CURRENT_DATE)
        AND ta.due_date < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
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
  const { id } = request.params;

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

    return reply.send({
      members: result.rows.map((row: unknown) => ({
        user_id: (row as { user_id: number }).user_id,
        email: (row as { email: string }).email,
        display_name: null, // TODO: Add display_name column to users table
        role: (row as { role: string }).role,
        joined_at: (row as { joined_at: Date }).joined_at,
      })),
    });
  } catch (error) {
    request.log.error(error, 'Failed to get household members');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to retrieve household members',
    });
  }
}

/**
 * Register household routes
 */
export default async function householdRoutes(server: FastifyInstance) {
  // Create household
  server.post('/api/households', {
    preHandler: [authenticateUser],
    handler: createHousehold,
  });

  // List user's households
  server.get('/api/households', {
    preHandler: [authenticateUser],
    handler: listHouseholds,
  });

  // Get household details (member access)
  server.get('/api/households/:id', {
    preHandler: [authenticateUser, validateHouseholdMembership],
    handler: getHousehold,
  });

  // Update household (admin only)
  server.put('/api/households/:id', {
    preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdAdmin],
    handler: updateHousehold,
  });

  // Get household members (member access)
  server.get('/api/households/:id/members', {
    preHandler: [authenticateUser, validateHouseholdMembership],
    handler: getHouseholdMembers,
  });

  // Get household dashboard (member access)
  server.get('/api/households/:id/dashboard', {
    preHandler: [authenticateUser, validateHouseholdMembership],
    handler: getHouseholdDashboard,
  });
}
