/**
 * Household Schema - Multi-tenant household management
 */
import { z } from 'zod';

/**
 * Base Household Schema
 * Represents a household (tenant) in the multi-tenant system
 */
export const HouseholdSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  admin_user_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
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
  name: z.string().min(1).max(255).trim(),
});

export type CreateHouseholdRequest = z.infer<typeof CreateHouseholdRequestSchema>;

/**
 * Update Household Request
 * Used for updating household details
 */
export const UpdateHouseholdRequestSchema = z.object({
  name: z.string().min(1).max(255).trim(),
});

export type UpdateHouseholdRequest = z.infer<typeof UpdateHouseholdRequestSchema>;

/**
 * Household Member Schema
 * Represents a user's membership in a household
 */
export const HouseholdMemberSchema = z.object({
  id: z.string().uuid(),
  household_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(['parent', 'child']),
  joined_at: z.string().datetime(),
});

export type HouseholdMember = z.infer<typeof HouseholdMemberSchema>;

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
  household_id: z.string().uuid(),
  email: z.string().email(),
  token: z.string(),
  invited_by_user_id: z.string().uuid(),
  expires_at: z.string().datetime(),
  created_at: z.string().datetime(),
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
