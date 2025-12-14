-- Rollback: 012_create_household_members_table.sql
-- Description: Drops household_members junction table
-- Date: 2025-12-14
-- WARNING: Destroys all user-household associations

BEGIN;

-- Drop indexes first
DROP INDEX IF EXISTS idx_household_members_user;
DROP INDEX IF EXISTS idx_household_members_household;

-- Drop table
DROP TABLE IF EXISTS household_members CASCADE;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = '012';

COMMIT;
