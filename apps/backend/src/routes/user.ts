import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database.js';
import { authenticateUser } from '../middleware/auth.js';
import { UpdateUserRequestSchema, UserProfileResponseSchema } from '@st44/types';
import { z, zodToOpenAPI, CommonErrors } from '@st44/types/generators';
import { validateRequest, handleZodError } from '../utils/validation.js';
import { stripResponseValidation } from '../schemas/common.js';
import bcrypt from 'bcrypt';

interface UpdateProfileRequest {
  Body: {
    name?: string;
    email?: string;
    password?: string;
  };
}

/**
 * GET /api/user/profile - Get current user's profile
 * Returns the authenticated user's profile data
 */
async function getProfile(request: FastifyRequest, reply: FastifyReply) {
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
      `SELECT id, email, name, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const user = result.rows[0];

    return reply.send({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.created_at?.toISOString?.() ?? user.created_at,
      updatedAt: user.updated_at?.toISOString?.() ?? user.updated_at,
    });
  } catch (error) {
    request.log.error(error, 'Failed to get user profile');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to retrieve user profile',
    });
  }
}

/**
 * PUT /api/user/profile - Update current user's profile
 * Updates the authenticated user's profile data
 */
async function updateProfile(request: FastifyRequest<UpdateProfileRequest>, reply: FastifyReply) {
  const userId = request.user?.userId;

  if (!userId) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  try {
    const validatedData = validateRequest(UpdateUserRequestSchema, request.body);

    // Check if there's anything to update
    if (Object.keys(validatedData).length === 0) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'No fields to update',
      });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (validatedData.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(validatedData.name);
    }

    if (validatedData.email !== undefined) {
      // Check if email is already in use by another user
      const emailCheck = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [
        validatedData.email,
        userId,
      ]);
      if (emailCheck.rows.length > 0) {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: 'Email is already in use',
        });
      }
      updates.push(`email = $${paramIndex++}`);
      values.push(validatedData.email);
    }

    if (validatedData.password !== undefined) {
      // Validate password strength
      const hasUpperCase = /[A-Z]/.test(validatedData.password);
      const hasLowerCase = /[a-z]/.test(validatedData.password);
      const hasNumber = /\d/.test(validatedData.password);
      if (validatedData.password.length < 8 || !hasUpperCase || !hasLowerCase || !hasNumber) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message:
            'Password must be at least 8 characters and contain uppercase, lowercase, and number',
        });
      }
      const passwordHash = await bcrypt.hash(validatedData.password, 12);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(passwordHash);
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);

    // Add userId for WHERE clause
    values.push(userId);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, name, created_at, updated_at
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const user = result.rows[0];

    return reply.send({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.created_at?.toISOString?.() ?? user.created_at,
      updatedAt: user.updated_at?.toISOString?.() ?? user.updated_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error, reply);
    }
    request.log.error(error, 'Failed to update user profile');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to update user profile',
    });
  }
}

// OpenAPI schemas
const getProfileSchema = stripResponseValidation({
  summary: 'Get user profile',
  description: 'Get the current authenticated user profile',
  tags: ['user'],
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      description: 'User profile retrieved successfully',
      ...zodToOpenAPI(UserProfileResponseSchema),
    },
    ...CommonErrors.Unauthorized,
    ...CommonErrors.NotFound,
    ...CommonErrors.InternalServerError,
  },
});

const updateProfileSchema = stripResponseValidation({
  summary: 'Update user profile',
  description: 'Update the current authenticated user profile',
  tags: ['user'],
  security: [{ bearerAuth: [] }],
  body: zodToOpenAPI(UpdateUserRequestSchema),
  response: {
    200: {
      description: 'User profile updated successfully',
      ...zodToOpenAPI(UserProfileResponseSchema),
    },
    ...CommonErrors.BadRequest,
    ...CommonErrors.Unauthorized,
    ...CommonErrors.NotFound,
    409: {
      description: 'Email already in use',
      type: 'object',
      properties: {
        statusCode: { type: 'number', enum: [409] },
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    ...CommonErrors.InternalServerError,
  },
});

export default async function userRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/user/profile - Get current user profile
  fastify.get('/api/user/profile', {
    preHandler: [authenticateUser],
    schema: getProfileSchema,
    handler: getProfile,
  });

  // PUT /api/user/profile - Update current user profile
  fastify.put('/api/user/profile', {
    preHandler: [authenticateUser],
    schema: updateProfileSchema,
    handler: updateProfile,
  });
}
