import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database.js';
import { authenticateUser } from '../middleware/auth.js';
import {
  validateHouseholdMembership,
  requireHouseholdParent,
  requireHouseholdAdmin,
} from '../middleware/household-membership.js';
import {
  listChildrenSchema,
  createChildSchema,
  updateChildSchema,
  deleteChildSchema,
} from '../schemas/children.js';

interface HouseholdParams {
  householdId: string;
}

interface ChildParams extends HouseholdParams {
  id: string;
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
      `SELECT id, name, birth_year, created_at, updated_at
       FROM children
       WHERE household_id = $1
       ORDER BY name ASC`,
      [householdId],
    );

    const children = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      birthYear: row.birth_year,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return reply.send({ children });
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
  const { name, birthYear } = request.body;

  // Validate name
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Child name is required',
    });
  }

  if (name.trim().length > 100) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Child name must be 100 characters or less',
    });
  }

  // Validate birthYear
  if (!birthYear || typeof birthYear !== 'number') {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Birth year is required and must be a number',
    });
  }

  const currentYear = new Date().getFullYear();
  if (birthYear < 1900 || birthYear > currentYear) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: `Birth year must be between 1900 and ${currentYear}`,
    });
  }

  try {
    const result = await db.query(
      `INSERT INTO children (household_id, name, birth_year)
       VALUES ($1, $2, $3)
       RETURNING id, name, birth_year, created_at`,
      [householdId, name.trim(), birthYear],
    );

    const child = result.rows[0];

    return reply.status(201).send({
      id: child.id,
      name: child.name,
      birthYear: child.birth_year,
      createdAt: child.created_at,
    });
  } catch (error) {
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
  const { householdId, id } = request.params;
  const { name, birthYear } = request.body;

  // Validate name
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Child name is required',
    });
  }

  if (name.trim().length > 100) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Child name must be 100 characters or less',
    });
  }

  // Validate birthYear
  if (!birthYear || typeof birthYear !== 'number') {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Birth year is required and must be a number',
    });
  }

  const currentYear = new Date().getFullYear();
  if (birthYear < 1900 || birthYear > currentYear) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: `Birth year must be between 1900 and ${currentYear}`,
    });
  }

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
      `UPDATE children
       SET name = $1, birth_year = $2, updated_at = NOW()
       WHERE id = $3 AND household_id = $4
       RETURNING id, name, birth_year, updated_at`,
      [name.trim(), birthYear, id, householdId],
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
      name: child.name,
      birthYear: child.birth_year,
      updatedAt: child.updated_at,
    });
  } catch (error) {
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
  const { householdId, id } = request.params;

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

/**
 * Register children routes
 */
export default async function childrenRoutes(server: FastifyInstance) {
  // List children (member access)
  server.get('/api/households/:householdId/children', {
    schema: listChildrenSchema,
    preHandler: [authenticateUser, validateHouseholdMembership],
    handler: listChildren,
  });

  // Create child (parent/admin access)
  server.post('/api/households/:householdId/children', {
    schema: createChildSchema,
    preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent],
    handler: createChild,
  });

  // Update child (parent/admin access)
  server.put('/api/households/:householdId/children/:id', {
    schema: updateChildSchema,
    preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent],
    handler: updateChild,
  });

  // Delete child (admin only)
  server.delete('/api/households/:householdId/children/:id', {
    schema: deleteChildSchema,
    preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdAdmin],
    handler: deleteChild,
  });
}
