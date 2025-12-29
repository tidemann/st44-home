import { Pool, PoolClient } from 'pg';

/**
 * HouseholdService - Centralized household management business logic
 *
 * This service centralizes household-related business logic including:
 * - Household CRUD operations
 * - Member management (add/remove)
 * - Member listing with roles
 */

export type HouseholdRole = 'admin' | 'parent' | 'child';

export interface Household {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdWithRole extends Household {
  role: HouseholdRole;
}

export interface HouseholdMember {
  userId: string;
  email: string;
  displayName: string | null;
  role: HouseholdRole;
  joinedAt: string;
}

export interface CreateHouseholdData {
  name: string;
}

export interface HouseholdListItem extends Household {
  role: HouseholdRole;
  memberCount: number;
  childrenCount: number;
  joinedAt: string;
}

/**
 * Convert date to ISO string
 */
function toDateTimeString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date(String(value)).toISOString();
}

export class HouseholdService {
  constructor(private db: Pool) {}

  /**
   * Create a new household and assign the creator as admin
   *
   * @param userId - UUID of the user creating the household
   * @param data - Household data
   * @returns Created household with role
   */
  async createHousehold(userId: string, data: CreateHouseholdData): Promise<HouseholdWithRole> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Insert household
      const householdResult = await client.query<{
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
      }>('INSERT INTO households (name) VALUES ($1) RETURNING id, name, created_at, updated_at', [
        data.name.trim(),
      ]);

      const household = householdResult.rows[0];

      // Insert household_members (creator as admin)
      await client.query(
        'INSERT INTO household_members (household_id, user_id, role, joined_at) VALUES ($1, $2, $3, NOW())',
        [household.id, userId, 'admin'],
      );

      await client.query('COMMIT');

