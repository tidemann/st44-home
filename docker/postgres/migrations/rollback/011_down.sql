-- Rollback: 011_create_households_table.sql
-- Description: Drops households table
-- Date: 2025-12-14
-- WARNING: Destroys ALL household data and cascades to all related tables

BEGIN;

-- Drop trigger first
DROP TRIGGER IF EXISTS update_households_updated_at ON households;

-- Drop table (CASCADE removes all dependent data: members, children, tasks, assignments, completions)
DROP TABLE IF EXISTS households CASCADE;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = '011';

COMMIT;
