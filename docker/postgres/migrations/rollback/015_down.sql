-- Rollback: 015_create_task_assignments_table.sql
-- Description: Drops task_assignments table
-- Date: 2025-12-14
-- WARNING: Destroys all task assignments data

BEGIN;

-- Drop indexes first
DROP INDEX IF EXISTS idx_task_assignments_due_date;
DROP INDEX IF EXISTS idx_task_assignments_child;
DROP INDEX IF EXISTS idx_task_assignments_household;

-- Drop table (CASCADE removes dependent objects including task_completions)
DROP TABLE IF EXISTS task_assignments CASCADE;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = '015';

COMMIT;