      return {
        id: household.id,
        name: household.name,
        role: 'admin',
        createdAt: toDateTimeString(household.created_at),
        updatedAt: toDateTimeString(household.updated_at),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a household by ID
   *
   * @param householdId - UUID of the household
   * @returns Household or null if not found
   */
  async getHousehold(householdId: string): Promise<Household | null> {
    const result = await this.db.query<{
      id: string;
      name: string;
      created_at: Date;
      updated_at: Date;
    }>('SELECT id, name, created_at, updated_at FROM households WHERE id = $1', [householdId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      createdAt: toDateTimeString(row.created_at),
      updatedAt: toDateTimeString(row.updated_at),
    };
  }

  /**
   * Get a household with counts for members and children
   *
   * @param householdId - UUID of the household
   * @returns Household with counts or null if not found
   */
  async getHouseholdWithCounts(householdId: string): Promise<
    | (Household & {
        memberCount: number;
        childrenCount: number;
      })
    | null
  > {
    const result = await this.db.query<{
      id: string;
      name: string;
      created_at: Date;
      updated_at: Date;
      member_count: string;
      children_count: string;
    }>(
      `SELECT
        h.id,
        h.name,
        h.created_at,
        h.updated_at,
        (SELECT COUNT(*) FROM household_members WHERE household_id = h.id) as member_count,
        (SELECT COUNT(*) FROM children WHERE household_id = h.id) as children_count
      FROM households h
      WHERE h.id = $1`,
      [householdId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      createdAt: toDateTimeString(row.created_at),
      updatedAt: toDateTimeString(row.updated_at),
      memberCount: parseInt(row.member_count, 10),
      childrenCount: parseInt(row.children_count, 10),
    };
  }

  /**
   * Update a household's name
   *
   * @param householdId - UUID of the household
   * @param name - New name
   * @returns Updated household or null if not found
   */
  async updateHousehold(householdId: string, name: string): Promise<Household | null> {
    const result = await this.db.query<{
      id: string;
      name: string;
      created_at: Date;
      updated_at: Date;
    }>(
      'UPDATE households SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, created_at, updated_at',
      [name.trim(), householdId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      createdAt: toDateTimeString(row.created_at),
      updatedAt: toDateTimeString(row.updated_at),
    };
  }

  /**
   * Add a member to a household
   *
   * @param householdId - UUID of the household
   * @param userId - UUID of the user to add
   * @param role - Role for the new member
   * @throws Error if user is already a member
   */
  async addMember(householdId: string, userId: string, role: HouseholdRole): Promise<void> {
    try {
      await this.db.query(
        'INSERT INTO household_members (household_id, user_id, role, joined_at) VALUES ($1, $2, $3, NOW())',
        [householdId, userId, role],
      );
    } catch (error) {
      // Check for unique constraint violation
      if ((error as { code?: string }).code === '23505') {
        throw new Error('User is already a member of this household');
      }
      throw error;
    }
  }

  /**
   * Remove a member from a household
   *
   * @param householdId - UUID of the household
   * @param userId - UUID of the user to remove
   * @returns true if member was removed, false if not found
   * @throws Error if trying to remove the last admin
   */
  async removeMember(householdId: string, userId: string): Promise<boolean> {
    // Check if this is the last admin
    const adminCheck = await this.db.query<{ role: string }>(
      'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
      [householdId, userId],
    );

    if (adminCheck.rows.length === 0) {
      return false;
    }

    if (adminCheck.rows[0].role === 'admin') {
      // Count admins in household
      const adminCountResult = await this.db.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM household_members WHERE household_id = $1 AND role = 'admin'",
        [householdId],
      );

      if (parseInt(adminCountResult.rows[0].count, 10) <= 1) {
        throw new Error('Cannot remove the last admin from a household');
      }
    }

    const result = await this.db.query(
      'DELETE FROM household_members WHERE household_id = $1 AND user_id = $2 RETURNING id',
      [householdId, userId],
    );

    return result.rows.length > 0;
  }

  /**
   * Get all members of a household
   *
   * @param householdId - UUID of the household
   * @returns Array of household members
   */
  async getHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
    const result = await this.db.query<{
      user_id: string;
      email: string;
      name: string | null;
      role: HouseholdRole;
      joined_at: Date;
    }>(
      `SELECT
        u.id as user_id,
        u.email,
        u.name,
        hm.role,
        hm.joined_at
      FROM household_members hm
      JOIN users u ON hm.user_id = u.id
      WHERE hm.household_id = $1
      ORDER BY hm.role DESC, u.email ASC`,
      [householdId],
    );

    return result.rows.map((row) => ({
      userId: row.user_id,
      email: row.email,
      displayName: row.name,
      role: row.role,
      joinedAt: toDateTimeString(row.joined_at),
    }));
  }

  /**
   * List all households for a user
   *
   * @param userId - UUID of the user
   * @returns Array of households with role and counts
   */
  async listUserHouseholds(userId: string): Promise<HouseholdListItem[]> {
    const result = await this.db.query<{
      id: string;
      name: string;
      created_at: Date;
      updated_at: Date;
      role: HouseholdRole;
      joined_at: Date;
      member_count: string;
      children_count: string;
    }>(
      `SELECT
        h.id,
        h.name,
        h.created_at,
        h.updated_at,
        hm.role,
        hm.joined_at,
        (SELECT COUNT(*) FROM household_members WHERE household_id = h.id) as member_count,
        (SELECT COUNT(*) FROM children WHERE household_id = h.id) as children_count
      FROM households h
      JOIN household_members hm ON h.id = hm.household_id
      WHERE hm.user_id = $1
      ORDER BY hm.joined_at DESC`,
      [userId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      memberCount: parseInt(row.member_count, 10),
      childrenCount: parseInt(row.children_count, 10),
      joinedAt: toDateTimeString(row.joined_at),
      createdAt: toDateTimeString(row.created_at),
      updatedAt: toDateTimeString(row.updated_at),
    }));
  }

  /**
   * Update a member's role
   *
   * @param householdId - UUID of the household
   * @param userId - UUID of the user
   * @param newRole - New role for the member
   * @returns true if role was updated, false if member not found
   * @throws Error if trying to demote the last admin
   */
  async updateMemberRole(
    householdId: string,
    userId: string,
    newRole: HouseholdRole,
  ): Promise<boolean> {
    // Check current role
    const currentRoleResult = await this.db.query<{ role: string }>(
      'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
      [householdId, userId],
    );

    if (currentRoleResult.rows.length === 0) {
      return false;
    }

    const currentRole = currentRoleResult.rows[0].role;

    // If demoting from admin, check if it's the last admin
    if (currentRole === 'admin' && newRole !== 'admin') {
      const adminCountResult = await this.db.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM household_members WHERE household_id = $1 AND role = 'admin'",
        [householdId],
      );

      if (parseInt(adminCountResult.rows[0].count, 10) <= 1) {
        throw new Error('Cannot demote the last admin of a household');
      }
    }

    const result = await this.db.query(
      'UPDATE household_members SET role = $3 WHERE household_id = $1 AND user_id = $2 RETURNING id',
      [householdId, userId, newRole],
    );

    return result.rows.length > 0;
  }

  /**
   * Check if a user is a member of a household
   *
   * @param userId - UUID of the user
   * @param householdId - UUID of the household
   * @returns Role if member, null otherwise
   */
  async getMemberRole(userId: string, householdId: string): Promise<HouseholdRole | null> {
    const result = await this.db.query<{ role: HouseholdRole }>(
      'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
      [householdId, userId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].role;
  }
}

/**
 * Singleton instance and factory function
 */
let householdServiceInstance: HouseholdService | undefined;

export function getHouseholdService(db: Pool): HouseholdService {
  if (!householdServiceInstance) {
    householdServiceInstance = new HouseholdService(db);
  }
  return householdServiceInstance;
}
