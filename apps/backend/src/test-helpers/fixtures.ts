// Test fixtures for creating test data
import { getTestPool } from './database';
import bcrypt from 'bcryptjs';

export async function createTestUser(overrides: Partial<any> = {}) {
  const pool = getTestPool();
  const user = {
    email: overrides.email || `test-${Date.now()}@example.com`,
    password_hash: await bcrypt.hash('Test123!', 10),
    ...overrides,
  };
  const result = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
    [user.email, user.password_hash],
  );
  return result.rows[0];
}

export async function createTestHousehold(overrides: Partial<any> = {}) {
  const pool = getTestPool();
  const household = {
    name: overrides.name || `Test Household ${Date.now()}`,
    ...overrides,
  };
  const result = await pool.query('INSERT INTO households (name) VALUES ($1) RETURNING *', [
    household.name,
  ]);
  return result.rows[0];
}

export async function createTestChild(householdId: string, overrides: Partial<any> = {}) {
  const pool = getTestPool();
  const child = {
    name: overrides.name || `Test Child ${Date.now()}`,
    household_id: householdId,
    ...overrides,
  };
  const result = await pool.query(
    'INSERT INTO children (name, household_id) VALUES ($1, $2) RETURNING *',
    [child.name, child.household_id],
  );
  return result.rows[0];
}

export async function createTestTask(householdId: string, overrides: Partial<any> = {}) {
  const pool = getTestPool();
  const task = {
    name: overrides.name || `Test Task ${Date.now()}`,
    household_id: householdId,
    ...overrides,
  };
  const result = await pool.query(
    'INSERT INTO tasks (name, household_id) VALUES ($1, $2) RETURNING *',
    [task.name, task.household_id],
  );
  return result.rows[0];
}
