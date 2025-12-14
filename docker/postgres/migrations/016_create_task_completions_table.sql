-- Migration: 016_create_task_completions_table
-- Description: Create task_completions table for historical completion tracking and analytics
-- Date: 2025-12-14
-- Related Task: task-016-create-task-completions-table
-- Author: Database Agent
-- Note: This is an append-only table - no updates, only inserts

BEGIN;

-- Create task_completions table
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  task_assignment_id UUID NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  points_earned INTEGER NOT NULL
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_task_completions_household ON task_completions(household_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_child ON task_completions(child_id);

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('016', 'create_task_completions_table', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES
-- DROP TABLE IF EXISTS task_completions CASCADE;
