/**
 * Child Schema - Household children management
 */
import { z } from 'zod';

/**
 * Base Child Schema
 * Represents a child within a household
 */
export const ChildSchema = z.object({
  id: z.string().uuid(),
  household_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  birthday: z.string().date().nullable(),
  avatar_url: z.string().url().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
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
  birthday: z.string().date().optional(),
  avatar_url: z.string().url().optional(),
});

export type CreateChildRequest = z.infer<typeof CreateChildRequestSchema>;

/**
 * Update Child Request
 * Used for updating child details (partial update)
 */
export const UpdateChildRequestSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  birthday: z.string().date().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
});

export type UpdateChildRequest = z.infer<typeof UpdateChildRequestSchema>;

/**
 * Child with Stats Response
 * Extended child info including task statistics
 */
export const ChildWithStatsSchema = ChildSchema.extend({
  total_tasks: z.number().int().nonnegative().optional(),
  completed_tasks: z.number().int().nonnegative().optional(),
  pending_tasks: z.number().int().nonnegative().optional(),
  total_points: z.number().int().nonnegative().optional(),
});

export type ChildWithStats = z.infer<typeof ChildWithStatsSchema>;
