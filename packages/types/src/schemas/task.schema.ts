/**
 * Task Schema - Task templates and rules
 */
import { z } from '../generators/openapi.generator.js';

/**
 * Task Rule Types
 * Defines how tasks are assigned to children
 */
export const TaskRuleTypeSchema = z.enum(['daily', 'repeating', 'weekly_rotation', 'single']);

export type TaskRuleType = z.infer<typeof TaskRuleTypeSchema>;

/**
 * Task Rule Configuration
 * Additional configuration for task rules
 */
export const TaskRuleConfigSchema = z
  .object({
    // For weekly_rotation: odd_even_week or alternating
    rotationType: z.enum(['odd_even_week', 'alternating']).optional(),
    
    // For repeating: days of week (0=Sunday, 6=Saturday)
    repeatDays: z.array(z.number().int().min(0).max(6)).optional(),
    
    // For weekly_rotation: children assigned to the task
    assignedChildren: z.array(z.string().uuid()).optional(),
  })
  .nullable();

export type TaskRuleConfig = z.infer<typeof TaskRuleConfigSchema>;

/**
 * Base Task Schema
 * Represents a task template in a household
 */
export const TaskSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  points: z.number().int().min(0).max(1000),
  ruleType: TaskRuleTypeSchema,
  ruleConfig: TaskRuleConfigSchema,
  deadline: z.string().datetime().nullable().optional(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
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
  points: z.number().int().min(0).max(1000).default(10),
  ruleType: TaskRuleTypeSchema,
  ruleConfig: TaskRuleConfigSchema.optional(),
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
  ruleType: TaskRuleTypeSchema.optional(),
  ruleConfig: TaskRuleConfigSchema.optional(),
  active: z.boolean().optional(),
});

export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;

/**
 * Generate Assignments Request
 * Used when triggering assignment generation
 */
export const GenerateAssignmentsRequestSchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

export type GenerateAssignmentsRequest = z.infer<typeof GenerateAssignmentsRequestSchema>;

/**
 * Task Candidate Schema
 * Represents a child who is eligible to accept a single task
 */
export const TaskCandidateSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  childId: z.string().uuid(),
  householdId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export type TaskCandidate = z.infer<typeof TaskCandidateSchema>;

/**
 * Task Response Schema
 * Represents a child's response to a single task (accept/decline)
 */
export const TaskResponseSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  childId: z.string().uuid(),
  householdId: z.string().uuid(),
  response: z.enum(['accepted', 'declined']),
  respondedAt: z.string().datetime(),
});

export type TaskResponse = z.infer<typeof TaskResponseSchema>;

/**
 * Available Single Task Schema
 * Enriched task data showing availability status to a child
 */
export const AvailableSingleTaskSchema = TaskSchema.extend({
  candidateCount: z.number().int().min(0),
  declineCount: z.number().int().min(0),
  hasDeadline: z.boolean(),
  daysUntilDeadline: z.number().int().nullable(),
});

export type AvailableSingleTask = z.infer<typeof AvailableSingleTaskSchema>;
