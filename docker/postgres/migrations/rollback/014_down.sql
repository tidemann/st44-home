-- Rollback: 014_create_tasks_table.sql
-- Description: Drops tasks table
-- Date: 2025-12-14
-- WARNING: Destroys all task templates

BEGIN;

-- Drop trigger first
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;

-- Drop index
DROP INDEX IF EXISTS idx_tasks_household;

-- Drop table (CASCADE removes dependent task_assignments and completions)
DROP TABLE IF EXISTS tasks CASCADE;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = '014';

COMMIT;
