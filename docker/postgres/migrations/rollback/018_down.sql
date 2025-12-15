-- Rollback: 018_implement_row_level_security.sql
-- Description: Disables Row-Level Security policies and drops them
-- Date: 2025-12-14
-- WARNING: Removes security layer - data accessible without household filtering

BEGIN;

-- Drop RLS policies
DROP POLICY IF EXISTS households_isolation ON households;
DROP POLICY IF EXISTS household_members_isolation ON household_members;
DROP POLICY IF EXISTS children_isolation ON children;
DROP POLICY IF EXISTS tasks_isolation ON tasks;
DROP POLICY IF EXISTS task_assignments_isolation ON task_assignments;
DROP POLICY IF EXISTS task_completions_isolation ON task_completions;

-- Disable RLS on all tables
ALTER TABLE households DISABLE ROW LEVEL SECURITY;
ALTER TABLE household_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE children DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions DISABLE ROW LEVEL SECURITY;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = '018';

COMMIT;
