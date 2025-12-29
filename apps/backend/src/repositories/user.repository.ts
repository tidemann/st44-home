import type { Pool, PoolClient } from 'pg';
import type { UserRow, PasswordResetTokenRow } from '../types/database.js';

/**
 * UserRepository - Data access layer for users and password_reset_tokens tables
 *
 * Encapsulates all SQL queries for user operations.
 * Services should use this repository instead of direct database access.
 */

export interface User {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  oauthProvider: string | null;
  oauthProviderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  name?: string | null;
  passwordHash?: string | null;
  oauthProvider?: string | null;
  oauthProviderId?: string | null;
}

export interface UpdateUserDto {
  email?: string;
  name?: string | null;
  passwordHash?: string | null;
  oauthProvider?: string | null;
  oauthProviderId?: string | null;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
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
 * Map database row to User domain object
 */
function mapRowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    oauthProvider: row.oauth_provider,
    oauthProviderId: row.oauth_provider_id,
    createdAt: toDateTimeString(row.created_at),
    updatedAt: toDateTimeString(row.updated_at),
  };
}

/**
 * Map database row to PasswordResetToken domain object
 */
function mapRowToPasswordResetToken(row: PasswordResetTokenRow): PasswordResetToken {
  return {
    id: row.id,
    userId: row.user_id,
    token: row.token,
    expiresAt: toDateTimeString(row.expires_at),
    used: row.used,
    createdAt: toDateTimeString(row.created_at),
  };
}

export class UserRepository {
  constructor(private db: DbExecutor) {}

  /**
   * Create a new instance with a different executor (for transactions)
   */
  withClient(client: PoolClient): UserRepository {
    return new UserRepository(client);
  }

  /**
   * Find a user by ID
   */
  async findById(userId: string): Promise<User | null> {
    const result = await this.db.query<UserRow>(
      `SELECT id, email, name, password_hash, oauth_provider, oauth_provider_id, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId],
    );

    if (result.rows.length === 0) return null;
    return mapRowToUser(result.rows[0]);
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.query<UserRow>(
      `SELECT id, email, name, password_hash, oauth_provider, oauth_provider_id, created_at, updated_at
       FROM users WHERE email = $1`,
      [email.toLowerCase()],
    );

    if (result.rows.length === 0) return null;
    return mapRowToUser(result.rows[0]);
  }

  /**
   * Find a user by OAuth provider and provider ID
   */
  async findByOAuth(provider: string, providerId: string): Promise<User | null> {
    const result = await this.db.query<UserRow>(
      `SELECT id, email, name, password_hash, oauth_provider, oauth_provider_id, created_at, updated_at
       FROM users WHERE oauth_provider = $1 AND oauth_provider_id = $2`,
      [provider, providerId],
    );

    if (result.rows.length === 0) return null;
    return mapRowToUser(result.rows[0]);
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserDto): Promise<User> {
    const result = await this.db.query<UserRow>(
      `INSERT INTO users (email, name, password_hash, oauth_provider, oauth_provider_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, password_hash, oauth_provider, oauth_provider_id, created_at, updated_at`,
      [
        data.email.toLowerCase(),
        data.name ?? null,
        data.passwordHash ?? null,
        data.oauthProvider ?? null,
        data.oauthProviderId ?? null,
      ],
    );

    return mapRowToUser(result.rows[0]);
  }

  /**
   * Update a user
   */
  async update(userId: string, data: UpdateUserDto): Promise<User | null> {
    const updates: string[] = [];
    const values: (string | null)[] = [];
    let paramIndex = 1;

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email.toLowerCase());
    }
    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.passwordHash !== undefined) {
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(data.passwordHash);
    }
    if (data.oauthProvider !== undefined) {
      updates.push(`oauth_provider = $${paramIndex++}`);
      values.push(data.oauthProvider);
    }
    if (data.oauthProviderId !== undefined) {
      updates.push(`oauth_provider_id = $${paramIndex++}`);
      values.push(data.oauthProviderId);
    }

    if (updates.length === 0) {
      return this.findById(userId);
    }

    updates.push('updated_at = NOW()');
    values.push(userId);

    const result = await this.db.query<UserRow>(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, email, name, password_hash, oauth_provider, oauth_provider_id, created_at, updated_at`,
      values,
    );

    if (result.rows.length === 0) return null;
    return mapRowToUser(result.rows[0]);
  }

  /**
   * Update user's password
   */
  async updatePassword(userId: string, passwordHash: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [userId, passwordHash],
    );

    return result.rows.length > 0;
  }

  /**
   * Delete a user
   */
  async delete(userId: string): Promise<boolean> {
    const result = await this.db.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);

    return result.rows.length > 0;
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const result = await this.db.query('SELECT 1 FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);

    return result.rows.length > 0;
  }

  // ============================================================================
  // Password Reset Tokens
  // ============================================================================

  /**
   * Create a password reset token
   */
  async createPasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<PasswordResetToken> {
    const result = await this.db.query<PasswordResetTokenRow>(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, token, expires_at, used, created_at`,
      [userId, token, expiresAt],
    );

    return mapRowToPasswordResetToken(result.rows[0]);
  }

  /**
   * Find a valid (unused, not expired) password reset token
   */
  async findValidPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    const result = await this.db.query<PasswordResetTokenRow>(
      `SELECT id, user_id, token, expires_at, used, created_at
       FROM password_reset_tokens
       WHERE token = $1 AND used = false AND expires_at > NOW()`,
      [token],
    );

    if (result.rows.length === 0) return null;
    return mapRowToPasswordResetToken(result.rows[0]);
  }

  /**
   * Mark a password reset token as used
   */
  async markPasswordResetTokenUsed(tokenId: string): Promise<boolean> {
    const result = await this.db.query(
      'UPDATE password_reset_tokens SET used = true WHERE id = $1 RETURNING id',
      [tokenId],
    );

    return result.rows.length > 0;
  }

  /**
   * Delete expired password reset tokens for a user
   */
  async deleteExpiredPasswordResetTokens(userId: string): Promise<number> {
    const result = await this.db.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1 AND (used = true OR expires_at <= NOW()) RETURNING id',
      [userId],
    );

    return result.rows.length;
  }

  /**
   * Delete all password reset tokens for a user
   */
  async deleteAllPasswordResetTokens(userId: string): Promise<number> {
    const result = await this.db.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1 RETURNING id',
      [userId],
    );

    return result.rows.length;
  }

  /**
   * Get user ID by password reset token
   */
  async getUserIdByPasswordResetToken(token: string): Promise<string | null> {
    const result = await this.db.query<{ user_id: string }>(
      `SELECT user_id FROM password_reset_tokens
       WHERE token = $1 AND used = false AND expires_at > NOW()`,
      [token],
    );

    if (result.rows.length === 0) return null;
    return result.rows[0].user_id;
  }
}

/**
 * Factory function for creating UserRepository instances
 */
export function createUserRepository(db: Pool | PoolClient): UserRepository {
  return new UserRepository(db);
}
