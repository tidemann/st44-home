-- Migration: 015_create_task_assignments_table
-- Description: Create task_assignments table for specific task instances assigned to children
-- Date: 2025-12-14
-- Related Task: task-015-create-task-assignments-table
-- Author: Database Agent

BEGIN;

-- Create task_assignments table
CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_task_assignments_household ON task_assignments(household_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_child ON task_assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_due_date ON task_assignments(due_date);

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('015', 'create_task_assignments_table', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES
-- DROP TABLE IF EXISTS task_assignments CASCADE;
