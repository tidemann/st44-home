/**
 * Test Database Utilities
 *
 * Provides functions for setting up and cleaning test database state.
 * Uses a shared test database with cleanup between tests.
 */

import pg from 'pg';

// Test database configuration
const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || process.env.DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'st44_test',
  user: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
};

let testPool: pg.Pool | null = null;

/**
 * Get or create test database pool
 */
export function getTestPool(): pg.Pool {
  if (!testPool) {
    testPool = new pg.Pool(TEST_DB_CONFIG);
  }
  return testPool;
}

/**
 * Set up test database before running tests
 * Call this in before() hook
 */
export async function setupTestDatabase(): Promise<pg.Pool> {
  const pool = getTestPool();

  // Verify connection
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log(`Connected to test database: ${TEST_DB_CONFIG.database}`);
  } finally {
    client.release();
  }

  return pool;
}

/**
 * Tables in reverse dependency order for safe cleanup
 * (child tables first, then parent tables)
 */
const CLEANUP_TABLES = [
  'task_completions',
  'task_assignments',
  'tasks',
  'invitations',
  'children',
  'household_members',
  'households',
  'users',
];

/**
 * Clean up all test data
 * Call this in afterEach() or after() hooks
 *
 * @param pattern - Optional pattern to filter cleanup (e.g., 'test%' for test emails)
 */
export async function cleanupTestDatabase(pattern?: string): Promise<void> {
  const pool = getTestPool();

  if (pattern) {
    // Selective cleanup - only delete test data matching pattern
    await pool.query(
      `DELETE FROM task_completions WHERE task_assignment_id IN (
      SELECT ta.id FROM task_assignments ta
      JOIN children c ON ta.child_id = c.id
      JOIN households h ON c.household_id = h.id
      JOIN household_members hm ON h.id = hm.household_id
      JOIN users u ON hm.user_id = u.id
      WHERE u.email LIKE $1
    )`,
      [pattern],
    );

    await pool.query(
      `DELETE FROM task_assignments WHERE child_id IN (
      SELECT c.id FROM children c
      JOIN households h ON c.household_id = h.id
      JOIN household_members hm ON h.id = hm.household_id
      JOIN users u ON hm.user_id = u.id
      WHERE u.email LIKE $1
    )`,
      [pattern],
    );

    await pool.query(
      `DELETE FROM tasks WHERE household_id IN (
      SELECT h.id FROM households h
      JOIN household_members hm ON h.id = hm.household_id
      JOIN users u ON hm.user_id = u.id
      WHERE u.email LIKE $1
    )`,
      [pattern],
    );

    await pool.query(
      `DELETE FROM invitations WHERE household_id IN (
      SELECT h.id FROM households h
      JOIN household_members hm ON h.id = hm.household_id
      JOIN users u ON hm.user_id = u.id
      WHERE u.email LIKE $1
    )`,
      [pattern],
    );

    await pool.query(
      `DELETE FROM children WHERE household_id IN (
      SELECT h.id FROM households h
      JOIN household_members hm ON h.id = hm.household_id
      JOIN users u ON hm.user_id = u.id
      WHERE u.email LIKE $1
    )`,
      [pattern],
    );

    await pool.query(
      `DELETE FROM household_members WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE $1
    )`,
      [pattern],
    );

    await pool.query(
      `DELETE FROM households WHERE id IN (
      SELECT h.id FROM households h
      JOIN household_members hm ON h.id = hm.household_id
      JOIN users u ON hm.user_id = u.id
      WHERE u.email LIKE $1
    )`,
      [pattern],
    );

    await pool.query('DELETE FROM users WHERE email LIKE $1', [pattern]);
  } else {
    // Full cleanup - TRUNCATE all tables (faster but requires no foreign key constraints)
    // Using DELETE for safety since we have foreign keys
    for (const table of CLEANUP_TABLES) {
      try {
        await pool.query(`DELETE FROM ${table}`);
      } catch {
        // Table might not exist in some test environments
      }
    }
  }
}

/**
 * Truncate all test tables (fast cleanup)
 * Use with caution - removes ALL data
 */
export async function truncateAllTables(): Promise<void> {
  const pool = getTestPool();

  // Disable foreign key checks temporarily for fast truncate
  await pool.query('SET session_replication_role = replica');

  try {
    for (const table of CLEANUP_TABLES) {
      try {
        await pool.query(`TRUNCATE TABLE ${table} CASCADE`);
      } catch {
        // Table might not exist
      }
    }
  } finally {
    // Re-enable foreign key checks
    await pool.query('SET session_replication_role = DEFAULT');
  }
}

/**
 * Close test database connection
 * Call this in after() hook at the end of test suite
 */
export async function closeTestDatabase(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
}

/**
 * Execute a query on the test database
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  const pool = getTestPool();
  return pool.query(text, params);
}

/**
 * Get database config for test environment
 */
export function getTestDbConfig() {
  return { ...TEST_DB_CONFIG };
}
