// Test database utilities for setup, cleanup, and queries
import { Pool } from 'pg';

let pool: Pool | null = null;

export function getTestDbConfig() {
  return {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: +(process.env.TEST_DB_PORT || 5432),
    database: process.env.TEST_DB_NAME || 'st44_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
  };
}

export function getTestPool() {
  if (!pool) {
    pool = new Pool(getTestDbConfig());
  }
  return pool;
}

export async function setupTestDatabase() {
  const p = getTestPool();
  await p.query('SELECT 1');
}

export async function cleanupTestDatabase(pattern = 'test%@example.com') {
  const p = getTestPool();
  // Remove test users and related data
  await p.query('DELETE FROM users WHERE email LIKE $1', [pattern]);
  // Add more cleanup as needed for other tables
}

export async function truncateAllTables() {
  const p = getTestPool();
  await p.query(
    'TRUNCATE users, households, household_members, children, tasks, task_assignments, task_completions RESTART IDENTITY CASCADE',
  );
}

export async function closeTestDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function query(text: string, params?: any[]) {
  const p = getTestPool();
  return p.query(text, params);
}
