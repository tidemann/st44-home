/**
 * Reward Schema - Points redemption system
 */
import { z } from '../generators/openapi.generator.js';

/**
 * Reward Redemption Status
 * Tracks the lifecycle of a reward redemption
 */
export const RewardRedemptionStatusSchema = z.enum([
  'pending',
  'approved',
  'fulfilled',
  'rejected',
]);

export type RewardRedemptionStatus = z.infer<typeof RewardRedemptionStatusSchema>;

/**
 * Reward Schema
 * Represents a reward that children can redeem with points
 */
export const RewardSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  pointsCost: z.number().int().min(1),
  quantity: z.number().int().min(0).nullable(), // null = unlimited
  active: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Reward = z.infer<typeof RewardSchema>;

/**
 * Reward Redemption Schema
 * Represents a child's redemption of a reward
 */
export const RewardRedemptionSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  rewardId: z.string().uuid(),
  childId: z.string().uuid(),
  pointsSpent: z.number().int().min(1),
  status: RewardRedemptionStatusSchema,
  redeemedAt: z.string().datetime(),
  fulfilledAt: z.string().datetime().nullable(),
});

export type RewardRedemption = z.infer<typeof RewardRedemptionSchema>;

/**
 * Child Points Balance
 * Calculated view of child's points
 */
export const ChildPointsBalanceSchema = z.object({
  childId: z.string().uuid(),
  householdId: z.string().uuid(),
  pointsEarned: z.number().int().min(0),
  pointsSpent: z.number().int().min(0),
  pointsBalance: z.number().int(),
});

export type ChildPointsBalance = z.infer<typeof ChildPointsBalanceSchema>;

/**
 * Request Schemas
 */

/**
 * Create Reward Request
 * Used when creating a new reward
 */
export const CreateRewardRequestSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  description: z.string().optional(),
  pointsCost: z.number().int().min(1),
  quantity: z.number().int().min(0).nullable().optional(), // null or undefined = unlimited
});

export type CreateRewardRequest = z.infer<typeof CreateRewardRequestSchema>;

/**
 * Update Reward Request
 * Used for updating reward (partial update)
 */
export const UpdateRewardRequestSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().nullable().optional(),
  pointsCost: z.number().int().min(1).optional(),
  quantity: z.number().int().min(0).nullable().optional(),
  active: z.boolean().optional(),
});

export type UpdateRewardRequest = z.infer<typeof UpdateRewardRequestSchema>;

/**
 * Redeem Reward Request
 * Used when a child redeems a reward
 */
export const RedeemRewardRequestSchema = z.object({
  rewardId: z.string().uuid(),
});

export type RedeemRewardRequest = z.infer<typeof RedeemRewardRequestSchema>;

/**
 * Update Redemption Status Request
 * Used by parents to approve/reject/fulfill redemptions
 */
export const UpdateRedemptionStatusRequestSchema = z.object({
  status: z.enum(['approved', 'fulfilled', 'rejected']),
});

export type UpdateRedemptionStatusRequest = z.infer<typeof UpdateRedemptionStatusRequestSchema>;

/**
 * Response Schemas
 */

/**
 * Child Rewards Response
 * Returns available rewards and child's points balance
 */
export const ChildRewardsResponseSchema = z.object({
  pointsBalance: z.number().int().min(0),
  rewards: z.array(
    RewardSchema.extend({
      available: z.boolean(), // false if quantity = 0
      canAfford: z.boolean(), // based on child's balance
    }),
  ),
});

export type ChildRewardsResponse = z.infer<typeof ChildRewardsResponseSchema>;

/**
 * Redeem Reward Response
 * Returns redemption details and new balance
 */
export const RedeemRewardResponseSchema = z.object({
  redemption: RewardRedemptionSchema,
  newBalance: z.number().int().min(0),
});

export type RedeemRewardResponse = z.infer<typeof RedeemRewardResponseSchema>;
