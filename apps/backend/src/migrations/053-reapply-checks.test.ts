import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import pg from 'pg';

/**
 * Migration 053 (ST-686): the live database still had the pre-040 CHECK on
 * tasks.rule_type, so every one-time chore failed with 23514. This copies the
 * two tables into a scratch schema in that broken state and runs the migration
 * file against it, so the test database's own (correct) tables stay untouched.
 */

const MIGRATION = readFileSync(
  new URL(
    '../../../../docker/postgres/migrations/053_reapply_single_task_and_expired_checks.sql',
    import.meta.url,
  ),
  'utf8',
);

const SCHEMA = 'st686_migration_test';

describe('Migration 053: reapply single task and expired checks', () => {
  let pool: pg.Pool;
  let client: pg.PoolClient;

  const insertTask = (ruleType: string) =>
    client.query(
      `INSERT INTO tasks (household_id, name, rule_type) VALUES (gen_random_uuid(), 'Gå på do', $1)`,
      [ruleType],
    );
  const insertAssignment = (status: string) =>
    client.query(
      `INSERT INTO task_assignments (household_id, task_id, date, status)
       VALUES (gen_random_uuid(), gen_random_uuid(), CURRENT_DATE, $1)`,
      [status],
    );

  before(async () => {
    pool = new pg.Pool({
      host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '55432'),
      database: process.env.TEST_DB_NAME || 'st44_test',
      user: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
    });
    client = await pool.connect();
    await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await client.query(`CREATE SCHEMA ${SCHEMA}`);
    // Columns and defaults only; then the CHECKs as the live database had them
    await client.query(`
      CREATE TABLE ${SCHEMA}.tasks (LIKE public.tasks INCLUDING DEFAULTS);
      ALTER TABLE ${SCHEMA}.tasks ADD CONSTRAINT tasks_rule_type_check
        CHECK (rule_type IN ('weekly_rotation', 'repeating', 'daily'));
      CREATE TABLE ${SCHEMA}.task_assignments (LIKE public.task_assignments INCLUDING DEFAULTS);
      ALTER TABLE ${SCHEMA}.task_assignments ADD CONSTRAINT task_assignments_status_check
        CHECK (status IN ('pending', 'completed', 'overdue'));
    `);
    // The migration names its tables without a schema; point them at the copies
    await client.query(`SET search_path TO ${SCHEMA}, public`);
  });

  after(async () => {
    await client.query('RESET search_path');
    await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    client.release();
    await pool.end();
  });

  test('the live state rejects a one-time chore, as on home.st44.no', async () => {
    await assert.rejects(insertTask('single'), { code: '23514' });
    await assert.rejects(insertAssignment('expired'), { code: '23514' });
  });

  test('after the migration (run twice) one-time chores and expired assignments save', async () => {
    await client.query(MIGRATION);
    await client.query(MIGRATION);

    await insertTask('single');
    await insertTask('daily');
    await insertAssignment('expired');
    await assert.rejects(insertTask('monthly'), { code: '23514' });

    const recorded = await client.query(
      `SELECT 1 FROM public.schema_migrations WHERE version = '053'`,
    );
    assert.strictEqual(recorded.rows.length, 1);
  });
});
