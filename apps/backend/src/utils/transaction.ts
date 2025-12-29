/**
 * Transaction Helper Utility
 *
 * Provides a standardized way to handle database transactions with
 * proper connection management, error handling, and rollback support.
 */

import type { Pool, PoolClient } from 'pg';

/**
 * Execute a database operation within a transaction.
 *
 * This helper:
 * - Acquires a client from the pool
 * - Starts a transaction (BEGIN)
 * - Executes the handler with the client
 * - Commits on success or rolls back on error
 * - Always releases the client back to the pool
 *
 * @param pool - The PostgreSQL connection pool
 * @param handler - Async function that performs database operations using the client
 * @returns The result of the handler function
 * @throws Rethrows any error from the handler after rolling back
 *
 * @example
 * ```typescript
 * const result = await withTransaction(pool, async (client) => {
 *   const userResult = await client.query(
 *     'INSERT INTO users (name) VALUES ($1) RETURNING *',
 *     ['John']
 *   );
 *   const profileResult = await client.query(
 *     'INSERT INTO profiles (user_id) VALUES ($1) RETURNING *',
 *     [userResult.rows[0].id]
 *   );
 *   return { user: userResult.rows[0], profile: profileResult.rows[0] };
 * });
 * ```
 */
export async function withTransaction<T>(
  pool: Pool,
  handler: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Type for the transaction handler function
 */
export type TransactionHandler<T> = (client: PoolClient) => Promise<T>;
