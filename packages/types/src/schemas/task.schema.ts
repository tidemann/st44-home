/**
 * Task Schema - Task templates and rules
 */
import { z } from 'zod';

/**
 * Task Rule Types
 * Defines how tasks are assigned to children
 */
export const TaskRuleTypeSchema = z.enum(['daily', 'repeating', 'weekly_rotation']);

export type TaskRuleType = z.infer<typeof TaskRuleTypeSchema>;

/**
 * Task Rule Configuration
 * Additional configuration for task rules
 */
export const TaskRuleConfigSchema = z
  .object({
    // For weekly_rotation: odd_even_week or alternating
    rotation_type: z.enum(['odd_even_week', 'alternating']).optional(),
    
    // For repeating: days of week (0=Sunday, 6=Saturday)
    repeat_days: z.array(z.number().int().min(0).max(6)).optional(),
    
    // For weekly_rotation: children assigned to the task
    assigned_children: z.array(z.string().uuid()).optional(),
  })
  .nullable();

export type TaskRuleConfig = z.infer<typeof TaskRuleConfigSchema>;

/**
 * Base Task Schema
 * Represents a task template in a household
 */
export const TaskSchema = z.object({
  id: z.string().uuid(),
  household_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  points: z.number().int().min(0).max(1000),
  rule_type: TaskRuleTypeSchema,
  rule_config: TaskRuleConfigSchema,
  active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Task type inferred from schema
 */
export type Task = z.infer<typeof TaskSchema>;

/**
 * Request Schemas
 */

/**
 * Create Task Request
 * Used when creating a new task template
 */
export const CreateTaskRequestSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  description: z.string().optional(),
  points: z.number().int().min(0).max(1000).default(0),
  rule_type: TaskRuleTypeSchema,
  rule_config: TaskRuleConfigSchema.optional(),
});

export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;

/**
 * Update Task Request
 * Used for updating task template (partial update)
 */
export const UpdateTaskRequestSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().nullable().optional(),
  points: z.number().int().min(0).max(1000).optional(),
  rule_type: TaskRuleTypeSchema.optional(),
  rule_config: TaskRuleConfigSchema.optional(),
  active: z.boolean().optional(),
});

export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;

/**
 * Generate Assignments Request
 * Used when triggering assignment generation
 */
export const GenerateAssignmentsRequestSchema = z.object({
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
});

export type GenerateAssignmentsRequest = z.infer<typeof GenerateAssignmentsRequestSchema>;
