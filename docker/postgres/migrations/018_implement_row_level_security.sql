-- Migration: 018_implement_row_level_security
-- Description: Implement PostgreSQL Row-Level Security (RLS) policies for multi-tenant data isolation
-- Date: 2025-12-14
-- Related Task: task-018-implement-row-level-security
-- Author: Orchestrator Agent

BEGIN;

-- Enable Row-Level Security on all tenant-scoped tables
-- RLS provides defense-in-depth: even if application code bypasses filtering,
-- database enforces household_id isolation at the row level.

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotency)
DROP POLICY IF EXISTS households_isolation ON households;
DROP POLICY IF EXISTS household_members_isolation ON household_members;
DROP POLICY IF EXISTS children_isolation ON children;
DROP POLICY IF EXISTS tasks_isolation ON tasks;
DROP POLICY IF EXISTS task_assignments_isolation ON task_assignments;
DROP POLICY IF EXISTS task_completions_isolation ON task_completions;

-- Create RLS policies for all tables
-- Policies use session variable app.current_household_id set by application
-- FOR ALL applies to SELECT, INSERT, UPDATE, DELETE operations

-- households: Can only see/modify households you're a member of
CREATE POLICY households_isolation ON households
FOR ALL
USING (id = current_setting('app.current_household_id', TRUE)::UUID);

-- household_members: Can only see/modify members in your household
CREATE POLICY household_members_isolation ON household_members
FOR ALL
USING (household_id = current_setting('app.current_household_id', TRUE)::UUID);

-- children: Can only see/modify children in your household
CREATE POLICY children_isolation ON children
FOR ALL
USING (household_id = current_setting('app.current_household_id', TRUE)::UUID);

-- tasks: Can only see/modify tasks in your household
CREATE POLICY tasks_isolation ON tasks
FOR ALL
USING (household_id = current_setting('app.current_household_id', TRUE)::UUID);

-- task_assignments: Can only see/modify task assignments in your household
CREATE POLICY task_assignments_isolation ON task_assignments
FOR ALL
USING (household_id = current_setting('app.current_household_id', TRUE)::UUID);

-- task_completions: Can only see/modify task completions in your household
CREATE POLICY task_completions_isolation ON task_completions
FOR ALL
USING (household_id = current_setting('app.current_household_id', TRUE)::UUID);

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('018', 'implement_row_level_security', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- To disable RLS (as new migration):
-- ALTER TABLE households DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE household_members DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE children DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE task_assignments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE task_completions DISABLE ROW LEVEL SECURITY;
-- 
-- DROP POLICY IF EXISTS households_isolation ON households;
-- DROP POLICY IF EXISTS household_members_isolation ON household_members;
-- DROP POLICY IF EXISTS children_isolation ON children;
-- DROP POLICY IF EXISTS tasks_isolation ON tasks;
-- DROP POLICY IF EXISTS task_assignments_isolation ON task_assignments;
-- DROP POLICY IF EXISTS task_completions_isolation ON task_completions;
