/**
 * Assignment Schema - Task assignments to children
 */
import { z } from '../generators/openapi.generator.js';
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
  taskId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  ruleType: TaskRuleTypeSchema,
  childId: z.string().uuid().nullable(),
  childName: z.string().nullable(),
  date: z.string().date(),
  status: AssignmentStatusSchema,
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
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
  childId: z.string().uuid().optional(),
  status: AssignmentStatusSchema.optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
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
  completedAt: z.string().datetime().optional(),
});

export type CompleteAssignmentRequest = z.infer<typeof CompleteAssignmentRequestSchema>;

/**
 * Reassign Task Request
 * Used when reassigning a task to a different child
 */
export const ReassignTaskRequestSchema = z.object({
  childId: z.string().uuid(),
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
