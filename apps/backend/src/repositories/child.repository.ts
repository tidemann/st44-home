import type { Pool, PoolClient } from 'pg';
import type { ChildRow } from '../types/database.js';

/**
 * ChildRepository - Data access layer for children table
 *
 * Encapsulates all SQL queries for child operations.
 * Services should use this repository instead of direct database access.
 */

export interface Child {
  id: string;
  householdId: string;
  userId: string | null;
  name: string;
  birthYear: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChildWithPoints extends Child {
  pointsEarned: number;
  pointsSpent: number;
  pointsBalance: number;
}

export interface CreateChildDto {
  householdId: string;
  name: string;
  birthYear?: number | null;
  userId?: string | null;
}

export interface UpdateChildDto {
  name?: string;
  birthYear?: number | null;
  userId?: string | null;
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
 * Map database row to Child domain object
 */
function mapRowToChild(row: ChildRow): Child {
  return {
    id: row.id,
    householdId: row.household_id,
    userId: row.user_id,
    name: row.name,
    birthYear: row.birth_year,
    createdAt: toDateTimeString(row.created_at),
    updatedAt: toDateTimeString(row.updated_at),
  };
}

export class ChildRepository {
  constructor(private db: DbExecutor) {}

  /**
   * Create a new instance with a different executor (for transactions)
   */
  withClient(client: PoolClient): ChildRepository {
    return new ChildRepository(client);
  }

  /**
   * Find a child by ID
   */
  async findById(childId: string): Promise<Child | null> {
    const result = await this.db.query<ChildRow>(
      'SELECT id, household_id, user_id, name, birth_year, created_at, updated_at FROM children WHERE id = $1',
      [childId],
    );

    if (result.rows.length === 0) return null;
    return mapRowToChild(result.rows[0]);
  }

  /**
   * Find a child by ID and household (ownership check)
   */
  async findByIdAndHousehold(childId: string, householdId: string): Promise<Child | null> {
    const result = await this.db.query<ChildRow>(
      'SELECT id, household_id, user_id, name, birth_year, created_at, updated_at FROM children WHERE id = $1 AND household_id = $2',
      [childId, householdId],
    );

    if (result.rows.length === 0) return null;
    return mapRowToChild(result.rows[0]);
  }

  /**
   * Find all children for a household
   */
  async findByHousehold(householdId: string): Promise<Child[]> {
    const result = await this.db.query<ChildRow>(
      'SELECT id, household_id, user_id, name, birth_year, created_at, updated_at FROM children WHERE household_id = $1 ORDER BY name ASC',
      [householdId],
    );

    return result.rows.map(mapRowToChild);
  }

  /**
   * Find all children for a household with points balance
   */
  async findByHouseholdWithPoints(householdId: string): Promise<ChildWithPoints[]> {
    const result = await this.db.query<
      ChildRow & {
        points_earned: string;
        points_spent: string;
        points_balance: string;
      }
    >(
      `SELECT
        c.id, c.household_id, c.user_id, c.name, c.birth_year, c.created_at, c.updated_at,
        COALESCE(pb.points_earned, 0)::text as points_earned,
        COALESCE(pb.points_spent, 0)::text as points_spent,
        COALESCE(pb.points_balance, 0)::text as points_balance
      FROM children c
      LEFT JOIN child_points_balance pb ON c.id = pb.child_id
      WHERE c.household_id = $1
      ORDER BY c.name ASC`,
      [householdId],
    );

    return result.rows.map((row) => ({
      ...mapRowToChild(row),
      pointsEarned: parseInt(row.points_earned, 10),
      pointsSpent: parseInt(row.points_spent, 10),
      pointsBalance: parseInt(row.points_balance, 10),
    }));
  }

  /**
   * Find a child by user ID
   */
  async findByUserId(userId: string): Promise<Child | null> {
    const result = await this.db.query<ChildRow>(
      'SELECT id, household_id, user_id, name, birth_year, created_at, updated_at FROM children WHERE user_id = $1',
      [userId],
    );

    if (result.rows.length === 0) return null;
    return mapRowToChild(result.rows[0]);
  }

  /**
   * Find a child by user ID and household
   */
  async findByUserIdAndHousehold(userId: string, householdId: string): Promise<Child | null> {
    const result = await this.db.query<ChildRow>(
      'SELECT id, household_id, user_id, name, birth_year, created_at, updated_at FROM children WHERE user_id = $1 AND household_id = $2',
      [userId, householdId],
    );

    if (result.rows.length === 0) return null;
    return mapRowToChild(result.rows[0]);
  }

