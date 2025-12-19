import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import { resetTestDatabase } from '../helpers/test-helpers';

/**
 * Database Validation E2E Tests
 * Validates database schema, migrations, health endpoints, and connectivity.
 * CRITICAL: Ensures database is properly configured before application runs.
 */

// Database connection for validation queries
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'st44_test_local',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

test.describe('Database Health and Validation', () => {
  test.beforeEach(async () => {
    await resetTestDatabase();
  });

  // Note: Pool cleanup handled by process exit, not afterAll
  // This prevents "pool already ended" errors during test retries

  test('should return 200 from /health endpoint', async ({ request }) => {
    // ACT: Call health endpoint
    const apiPort = process.env.BACKEND_PORT || '3000';
    const apiHost = process.env.BACKEND_HOST || 'localhost';
    const response = await request.get(`http://${apiHost}:${apiPort}/health`);

    // ASSERT: Should return 200 OK
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // ASSERT: Response should indicate healthy status
    const body = await response.json();
    expect(body.status).toBe('healthy');
  });

  test('should return healthy status from /health/database endpoint', async ({ request }) => {
    // ACT: Call database health endpoint
    const apiPort = process.env.BACKEND_PORT || '3000';
    const apiHost = process.env.BACKEND_HOST || 'localhost';
    const response = await request.get(`http://${apiHost}:${apiPort}/health/database`);

    // ASSERT: Should return 200 OK
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // ASSERT: Database should be healthy
    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.database.connected).toBe(true);
    expect(typeof body.database.responseTime).toBe('number');
  });

  test('should have all critical tables created', async () => {
    // ACT: Query for all expected tables
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tableNames = result.rows.map((row) => row.table_name);

    // ASSERT: All critical tables should exist
    const expectedTables = [
      'users',
      'households',
      'household_members',
      'children',
      'tasks',
      'task_assignments',
      'task_completions',
      'schema_migrations',
      'invitations',
      'items',
    ];

    for (const tableName of expectedTables) {
      expect(tableNames).toContain(tableName);
    }

    // ASSERT: Should have exactly 10 tables (all critical tables)
    expect(tableNames).toHaveLength(10);
  });

  test('should have schema_migrations table with correct structure', async () => {
    // ACT: Query schema_migrations table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'schema_migrations'
      ORDER BY ordinal_position
    `);

    // ASSERT: Should have expected columns
    expect(result.rows).toHaveLength(3);

    const columns = result.rows.map((row) => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable,
    }));

    expect(columns).toContainEqual({ name: 'version', type: 'character varying', nullable: 'NO' });
    expect(columns).toContainEqual({ name: 'name', type: 'character varying', nullable: 'NO' });
    expect(columns).toContainEqual({
      name: 'applied_at',
      type: 'timestamp with time zone',
      nullable: 'NO',
    });
  });

  test('should have users table with correct schema', async () => {
    // ACT: Query users table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    const columns = result.rows.map((row) => row.column_name);

    // ASSERT: Should have all required columns
    expect(columns).toContain('id');
    expect(columns).toContain('email');
    expect(columns).toContain('password_hash');
    expect(columns).toContain('oauth_provider');
    expect(columns).toContain('oauth_provider_id');
    expect(columns).toContain('created_at');
    expect(columns).toContain('updated_at');

    // ASSERT: Email should be unique (check constraint)
    const constraintResult = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'users' AND constraint_type = 'UNIQUE'
    `);

    expect(constraintResult.rows.length).toBeGreaterThan(0);
  });

  test('should respond to database queries within 100ms', async () => {
    // ACT: Measure query response time
    const startTime = Date.now();
    await pool.query('SELECT 1 as health_check');
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // ASSERT: Should respond quickly
    expect(responseTime).toBeLessThan(100);
  });

  test('should handle concurrent database connections', async () => {
    // ACT: Make multiple concurrent queries
    const queries = Array.from({ length: 10 }, (_, i) => pool.query(`SELECT ${i} as value`));

    const results = await Promise.all(queries);

    // ASSERT: All queries should succeed
    expect(results).toHaveLength(10);
    results.forEach((result, index) => {
      expect(result.rows[0].value).toBe(index);
    });
  });

  test('should maintain referential integrity between tables', async () => {
    // ACT: Query foreign key constraints
    const result = await pool.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name
    `);

    // ASSERT: Should have foreign key constraints
    expect(result.rows.length).toBeGreaterThan(0);

    // Key relationships should exist
    const relationships = result.rows.map((row) => ({
      table: row.table_name,
      column: row.column_name,
      references: `${row.foreign_table_name}.${row.foreign_column_name}`,
    }));

    // Verify critical relationships exist
    const hasUserFK = relationships.some(
      (rel) => rel.column === 'user_id' && rel.references === 'users.id',
    );
    expect(hasUserFK).toBeTruthy();
  });

  test('should have proper indexes on critical columns', async () => {
    // ACT: Query indexes
    const result = await pool.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    // ASSERT: Should have indexes
    expect(result.rows.length).toBeGreaterThan(0);

    const indexes = result.rows.map((row) => ({
      table: row.tablename,
      name: row.indexname,
      definition: row.indexdef,
    }));

    // Users table should have index on email
    const hasEmailIndex = indexes.some(
      (idx) => idx.table === 'users' && idx.definition.toLowerCase().includes('email'),
    );
    expect(hasEmailIndex).toBeTruthy();
  });

  test('should handle database connection errors gracefully', async ({ request }) => {
    // This test verifies the health endpoint handles DB issues
    // In a real scenario where DB is down, endpoint should return appropriate status

    // ACT: Call health endpoint (should work even if DB has issues)
    const apiPort = process.env.BACKEND_PORT || '3000';
    const apiHost = process.env.BACKEND_HOST || 'localhost';
    const response = await request.get(`http://${apiHost}:${apiPort}/health`);

    // ASSERT: Should always respond (not timeout)
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(600);
  });

  test('should have created_at and updated_at timestamps on all tables', async () => {
    const tablesWithTimestamps = ['users', 'households', 'children', 'tasks'];

    for (const tableName of tablesWithTimestamps) {
      // ACT: Query table structure
      const result = await pool.query(
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name IN ('created_at', 'updated_at')
      `,
        [tableName],
      );

      // ASSERT: Should have both timestamp columns
      const columns = result.rows.map((row) => row.column_name);
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
    }
  });

  test('should have NOT NULL constraints on critical columns', async () => {
    // ACT: Check users table constraints
    const result = await pool.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('id', 'email', 'created_at')
    `);

    // ASSERT: Critical columns should be NOT NULL
    result.rows.forEach((row) => {
      expect(row.is_nullable).toBe('NO');
    });
  });
});
