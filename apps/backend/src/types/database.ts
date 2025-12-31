/**
 * Database row type definitions for PostgreSQL tables
 *
 * These types represent the raw database row structure (snake_case).
 * Use these types with pg.query<RowType>() for type-safe database queries.
 *
 * IMPORTANT: Keep these types synchronized with docker/postgres/init.sql
 */

import type { PoolClient } from 'pg';

// Re-export PoolClient for convenience
export type { PoolClient };

// ============================================================================
// Users
// ============================================================================

/**
 * Raw database row for users table
 */
export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  password_hash: string | null;
  oauth_provider: string | null;
  oauth_provider_id: string | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Households
// ============================================================================

/**
 * Raw database row for households table
 */
export interface HouseholdRow {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Household Members
// ============================================================================

export type HouseholdRole = 'admin' | 'parent' | 'child';

/**
 * Raw database row for household_members table
 */
export interface HouseholdMemberRow {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  joined_at: Date;
}

// ============================================================================
// Invitations
// ============================================================================

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
export type InvitationRole = 'admin' | 'parent';

/**
 * Raw database row for invitations table
 */
export interface InvitationRow {
  id: string;
  household_id: string;
  invited_by: string;
  invited_email: string;
  token: string;
  role: InvitationRole;
  status: InvitationStatus;
  expires_at: Date;
  accepted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Invitation row with joined user data
 */
export interface InvitationWithInviterRow extends InvitationRow {
  inviter_email: string;
}

// ============================================================================
// Password Reset Tokens
// ============================================================================

/**
 * Raw database row for password_reset_tokens table
 */
export interface PasswordResetTokenRow {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

// ============================================================================
// Children
// ============================================================================

/**
 * Raw database row for children table
 */
export interface ChildRow {
  id: string;
  household_id: string;
  user_id: string | null;
  name: string;
  birth_year: number | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Tasks
// ============================================================================

export type TaskRuleType = 'weekly_rotation' | 'repeating' | 'daily' | 'single';
export type TaskRotationType = 'odd_even_week' | 'alternating';

/**
 * Rule configuration for task scheduling
 */
export interface TaskRuleConfig {
  rotation_type?: TaskRotationType;
  repeat_days?: number[];
  assigned_children?: string[];
}

/**
 * Raw database row for tasks table
 */
export interface TaskRow {
  id: string;
  household_id: string;
  name: string;
  description: string | null;
  points: number;
  rule_type: TaskRuleType;
  rule_config: TaskRuleConfig | null;
  deadline: Date | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Task Assignments
// ============================================================================

export type TaskAssignmentStatus = 'pending' | 'completed' | 'overdue' | 'expired';

/**
 * Raw database row for task_assignments table
 */
export interface TaskAssignmentRow {
  id: string;
  household_id: string;
  task_id: string;
  child_id: string | null;
  date: string; // DATE type comes as string
  status: TaskAssignmentStatus;
  created_at: Date;
}

/**
 * Task assignment with joined task and child data
 */
export interface TaskAssignmentWithDetailsRow extends TaskAssignmentRow {
  task_name?: string;
  title?: string;
  description?: string | null;
  rule_type?: TaskRuleType;
  child_name?: string | null;
  completed_at?: Date | string | null;
  points?: number;
}

// ============================================================================
// Task Completions
// ============================================================================

/**
 * Raw database row for task_completions table
 */
export interface TaskCompletionRow {
  id: string;
  household_id: string;
  task_assignment_id: string;
  child_id: string;
  completed_at: Date;
  points_earned: number;
}

// ============================================================================
// Task Candidates
// ============================================================================

/**
 * Raw database row for task_candidates table
 * Tracks which children are eligible to accept a single task
 */
export interface TaskCandidateRow {
  id: string;
  task_id: string;
  child_id: string;
  household_id: string;
  created_at: Date;
}

// ============================================================================
// Task Responses
// ============================================================================

export type TaskResponseType = 'accepted' | 'declined';

/**
 * Raw database row for task_responses table
 * Tracks accept/decline actions for single tasks (reversible)
 */
export interface TaskResponseRow {
  id: string;
  task_id: string;
  child_id: string;
  household_id: string;
  response: TaskResponseType;
  responded_at: Date;
}

// ============================================================================
// Rewards
// ============================================================================

/**
 * Raw database row for rewards table
 */
export interface RewardRow {
  id: string;
  household_id: string;
  name: string;
  description: string | null;
  points_cost: number;
  quantity: number | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Reward Redemptions
// ============================================================================

export type RedemptionStatus = 'pending' | 'approved' | 'fulfilled' | 'rejected';

/**
 * Raw database row for reward_redemptions table
 */
export interface RewardRedemptionRow {
  id: string;
  household_id: string;
  reward_id: string;
  child_id: string;
  points_spent: number;
  status: RedemptionStatus;
  redeemed_at: Date;
  fulfilled_at: Date | null;
}

/**
 * Reward redemption with joined reward and child data
 */
export interface RewardRedemptionWithDetailsRow extends RewardRedemptionRow {
  reward_name?: string;
  child_name?: string;
}

// ============================================================================
// Views
// ============================================================================

/**
 * Row from child_points_balance view
 */
export interface ChildPointsBalanceRow {
  child_id: string;
  household_id: string;
  points_earned: number;
  points_spent: number;
  points_balance: number;
}

// ============================================================================
// Items (Sample/Test table)
// ============================================================================

/**
 * Raw database row for items table (sample data)
 */
export interface ItemRow {
  id: number;
  title: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}
