import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  RewardSchema,
  CreateRewardRequestSchema,
  UpdateRewardRequestSchema,
  RewardRedemptionSchema,
  ChildRewardsResponseSchema,
  RedeemRewardResponseSchema,
  UpdateRedemptionStatusRequestSchema,
  type Reward,
  type RewardRedemption,
  type ChildPointsBalance,
} from '@st44/types';
import { z, zodToOpenAPI, CommonErrors } from '@st44/types/generators';
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

interface RewardParams extends HouseholdParams {
  rewardId: string;
}

interface RedemptionParams extends HouseholdParams {
  redemptionId: string;
}

interface ListRewardsRequest {
  Params: HouseholdParams;
  Querystring: {
    active?: string;
  };
}

function toDateTimeString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date(String(value)).toISOString();
}

function mapRewardRowToReward(row: any): Reward {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    description: row.description,
    pointsCost: row.points_cost,
    quantity: row.quantity,
    active: row.active !== false,
    createdAt: toDateTimeString(row.created_at),
    updatedAt: toDateTimeString(row.updated_at),
  };
}

function mapRedemptionRowToRedemption(row: any): RewardRedemption {
  return {
    id: row.id,
    householdId: row.household_id,
    rewardId: row.reward_id,
    childId: row.child_id,
    pointsSpent: row.points_spent,
    status: row.status,
    redeemedAt: toDateTimeString(row.redeemed_at),
    fulfilledAt: row.fulfilled_at ? toDateTimeString(row.fulfilled_at) : null,
  };
}

/**
 * POST /api/households/:householdId/rewards - Create reward
 * Requires parent or admin role
 */
async function createReward(
  request: FastifyRequest<{ Params: HouseholdParams; Body: any }>,
  reply: FastifyReply,
) {
  const { householdId } = request.params;

  try {
    const validatedData = validateRequest(CreateRewardRequestSchema, request.body);
    const { name, description, pointsCost, quantity } = validatedData;

    const result = await db.query(
      `INSERT INTO rewards (household_id, name, description, points_cost, quantity)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [householdId, name.trim(), description || null, pointsCost, quantity ?? null],
    );

    return reply.status(201).send(mapRewardRowToReward(result.rows[0]));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error, reply);
    }

    request.log.error(error, 'Failed to create reward');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to create reward',
    });
  }
}

/**
 * GET /api/households/:householdId/rewards - List all household rewards
 * Supports ?active=true/false filter
 */
async function listRewards(request: FastifyRequest<ListRewardsRequest>, reply: FastifyReply) {
  const { householdId } = request.params;
  const { active } = request.query;

  try {
    let query = 'SELECT * FROM rewards WHERE household_id = $1';
    const params: (string | boolean)[] = [householdId];

    if (active !== undefined) {
      const activeBoolean = active === 'true';
      query += ' AND active = $2';
      params.push(activeBoolean);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);

    return reply.send({ rewards: result.rows.map(mapRewardRowToReward) });
  } catch (error) {
    request.log.error(error, 'Failed to list rewards');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to retrieve rewards',
    });
  }
}

/**
 * GET /api/households/:householdId/rewards/:rewardId - Get reward details
 */
async function getReward(request: FastifyRequest<{ Params: RewardParams }>, reply: FastifyReply) {
  const { householdId, rewardId } = request.params;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(rewardId)) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid reward ID format',
    });
  }

  try {
    const result = await db.query('SELECT * FROM rewards WHERE id = $1 AND household_id = $2', [
      rewardId,
      householdId,
    ]);

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Reward not found',
      });
    }

    return reply.send(mapRewardRowToReward(result.rows[0]));
  } catch (error) {
    request.log.error(error, 'Failed to get reward');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to retrieve reward',
    });
  }
}

/**
 * PUT /api/households/:householdId/rewards/:rewardId - Update reward
 * Requires parent or admin role
 */
async function updateReward(
  request: FastifyRequest<{ Params: RewardParams; Body: any }>,
  reply: FastifyReply,
) {
  const { householdId, rewardId } = request.params;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(rewardId)) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid reward ID format',
    });
  }

  try {
    const validatedData = validateRequest(UpdateRewardRequestSchema, request.body);
    const { name, description, pointsCost, quantity, active } = validatedData;

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
    if (pointsCost !== undefined) {
      updates.push(`points_cost = $${paramIndex++}`);
      values.push(pointsCost);
    }
    if (quantity !== undefined) {
      updates.push(`quantity = $${paramIndex++}`);
      values.push(quantity);
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
    values.push(rewardId, householdId);

    const query = `
      UPDATE rewards
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND household_id = $${paramIndex++}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Reward not found in this household',
      });
    }

    return reply.send(mapRewardRowToReward(result.rows[0]));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error, reply);
    }

    request.log.error(error, 'Failed to update reward');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to update reward',
    });
  }
}

