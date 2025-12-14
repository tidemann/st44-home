-- Rollback: 016_create_task_completions_table.sql
-- Description: Drops task_completions table
-- Date: 2025-12-14
-- WARNING: Destroys all task completion history and points data

BEGIN;

-- Drop indexes first
DROP INDEX IF EXISTS idx_task_completions_child;
DROP INDEX IF EXISTS idx_task_completions_household;

-- Drop table (CASCADE removes dependent objects)
DROP TABLE IF EXISTS task_completions CASCADE;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = '016';

COMMIT;
