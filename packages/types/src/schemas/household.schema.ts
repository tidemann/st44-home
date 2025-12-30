/**
 * Household Schema - Multi-tenant household management
 */
import { z } from '../generators/openapi.generator.js';

/**
 * Base Household Schema
 * Represents a household (tenant) in the multi-tenant system
 */
export const HouseholdSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  adminUserId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Household type inferred from schema
 */
export type Household = z.infer<typeof HouseholdSchema>;

/**
 * Request Schemas
 */

/**
 * Create Household Request
 * Used when creating a new household
 */
export const CreateHouseholdRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .trim()
    .refine((val) => val.length > 0, {
      message: 'Name must not be empty after trimming whitespace',
    }),
});

export type CreateHouseholdRequest = z.infer<typeof CreateHouseholdRequestSchema>;

/**
 * Update Household Request
 * Used for updating household details
 */
export const UpdateHouseholdRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .trim()
    .refine((val) => val.length > 0, {
      message: 'Name must not be empty after trimming whitespace',
    }),
});

export type UpdateHouseholdRequest = z.infer<typeof UpdateHouseholdRequestSchema>;

/**
 * Household Member Schema
 * Represents a user's membership in a household (database entity)
 */
export const HouseholdMemberSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['parent', 'child']),
  joinedAt: z.string().datetime(),
});

export type HouseholdMember = z.infer<typeof HouseholdMemberSchema>;

/**
 * Household Member Response Schema
 * API response for GET /households/:id/members
 * Includes user info and task stats
 *
 * Note: email and joinedAt can be null for children without user accounts
 * (children created via "Add Child" that don't have login credentials)
 */
export const HouseholdMemberResponseSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email().nullable(), // null for unlinked children
  displayName: z.string().nullable(),
  role: z.enum(['admin', 'parent', 'child']),
  joinedAt: z.string().datetime().nullable(), // null for unlinked children
  tasksCompleted: z.number().int().nonnegative(),
  totalTasks: z.number().int().nonnegative(),
  points: z.number().int().nonnegative(),
});

export type HouseholdMemberResponse = z.infer<typeof HouseholdMemberResponseSchema>;

/**
 * Household with Members Response
 * Extended household info including member list
 */
export const HouseholdWithMembersSchema = HouseholdSchema.extend({
  members: z.array(HouseholdMemberSchema).optional(),
});

export type HouseholdWithMembers = z.infer<typeof HouseholdWithMembersSchema>;

/**
 * Invitation Schema
 * Represents an invitation to join a household
 */
export const InvitationSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  email: z.string().email(),
  token: z.string(),
  invitedByUserId: z.string().uuid(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type Invitation = z.infer<typeof InvitationSchema>;

/**
 * Create Invitation Request
 */
export const CreateInvitationRequestSchema = z.object({
  email: z.string().email(),
});

export type CreateInvitationRequest = z.infer<typeof CreateInvitationRequestSchema>;

/**
 * Accept Invitation Request
 */
export const AcceptInvitationRequestSchema = z.object({
  token: z.string().min(1),
});

export type AcceptInvitationRequest = z.infer<typeof AcceptInvitationRequestSchema>;
