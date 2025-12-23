/**
 * Child Schema - Household children management
 */
import { z } from '../generators/openapi.generator.js';

/**
 * Base Child Schema
 * Represents a child within a household
 */
export const ChildSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  userId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Child type inferred from schema
 */
export type Child = z.infer<typeof ChildSchema>;

/**
 * Request Schemas
 */

/**
 * Create Child Request
 * Used when adding a new child to a household
 */
export const CreateChildRequestSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  avatarUrl: z.string().url().optional(),
});

export type CreateChildRequest = z.infer<typeof CreateChildRequestSchema>;

/**
 * Update Child Request
 * Used for updating child details (partial update)
 */
export const UpdateChildRequestSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export type UpdateChildRequest = z.infer<typeof UpdateChildRequestSchema>;

/**
 * Create Child User Account Request
 * Used when creating a user account for a child
 */
export const CreateChildUserAccountRequestSchema = z.object({
  childId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export type CreateChildUserAccountRequest = z.infer<typeof CreateChildUserAccountRequestSchema>;

/**
 * Link Child to User Request
 * Used when linking an existing child to a user account
 */
export const LinkChildToUserRequestSchema = z.object({
  userId: z.string().uuid(),
});

export type LinkChildToUserRequest = z.infer<typeof LinkChildToUserRequestSchema>;

/**
 * Child with Stats Response
 * Extended child info including task statistics
 */
export const ChildWithStatsSchema = ChildSchema.extend({
  totalTasks: z.number().int().nonnegative().optional(),
  completedTasks: z.number().int().nonnegative().optional(),
  pendingTasks: z.number().int().nonnegative().optional(),
  totalPoints: z.number().int().nonnegative().optional(),
});

export type ChildWithStats = z.infer<typeof ChildWithStatsSchema>;
