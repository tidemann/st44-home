-- Migration: 043_create_task_responses
-- Description: Create task_responses table to track accept/decline actions (reversible)
-- Date: 2025-12-31
-- Related Task: #402
-- Author: Database Agent

BEGIN;

-- Create task_responses table
CREATE TABLE IF NOT EXISTS task_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  response VARCHAR(20) NOT NULL CHECK (response IN ('accepted', 'declined')),
  responded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint: one active response per task-child pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_responses_task_child_unique
  ON task_responses(task_id, child_id);

-- Index for querying responses by task
CREATE INDEX IF NOT EXISTS idx_task_responses_task ON task_responses(task_id);

-- Index for querying responses by child
CREATE INDEX IF NOT EXISTS idx_task_responses_child ON task_responses(child_id);

-- Index for household-scoped queries
CREATE INDEX IF NOT EXISTS idx_task_responses_household ON task_responses(household_id);

-- Index for filtering by response type
CREATE INDEX IF NOT EXISTS idx_task_responses_response ON task_responses(response);

-- Enable Row-Level Security
ALTER TABLE task_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for household isolation
DROP POLICY IF EXISTS task_responses_isolation ON task_responses;
CREATE POLICY task_responses_isolation ON task_responses
FOR ALL
USING (household_id = current_setting('app.current_household_id', TRUE)::UUID);

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('043', 'create_task_responses', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES
-- DROP POLICY IF EXISTS task_responses_isolation ON task_responses;
-- DROP TABLE IF EXISTS task_responses CASCADE;