/**
 * DELETE /api/households/:householdId/rewards/:rewardId - Soft delete reward
 * Requires parent or admin role
 * Sets active=false instead of deleting record
 */
async function deleteReward(
  request: FastifyRequest<{ Params: RewardParams }>,
  reply: FastifyReply,
) {
  const { householdId, rewardId } = request.params;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(rewardId)) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid reward ID format',
    });
  }

  try {
    const result = await db.query(
      `UPDATE rewards
       SET active = false, updated_at = NOW()
       WHERE id = $1 AND household_id = $2
       RETURNING id`,
      [rewardId, householdId],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Reward not found in this household',
      });
    }

    return reply.send({
      success: true,
      message: 'Reward deleted successfully',
    });
  } catch (error) {
    request.log.error(error, 'Failed to delete reward');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to delete reward',
    });
  }
}

/**
 * GET /api/children/me/rewards - Get available rewards and points balance for current child
 */
async function getChildRewards(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Get child from request (set by auth middleware)
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Get child record for this user
    const childResult = await db.query('SELECT id, household_id FROM children WHERE user_id = $1', [
      userId,
    ]);

    if (childResult.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Child profile not found for this user',
      });
    }

    const child = childResult.rows[0];
    const childId = child.id;
    const householdId = child.household_id;

    // Get points balance
    const balanceResult = await db.query(
      'SELECT points_balance FROM child_points_balance WHERE child_id = $1',
      [childId],
    );

    const pointsBalance = balanceResult.rows[0]?.points_balance || 0;

    // Get active rewards
    const rewardsResult = await db.query(
      'SELECT * FROM rewards WHERE household_id = $1 AND active = true ORDER BY points_cost ASC',
      [householdId],
    );

    const rewards = rewardsResult.rows.map((row) => {
      const reward = mapRewardRowToReward(row);
      return {
        ...reward,
        available: reward.quantity === null || reward.quantity > 0,
        canAfford: pointsBalance >= reward.pointsCost,
      };
    });

    return reply.send({
      pointsBalance,
      rewards,
    });
  } catch (error) {
    request.log.error(error, 'Failed to get child rewards');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to retrieve rewards',
    });
  }
}

/**
 * POST /api/children/me/rewards/:rewardId/redeem - Redeem a reward
 */
