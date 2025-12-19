-- Migration: 020_update_task_assignments_for_generator
-- Description: Update task_assignments table for assignment generator - allow null child_id, rename due_date to date
-- Date: 2025-12-19
-- Related Task: task-092, task-093
-- Author: Backend Agent

BEGIN;

-- Rename due_date to date (simpler name for date range queries)
ALTER TABLE task_assignments
RENAME COLUMN due_date TO date;

-- Allow NULL child_id (for unassigned/household-wide tasks)
ALTER TABLE task_assignments
ALTER COLUMN child_id DROP NOT NULL;

-- Add unique constraint to prevent duplicate assignments
-- This ensures idempotency: same task + child + date = one assignment
-- Use partial unique index to handle NULLs properly
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_assignments_unique_with_child
ON task_assignments(task_id, child_id, date)
WHERE child_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_assignments_unique_without_child
ON task_assignments(task_id, date)
WHERE child_id IS NULL;

-- Update existing indexes to use new column name
DROP INDEX IF EXISTS idx_task_assignments_due_date;
CREATE INDEX IF NOT EXISTS idx_task_assignments_date ON task_assignments(date);

DROP INDEX IF EXISTS idx_task_assignments_child_due_status;
CREATE INDEX IF NOT EXISTS idx_task_assignments_child_date_status
ON task_assignments(child_id, date, status);

DROP INDEX IF EXISTS idx_task_assignments_household_status_due;
CREATE INDEX IF NOT EXISTS idx_task_assignments_household_status_date
ON task_assignments(household_id, status, date);

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('020', 'update_task_assignments_for_generator', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES
-- ALTER TABLE task_assignments RENAME COLUMN date TO due_date;
-- ALTER TABLE task_assignments ALTER COLUMN child_id SET NOT NULL;
-- DROP INDEX IF EXISTS idx_task_assignments_unique_assignment;
-- DROP INDEX IF EXISTS idx_task_assignments_date;
-- DROP INDEX IF EXISTS idx_task_assignments_child_date_status;
-- DROP INDEX IF EXISTS idx_task_assignments_household_status_date;
-- CREATE INDEX idx_task_assignments_due_date ON task_assignments(due_date);
-- CREATE INDEX idx_task_assignments_child_due_status ON task_assignments(child_id, due_date, status);
-- CREATE INDEX idx_task_assignments_household_status_due ON task_assignments(household_id, status, due_date);
