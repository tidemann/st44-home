-- Migration: 017_add_performance_indexes
-- Description: Add composite and unique indexes to optimize common query patterns
-- Date: 2025-12-14
-- Related Task: task-017-add-performance-indexes
-- Author: Database Agent

BEGIN;

-- Child's daily task view: "My tasks for today"
-- Optimizes: SELECT * FROM task_assignments WHERE child_id = ? AND due_date = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_task_assignments_child_due_status 
ON task_assignments(child_id, due_date, status);

-- Household task management: "All pending tasks this week"
-- Optimizes: SELECT * FROM task_assignments WHERE household_id = ? AND status = ? AND due_date BETWEEN ? AND ?
CREATE INDEX IF NOT EXISTS idx_task_assignments_household_status_due 
ON task_assignments(household_id, status, due_date);

-- User login: Fast email lookup + uniqueness enforcement
-- Optimizes: SELECT * FROM users WHERE email = ?
-- Note: This enforces email uniqueness across the system
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Children search within household: "Find Emma in my household"
-- Optimizes: SELECT * FROM children WHERE household_id = ? AND name ILIKE ?
CREATE INDEX IF NOT EXISTS idx_children_household_name ON children(household_id, name);

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('017', 'add_performance_indexes', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES:
-- To undo, create a new migration (018 or later) with:
-- DROP INDEX IF EXISTS idx_task_assignments_child_due_status;
-- DROP INDEX IF EXISTS idx_task_assignments_household_status_due;
-- DROP INDEX IF EXISTS idx_users_email;
-- DROP INDEX IF EXISTS idx_children_household_name;
