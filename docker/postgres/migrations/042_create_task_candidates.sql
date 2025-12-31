-- Migration: 042_create_task_candidates
-- Description: Create task_candidates table to track which children can accept single tasks
-- Date: 2025-12-31
-- Related Task: #402
-- Author: Database Agent

BEGIN;

-- Create task_candidates table
CREATE TABLE IF NOT EXISTS task_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint: one entry per task-child pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_candidates_task_child_unique
  ON task_candidates(task_id, child_id);

-- Index for querying candidates by task
CREATE INDEX IF NOT EXISTS idx_task_candidates_task ON task_candidates(task_id);

-- Index for querying tasks by child
CREATE INDEX IF NOT EXISTS idx_task_candidates_child ON task_candidates(child_id);

-- Index for household-scoped queries
CREATE INDEX IF NOT EXISTS idx_task_candidates_household ON task_candidates(household_id);

-- Enable Row-Level Security
ALTER TABLE task_candidates ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for household isolation
DROP POLICY IF EXISTS task_candidates_isolation ON task_candidates;
CREATE POLICY task_candidates_isolation ON task_candidates
FOR ALL
USING (household_id = current_setting('app.current_household_id', TRUE)::UUID);

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('042', 'create_task_candidates', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES
-- DROP POLICY IF EXISTS task_candidates_isolation ON task_candidates;
-- DROP TABLE IF EXISTS task_candidates CASCADE;
