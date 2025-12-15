-- Rollback: 017_add_performance_indexes.sql
-- Description: Drops performance optimization indexes
-- Date: 2025-12-14

BEGIN;

-- Drop composite indexes
DROP INDEX IF EXISTS idx_task_assignments_child_due_status;
DROP INDEX IF EXISTS idx_task_assignments_household_status_due;
DROP INDEX IF EXISTS idx_children_household_name;

-- Drop unique index on users.email (recreate as non-unique)
DROP INDEX IF EXISTS idx_users_email;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Note: Single-column indexes (idx_*_household, idx_*_child, etc.) 
-- were created in earlier migrations, not in 017, so we don't drop them here

-- Remove migration record
DELETE FROM schema_migrations WHERE version = '017';

COMMIT;
