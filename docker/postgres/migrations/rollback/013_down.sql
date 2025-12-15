-- Rollback: 013_create_children_table.sql
-- Description: Drops children table
-- Date: 2025-12-14
-- WARNING: Destroys all children profiles and their assignments

BEGIN;

-- Drop trigger first
DROP TRIGGER IF EXISTS update_children_updated_at ON children;

-- Drop index
DROP INDEX IF EXISTS idx_children_household;

-- Drop table (CASCADE removes dependent task_assignments and completions)
DROP TABLE IF EXISTS children CASCADE;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = '013';

COMMIT;