async function redeemReward(
  request: FastifyRequest<{ Params: { rewardId: string } }>,
  reply: FastifyReply,
) {
  const { rewardId } = request.params;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(rewardId)) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid reward ID format',
    });
  }

  try {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Get child record
    const childResult = await db.query('SELECT id, household_id FROM children WHERE user_id = $1', [
      userId,
    ]);

    if (childResult.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Child profile not found for this user',
      });
    }

    const child = childResult.rows[0];
    const childId = child.id;
    const householdId = child.household_id;

    // Start transaction
    await db.query('BEGIN');

    try {
      // Get reward with row lock
      const rewardResult = await db.query(
        'SELECT * FROM rewards WHERE id = $1 AND household_id = $2 AND active = true FOR UPDATE',
        [rewardId, householdId],
      );

      if (rewardResult.rows.length === 0) {
        await db.query('ROLLBACK');
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Reward not found or not active',
        });
      }

      const reward = rewardResult.rows[0];

      // Check quantity
      if (reward.quantity !== null && reward.quantity <= 0) {
        await db.query('ROLLBACK');
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Reward is out of stock',
        });
      }

      // Get points balance
      const balanceResult = await db.query(
        'SELECT points_balance FROM child_points_balance WHERE child_id = $1',
        [childId],
      );

      const pointsBalance = balanceResult.rows[0]?.points_balance || 0;

      // Check if child can afford
      if (pointsBalance < reward.points_cost) {
        await db.query('ROLLBACK');
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Insufficient points',
          details: {
            required: reward.points_cost,
            available: pointsBalance,
          },
        });
      }

      // Create redemption
      const redemptionResult = await db.query(
        `INSERT INTO reward_redemptions (household_id, reward_id, child_id, points_spent, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
        [householdId, rewardId, childId, reward.points_cost],
      );

      // Decrease quantity if not unlimited
      if (reward.quantity !== null) {
        await db.query('UPDATE rewards SET quantity = quantity - 1 WHERE id = $1', [rewardId]);
      }

      await db.query('COMMIT');

      // Get new balance
      const newBalanceResult = await db.query(
        'SELECT points_balance FROM child_points_balance WHERE child_id = $1',
        [childId],
      );

      const newBalance = newBalanceResult.rows[0]?.points_balance || 0;

      return reply.status(201).send({
        redemption: mapRedemptionRowToRedemption(redemptionResult.rows[0]),
        newBalance,
      });
    } catch (txError) {
      await db.query('ROLLBACK');
      throw txError;
    }
  } catch (error) {
    request.log.error(error, 'Failed to redeem reward');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to redeem reward',
    });
  }
}

/**
 * GET /api/households/:householdId/redemptions - List redemptions for household
 * Supports ?status=pending filter
 */
async function listRedemptions(
  request: FastifyRequest<{
    Params: HouseholdParams;
    Querystring: { status?: string };
  }>,
  reply: FastifyReply,
) {
  const { householdId } = request.params;
  const { status } = request.query;

  try {
    let query = `
      SELECT rr.*, r.name as reward_name, c.name as child_name
      FROM reward_redemptions rr
      JOIN rewards r ON rr.reward_id = r.id
      JOIN children c ON rr.child_id = c.id
      WHERE rr.household_id = $1
    `;
    const params: string[] = [householdId];

    if (status) {
      query += ' AND rr.status = $2';
      params.push(status);
    }

    query += ' ORDER BY rr.redeemed_at DESC';

    const result = await db.query(query, params);

    const redemptions = result.rows.map((row) => ({
      ...mapRedemptionRowToRedemption(row),
      rewardName: row.reward_name,
      childName: row.child_name,
    }));

    return reply.send({ redemptions });
  } catch (error) {
    request.log.error(error, 'Failed to list redemptions');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to retrieve redemptions',
    });
  }
}

/**
 * POST /api/households/:householdId/redemptions/:redemptionId/approve - Approve redemption
 */
async function approveRedemption(
  request: FastifyRequest<{ Params: RedemptionParams }>,
  reply: FastifyReply,
) {
  return updateRedemptionStatus(request, reply, 'approved');
}

/**
 * POST /api/households/:householdId/redemptions/:redemptionId/fulfill - Fulfill redemption
 */
async function fulfillRedemption(
  request: FastifyRequest<{ Params: RedemptionParams }>,
  reply: FastifyReply,
) {
  return updateRedemptionStatus(request, reply, 'fulfilled');
}

/**
 * POST /api/households/:householdId/redemptions/:redemptionId/reject - Reject redemption
 */
async function rejectRedemption(
  request: FastifyRequest<{ Params: RedemptionParams }>,
  reply: FastifyReply,
) {
  return updateRedemptionStatus(request, reply, 'rejected');
}

/**
 * Helper to update redemption status
 */
async function updateRedemptionStatus(
  request: FastifyRequest<{ Params: RedemptionParams }>,
  reply: FastifyReply,
  status: 'approved' | 'fulfilled' | 'rejected',
) {
  const { householdId, redemptionId } = request.params;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(redemptionId)) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid redemption ID format',
    });
  }

  try {
    await db.query('BEGIN');

    try {
      // Get current redemption
      const currentResult = await db.query(
        'SELECT * FROM reward_redemptions WHERE id = $1 AND household_id = $2 FOR UPDATE',
        [redemptionId, householdId],
      );

      if (currentResult.rows.length === 0) {
        await db.query('ROLLBACK');
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Redemption not found',
        });
      }

      const current = currentResult.rows[0];

      // If rejecting, restore quantity and refund points
      if (status === 'rejected' && current.status !== 'rejected') {
        // Restore reward quantity
        await db.query(
          'UPDATE rewards SET quantity = COALESCE(quantity, 0) + 1 WHERE id = $1 AND quantity IS NOT NULL',
          [current.reward_id],
        );
      }

      // Update status
      const updateQuery =
        status === 'fulfilled'
          ? 'UPDATE reward_redemptions SET status = $1, fulfilled_at = NOW() WHERE id = $2 AND household_id = $3 RETURNING *'
          : 'UPDATE reward_redemptions SET status = $1 WHERE id = $2 AND household_id = $3 RETURNING *';

      const result = await db.query(updateQuery, [status, redemptionId, householdId]);

      await db.query('COMMIT');

      return reply.send(mapRedemptionRowToRedemption(result.rows[0]));
    } catch (txError) {
      await db.query('ROLLBACK');
      throw txError;
    }
  } catch (error) {
    request.log.error(error, 'Failed to update redemption status');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to update redemption status',
    });
  }
}

/**
 * Register reward routes
 */
export default async function rewardRoutes(server: FastifyInstance) {
  const HouseholdParamsSchema = z.object({ householdId: z.string().uuid() });
  const RewardParamsSchema = z.object({
    householdId: z.string().uuid(),
    rewardId: z.string().uuid(),
  });
  const RedemptionParamsSchema = z.object({
    householdId: z.string().uuid(),
    redemptionId: z.string().uuid(),
  });
  const ChildRewardParamsSchema = z.object({ rewardId: z.string().uuid() });
  const QuerySchema = z.object({ active: z.enum(['true', 'false']).optional() });
  const StatusQuerySchema = z.object({ status: z.string().optional() });

  // Household rewards management (parent/admin)
  server.post('/api/households/:householdId/rewards', {
    schema: stripResponseValidation({
      summary: 'Create new reward',
      description: 'Create a reward that children can redeem with points',
      tags: ['rewards'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(HouseholdParamsSchema),
      body: zodToOpenAPI(CreateRewardRequestSchema),
      response: {
        201: zodToOpenAPI(RewardSchema, { description: 'Reward created successfully' }),
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent],
    handler: createReward,
  });

  server.get('/api/households/:householdId/rewards', {
    schema: stripResponseValidation({
      summary: 'List all rewards for household',
      description: 'Get all rewards, optionally filtered by active status',
      tags: ['rewards'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(HouseholdParamsSchema),
      querystring: zodToOpenAPI(QuerySchema),
      response: {
        200: zodToOpenAPI(z.object({ rewards: z.array(RewardSchema) })),
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership],
    handler: listRewards,
  });

  server.get('/api/households/:householdId/rewards/:rewardId', {
    schema: stripResponseValidation({
      summary: 'Get reward details',
      description: 'Get a single reward by ID',
      tags: ['rewards'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(RewardParamsSchema),
      response: {
        200: zodToOpenAPI(RewardSchema),
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership],
    handler: getReward,
  });

  server.put('/api/households/:householdId/rewards/:rewardId', {
    schema: stripResponseValidation({
      summary: 'Update reward',
      description: 'Update reward properties',
      tags: ['rewards'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(RewardParamsSchema),
      body: zodToOpenAPI(UpdateRewardRequestSchema),
      response: {
        200: zodToOpenAPI(RewardSchema, { description: 'Reward updated successfully' }),
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent],
    handler: updateReward,
  });

  server.delete('/api/households/:householdId/rewards/:rewardId', {
    schema: stripResponseValidation({
      summary: 'Delete reward',
      description: 'Soft delete a reward (sets active to false)',
      tags: ['rewards'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(RewardParamsSchema),
      response: {
        200: {
          description: 'Reward deleted successfully',
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
    handler: deleteReward,
  });

  // Child rewards endpoints
  server.get('/api/children/me/rewards', {
    schema: stripResponseValidation({
      summary: 'Get available rewards and points balance',
      description: 'Returns available rewards and current points balance for authenticated child',
      tags: ['rewards', 'children'],
      security: [{ bearerAuth: [] }],
      response: {
        200: zodToOpenAPI(ChildRewardsResponseSchema),
        ...CommonErrors.Unauthorized,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser],
    handler: getChildRewards,
  });

  server.post('/api/children/me/rewards/:rewardId/redeem', {
    schema: stripResponseValidation({
      summary: 'Redeem a reward',
      description: 'Redeem a reward with points (if child has enough points)',
      tags: ['rewards', 'children'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(ChildRewardParamsSchema),
      response: {
        201: zodToOpenAPI(RedeemRewardResponseSchema, {
          description: 'Reward redeemed successfully',
        }),
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser],
    handler: redeemReward,
  });

  // Parent redemption management
  server.get('/api/households/:householdId/redemptions', {
    schema: stripResponseValidation({
      summary: 'List redemptions for household',
      description: 'Get all redemptions, optionally filtered by status',
      tags: ['rewards'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(HouseholdParamsSchema),
      querystring: zodToOpenAPI(StatusQuerySchema),
      response: {
        200: {
          description: 'List of redemptions',
          type: 'object',
          properties: {
            redemptions: {
              type: 'array',
              items: zodToOpenAPI(RewardRedemptionSchema),
            },
          },
        },
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent],
    handler: listRedemptions,
  });

  server.post('/api/households/:householdId/redemptions/:redemptionId/approve', {
    schema: stripResponseValidation({
      summary: 'Approve redemption',
      description: 'Approve a pending redemption',
      tags: ['rewards'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(RedemptionParamsSchema),
      response: {
        200: zodToOpenAPI(RewardRedemptionSchema),
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent],
    handler: approveRedemption,
  });

  server.post('/api/households/:householdId/redemptions/:redemptionId/fulfill', {
    schema: stripResponseValidation({
      summary: 'Fulfill redemption',
      description: 'Mark redemption as fulfilled (delivered to child)',
      tags: ['rewards'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(RedemptionParamsSchema),
      response: {
        200: zodToOpenAPI(RewardRedemptionSchema),
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent],
    handler: fulfillRedemption,
  });

  server.post('/api/households/:householdId/redemptions/:redemptionId/reject', {
    schema: stripResponseValidation({
      summary: 'Reject redemption',
      description: 'Reject a redemption (refunds points to child)',
      tags: ['rewards'],
      security: [{ bearerAuth: [] }],
      params: zodToOpenAPI(RedemptionParamsSchema),
      response: {
        200: zodToOpenAPI(RewardRedemptionSchema),
        ...CommonErrors.BadRequest,
        ...CommonErrors.Unauthorized,
        ...CommonErrors.Forbidden,
        ...CommonErrors.NotFound,
        ...CommonErrors.InternalServerError,
      },
    }),
    preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent],
    handler: rejectRedemption,
  });
}
