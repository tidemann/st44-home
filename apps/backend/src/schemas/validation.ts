/**
 * Common Zod validation schemas
 *
 * Reusable Zod schemas for common data types used across routes.
 * These provide consistent validation with clear error messages.
 */

import { z } from 'zod';

// ============================================================================
// UUID Validation
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * UUID schema with custom error messages
 */
export const uuidSchema = z
  .string()
  .regex(UUID_REGEX, { message: 'Invalid UUID format' })
  .describe('UUID in standard format');

/**
 * Optional UUID schema
 */
export const optionalUuidSchema = uuidSchema.optional();

/**
 * Array of UUIDs
 */
export const uuidArraySchema = z.array(uuidSchema);

// ============================================================================
// Date Validation
// ============================================================================

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Date string in YYYY-MM-DD format
 */
export const dateSchema = z
  .string()
  .regex(DATE_REGEX, { message: 'Date must be in YYYY-MM-DD format' })
  .refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: 'Invalid date' },
  )
  .describe('Date in YYYY-MM-DD format');

/**
 * Optional date schema
 */
export const optionalDateSchema = dateSchema.optional();

// ============================================================================
// Email Validation
// ============================================================================

/**
 * Email schema with trimming and lowercase transformation
 */
export const emailSchema = z
  .string()
  .email({ message: 'Invalid email format' })
  .transform((val) => val.trim().toLowerCase())
  .describe('Email address');

/**
 * Optional email schema
 */
export const optionalEmailSchema = emailSchema.optional();

// ============================================================================
// Pagination Validation
// ============================================================================

/**
 * Page number (1-based, positive integer)
 */
export const pageSchema = z.coerce
  .number()
  .int({ message: 'Page must be an integer' })
  .positive({ message: 'Page must be positive' })
  .default(1);

/**
 * Page size (positive integer, max 100)
 */
export const pageSizeSchema = z.coerce
  .number()
  .int({ message: 'Page size must be an integer' })
  .positive({ message: 'Page size must be positive' })
  .max(100, { message: 'Page size cannot exceed 100' })
  .default(20);

/**
 * Standard pagination query params
 */
export const paginationSchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
});

// ============================================================================
// Common Route Params
// ============================================================================

/**
 * Household ID param (used in most routes)
 */
export const householdIdParamSchema = z.object({
  householdId: uuidSchema,
});

/**
 * Household + Task ID params
 */
export const householdTaskParamsSchema = z.object({
  householdId: uuidSchema,
  taskId: uuidSchema,
});

/**
 * Household + Child ID params
 */
export const householdChildParamsSchema = z.object({
  householdId: uuidSchema,
  childId: uuidSchema,
});

/**
 * Household + Assignment ID params
 */
export const householdAssignmentParamsSchema = z.object({
  householdId: uuidSchema,
  assignmentId: uuidSchema,
});

/**
 * Household + Reward ID params
 */
export const householdRewardParamsSchema = z.object({
  householdId: uuidSchema,
  rewardId: uuidSchema,
});

// ============================================================================
// Assignment-related Schemas
// ============================================================================

/**
 * Assignment status
 */
export const assignmentStatusSchema = z.enum(['pending', 'completed', 'overdue'], {
  message: 'Status must be pending, completed, or overdue',
});

/**
 * Days count for assignment generation (1-365)
 */
export const daysSchema = z.coerce
  .number()
  .int({ message: 'Days must be an integer' })
  .min(1, { message: 'Days must be at least 1' })
  .max(365, { message: 'Days cannot exceed 365' });

/**
 * Generate assignments request body
 */
export const generateAssignmentsBodySchema = z.object({
  householdId: uuidSchema,
  startDate: dateSchema,
  days: daysSchema,
});

/**
 * View assignments query params
 */
export const viewAssignmentsQuerySchema = z.object({
  date: optionalDateSchema,
  days: z.coerce.number().int().positive().max(30).optional(),
  status: assignmentStatusSchema.optional(),
  childId: optionalUuidSchema,
});

/**
 * Create manual assignment request body
 */
export const createManualAssignmentBodySchema = z.object({
  taskId: uuidSchema,
  childId: uuidSchema.nullable(),
  date: dateSchema,
});

/**
 * Reassign assignment request body
 */
export const reassignAssignmentBodySchema = z.object({
  childId: uuidSchema,
});

// ============================================================================
// Role Validation
// ============================================================================

/**
 * Household member role
 */
export const householdRoleSchema = z.enum(['admin', 'parent', 'child'], {
  message: 'Role must be admin, parent, or child',
});

/**
 * Invitation role (admin or parent only)
 */
export const invitationRoleSchema = z.enum(['admin', 'parent'], {
  message: 'Role must be admin or parent',
});

// ============================================================================
// Type Exports
// ============================================================================

export type UUID = z.infer<typeof uuidSchema>;
export type DateString = z.infer<typeof dateSchema>;
export type Email = z.infer<typeof emailSchema>;
export type AssignmentStatus = z.infer<typeof assignmentStatusSchema>;
export type HouseholdRole = z.infer<typeof householdRoleSchema>;
export type InvitationRole = z.infer<typeof invitationRoleSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type GenerateAssignmentsBody = z.infer<typeof generateAssignmentsBodySchema>;
export type ViewAssignmentsQuery = z.infer<typeof viewAssignmentsQuerySchema>;
export type CreateManualAssignmentBody = z.infer<typeof createManualAssignmentBodySchema>;
export type ReassignAssignmentBody = z.infer<typeof reassignAssignmentBodySchema>;
