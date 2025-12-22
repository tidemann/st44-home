/**
 * Assignment Schema - Task assignments to children
 */
import { z } from 'zod';
import { TaskRuleTypeSchema } from './task.schema.js';

/**
 * Assignment Status
 */
export const AssignmentStatusSchema = z.enum(['pending', 'completed']);

export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;

/**
 * Base Assignment Schema
 * Represents a task assignment to a child on a specific date
 */
export const AssignmentSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  rule_type: TaskRuleTypeSchema,
  child_id: z.string().uuid().nullable(),
  child_name: z.string().nullable(),
  date: z.string().date(),
  status: AssignmentStatusSchema,
  completed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});

/**
 * Assignment type inferred from schema
 */
export type Assignment = z.infer<typeof AssignmentSchema>;

/**
 * Assignment Filters Schema
 * Query parameters for filtering assignments
 */
export const AssignmentFiltersSchema = z.object({
  date: z.string().date().optional(),
  child_id: z.string().uuid().optional(),
  status: AssignmentStatusSchema.optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
});

export type AssignmentFilters = z.infer<typeof AssignmentFiltersSchema>;

/**
 * Request Schemas
 */

/**
 * Complete Assignment Request
 * Used when marking an assignment as complete
 */
export const CompleteAssignmentRequestSchema = z.object({
  completed_at: z.string().datetime().optional(),
});

export type CompleteAssignmentRequest = z.infer<typeof CompleteAssignmentRequestSchema>;

/**
 * Reassign Task Request
 * Used when reassigning a task to a different child
 */
export const ReassignTaskRequestSchema = z.object({
  child_id: z.string().uuid(),
});

export type ReassignTaskRequest = z.infer<typeof ReassignTaskRequestSchema>;

/**
 * Assignment with Points Response
 * Extended assignment info including points earned
 */
export const AssignmentWithPointsSchema = AssignmentSchema.extend({
  points: z.number().int().nonnegative().optional(),
});

export type AssignmentWithPoints = z.infer<typeof AssignmentWithPointsSchema>;
