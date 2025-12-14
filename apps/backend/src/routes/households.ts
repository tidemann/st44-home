import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database.js';
import { authenticateUser } from '../middleware/auth.js';

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
  const userId = request.user?.userId;

  if (!userId) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Invalid household ID format',
    });
  }

  try {
    // Check membership
    const membershipResult = await db.query(
      'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
      [id, userId],
    );

    if (membershipResult.rows.length === 0) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You do not have access to this household',
      });
    }

    const role = membershipResult.rows[0].role;

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
  const userId = request.user?.userId;

  if (!userId) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Invalid household ID format',
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
    // Check if user is household admin
    const membershipResult = await db.query(
      'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
      [id, userId],
    );

    if (membershipResult.rows.length === 0) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You do not have access to this household',
      });
    }

    const role = membershipResult.rows[0].role;

    if (role !== 'admin') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Only household admins can update settings',
      });
    }

    // Update household
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

  // Get household details
  server.get('/api/households/:id', {
    preHandler: [authenticateUser],
    handler: getHousehold,
  });

  // Update household
  server.put('/api/households/:id', {
    preHandler: [authenticateUser],
    handler: updateHousehold,
  });
}
