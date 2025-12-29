import type { Pool, PoolClient } from 'pg';
import type { HouseholdRow, HouseholdMemberRow, HouseholdRole } from '../types/database.js';

/**
 * HouseholdRepository - Data access layer for households and household_members tables
 *
 * Encapsulates all SQL queries for household operations.
 * Services should use this repository instead of direct database access.
 */

export interface Household {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdWithCounts extends Household {
  memberCount: number;
  childrenCount: number;
}

export interface HouseholdMember {
  id: string;
  userId: string;
  householdId: string;
  email: string;
  displayName: string | null;
  role: HouseholdRole;
  joinedAt: string;
}

export interface HouseholdListItem extends Household {
  role: HouseholdRole;
  memberCount: number;
  childrenCount: number;
  joinedAt: string;
}

export interface CreateHouseholdDto {
  name: string;
}

/**
 * Database executor type - supports both Pool and PoolClient
 */
type DbExecutor = Pool | PoolClient;

/**
 * Convert date to ISO string
 */
function toDateTimeString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date(String(value)).toISOString();
}

/**
 * Map database row to Household domain object
 */
function mapRowToHousehold(row: HouseholdRow): Household {
  return {
    id: row.id,
    name: row.name,
    createdAt: toDateTimeString(row.created_at),
    updatedAt: toDateTimeString(row.updated_at),
  };
}

export class HouseholdRepository {
  constructor(private db: DbExecutor) {}

  /**
   * Create a new instance with a different executor (for transactions)
   */
  withClient(client: PoolClient): HouseholdRepository {
    return new HouseholdRepository(client);
  }

  /**
   * Find a household by ID
   */
  async findById(householdId: string): Promise<Household | null> {
    const result = await this.db.query<HouseholdRow>(
      'SELECT id, name, created_at, updated_at FROM households WHERE id = $1',
      [householdId],
    );

    if (result.rows.length === 0) return null;
    return mapRowToHousehold(result.rows[0]);
  }

  /**
   * Find a household with member and children counts
   */
  async findByIdWithCounts(householdId: string): Promise<HouseholdWithCounts | null> {
    const result = await this.db.query<
      HouseholdRow & { member_count: string; children_count: string }
    >(
      `SELECT
        h.id, h.name, h.created_at, h.updated_at,
        (SELECT COUNT(*) FROM household_members WHERE household_id = h.id) as member_count,
        (SELECT COUNT(*) FROM children WHERE household_id = h.id) as children_count
      FROM households h
      WHERE h.id = $1`,
      [householdId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...mapRowToHousehold(row),
      memberCount: parseInt(row.member_count, 10),
      childrenCount: parseInt(row.children_count, 10),
    };
  }

  /**
   * Create a new household
   */
  async create(data: CreateHouseholdDto): Promise<Household> {
    const result = await this.db.query<HouseholdRow>(
      'INSERT INTO households (name) VALUES ($1) RETURNING id, name, created_at, updated_at',
      [data.name.trim()],
    );

    return mapRowToHousehold(result.rows[0]);
  }

  /**
   * Update a household
   */
  async update(householdId: string, name: string): Promise<Household | null> {
    const result = await this.db.query<HouseholdRow>(
      'UPDATE households SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, created_at, updated_at',
      [name.trim(), householdId],
    );

    if (result.rows.length === 0) return null;
    return mapRowToHousehold(result.rows[0]);
  }

  /**
   * Delete a household
   */
  async delete(householdId: string): Promise<boolean> {
    const result = await this.db.query('DELETE FROM households WHERE id = $1 RETURNING id', [
      householdId,
    ]);

    return result.rows.length > 0;
  }

  /**
   * Find all households for a user
   */
  async findByUserId(userId: string): Promise<HouseholdListItem[]> {
    const result = await this.db.query<
      HouseholdRow & {
        role: HouseholdRole;
        joined_at: Date;
        member_count: string;
        children_count: string;
      }
    >(
      `SELECT
        h.id, h.name, h.created_at, h.updated_at,
        hm.role, hm.joined_at,
        (SELECT COUNT(*) FROM household_members WHERE household_id = h.id) as member_count,
        (SELECT COUNT(*) FROM children WHERE household_id = h.id) as children_count
      FROM households h
      JOIN household_members hm ON h.id = hm.household_id
      WHERE hm.user_id = $1
      ORDER BY hm.joined_at DESC`,
      [userId],
    );

    return result.rows.map((row) => ({
      ...mapRowToHousehold(row),
      role: row.role,
      memberCount: parseInt(row.member_count, 10),
      childrenCount: parseInt(row.children_count, 10),
      joinedAt: toDateTimeString(row.joined_at),
    }));
  }

  // ============================================================================
  // Household Members
  // ============================================================================

  /**
   * Add a member to a household
   */
  async addMember(householdId: string, userId: string, role: HouseholdRole): Promise<void> {
    await this.db.query(
      'INSERT INTO household_members (household_id, user_id, role, joined_at) VALUES ($1, $2, $3, NOW())',
      [householdId, userId, role],
    );
  }

  /**
   * Remove a member from a household
   */
  async removeMember(householdId: string, userId: string): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM household_members WHERE household_id = $1 AND user_id = $2 RETURNING id',
      [householdId, userId],
    );

    return result.rows.length > 0;
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(
    householdId: string,
    userId: string,
    role: HouseholdRole,
  ): Promise<boolean> {
    const result = await this.db.query(
      'UPDATE household_members SET role = $3 WHERE household_id = $1 AND user_id = $2 RETURNING id',
      [householdId, userId, role],
    );

    return result.rows.length > 0;
  }

  /**
   * Get a member's role in a household
   */
  async getMemberRole(userId: string, householdId: string): Promise<HouseholdRole | null> {
    const result = await this.db.query<{ role: HouseholdRole }>(
      'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
      [householdId, userId],
    );

    if (result.rows.length === 0) return null;
    return result.rows[0].role;
  }

  /**
   * Get all members of a household
   */
  async getMembers(householdId: string): Promise<HouseholdMember[]> {
    const result = await this.db.query<{
      id: string;
      user_id: string;
      household_id: string;
      email: string;
      name: string | null;
      role: HouseholdRole;
      joined_at: Date;
    }>(
      `SELECT
        hm.id, hm.user_id, hm.household_id,
        u.email, u.name,
        hm.role, hm.joined_at
      FROM household_members hm
      JOIN users u ON hm.user_id = u.id
      WHERE hm.household_id = $1
      ORDER BY hm.role DESC, u.email ASC`,
      [householdId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      householdId: row.household_id,
      email: row.email,
      displayName: row.name,
      role: row.role,
      joinedAt: toDateTimeString(row.joined_at),
    }));
  }

  /**
   * Count admins in a household
   */
  async countAdmins(householdId: string): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM household_members WHERE household_id = $1 AND role = 'admin'",
      [householdId],
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Check if a user is a member of a household
   */
  async isMember(userId: string, householdId: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT 1 FROM household_members WHERE household_id = $1 AND user_id = $2',
      [householdId, userId],
    );

    return result.rows.length > 0;
  }
}

/**
 * Factory function for creating HouseholdRepository instances
 */
export function createHouseholdRepository(db: Pool | PoolClient): HouseholdRepository {
  return new HouseholdRepository(db);
}