  /**
   * Create a new child
   */
  async create(data: CreateChildDto): Promise<Child> {
    const result = await this.db.query<ChildRow>(
      `INSERT INTO children (household_id, user_id, name, birth_year)
       VALUES ($1, $2, $3, $4)
       RETURNING id, household_id, user_id, name, birth_year, created_at, updated_at`,
      [data.householdId, data.userId ?? null, data.name.trim(), data.birthYear ?? null],
    );

    return mapRowToChild(result.rows[0]);
  }

  /**
   * Update a child
   */
  async update(childId: string, householdId: string, data: UpdateChildDto): Promise<Child | null> {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name.trim());
    }
    if (data.birthYear !== undefined) {
      updates.push(`birth_year = $${paramIndex++}`);
      values.push(data.birthYear);
    }
    if (data.userId !== undefined) {
      updates.push(`user_id = $${paramIndex++}`);
      values.push(data.userId);
    }

    if (updates.length === 0) {
      return this.findByIdAndHousehold(childId, householdId);
    }

    updates.push('updated_at = NOW()');
    values.push(childId, householdId);

    const result = await this.db.query<ChildRow>(
      `UPDATE children
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND household_id = $${paramIndex}
       RETURNING id, household_id, user_id, name, birth_year, created_at, updated_at`,
      values,
    );

    if (result.rows.length === 0) return null;
    return mapRowToChild(result.rows[0]);
  }

  /**
   * Delete a child
   */
  async delete(childId: string, householdId: string): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM children WHERE id = $1 AND household_id = $2 RETURNING id',
      [childId, householdId],
    );

    return result.rows.length > 0;
  }

  /**
   * Link a child to a user account
   */
  async linkToUser(childId: string, userId: string): Promise<boolean> {
    const result = await this.db.query(
      'UPDATE children SET user_id = $2, updated_at = NOW() WHERE id = $1 RETURNING id',
      [childId, userId],
    );

    return result.rows.length > 0;
  }

  /**
   * Unlink a child from a user account
   */
  async unlinkFromUser(childId: string): Promise<boolean> {
    const result = await this.db.query(
      'UPDATE children SET user_id = NULL, updated_at = NOW() WHERE id = $1 RETURNING id',
      [childId],
    );

    return result.rows.length > 0;
  }

  /**
   * Get household ID for a child
   */
  async getHouseholdId(childId: string): Promise<string | null> {
    const result = await this.db.query<{ household_id: string }>(
      'SELECT household_id FROM children WHERE id = $1',
      [childId],
    );

    if (result.rows.length === 0) return null;
    return result.rows[0].household_id;
  }

  /**
   * Check if child belongs to household
   */
  async belongsToHousehold(childId: string, householdId: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT 1 FROM children WHERE id = $1 AND household_id = $2',
      [childId, householdId],
    );

    return result.rows.length > 0;
  }

  /**
   * Count children in household
   */
  async countByHousehold(householdId: string): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM children WHERE household_id = $1',
      [householdId],
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get points balance for a child
   */
  async getPointsBalance(childId: string): Promise<{
    pointsEarned: number;
    pointsSpent: number;
    pointsBalance: number;
  } | null> {
    const result = await this.db.query<{
      points_earned: string;
      points_spent: string;
      points_balance: string;
    }>(
      `SELECT
        COALESCE(points_earned, 0)::text as points_earned,
        COALESCE(points_spent, 0)::text as points_spent,
        COALESCE(points_balance, 0)::text as points_balance
      FROM child_points_balance
      WHERE child_id = $1`,
      [childId],
    );

    if (result.rows.length === 0) {
      // Child exists but no points data yet
      return { pointsEarned: 0, pointsSpent: 0, pointsBalance: 0 };
    }

    const row = result.rows[0];
    return {
      pointsEarned: parseInt(row.points_earned, 10),
      pointsSpent: parseInt(row.points_spent, 10),
      pointsBalance: parseInt(row.points_balance, 10),
    };
  }
}

/**
 * Factory function for creating ChildRepository instances
 */
export function createChildRepository(db: Pool | PoolClient): ChildRepository {
  return new ChildRepository(db);
}
