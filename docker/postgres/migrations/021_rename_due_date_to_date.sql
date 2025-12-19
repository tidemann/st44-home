-- Migration: 021_rename_due_date_to_date
-- Description: Rename due_date column to date and make child_id nullable for household-wide tasks
-- Date: 2025-12-19
-- Related Task: task-093

BEGIN;

-- Rename due_date to date (simpler API)
ALTER TABLE task_assignments 
RENAME COLUMN due_date TO date;

-- Make child_id nullable (allow household-wide tasks)
ALTER TABLE task_assignments 
ALTER COLUMN child_id DROP NOT NULL;

-- Drop old indexes that reference due_date
DROP INDEX IF EXISTS idx_task_assignments_due_date;
DROP INDEX IF EXISTS idx_task_assignments_child_due_status;
DROP INDEX IF EXISTS idx_task_assignments_household_status_due;

-- Recreate indexes with new column name
CREATE INDEX IF NOT EXISTS idx_task_assignments_date ON task_assignments(date);
CREATE INDEX IF NOT EXISTS idx_task_assignments_child_date_status ON task_assignments(child_id, date, status);
CREATE INDEX IF NOT EXISTS idx_task_assignments_household_status_date ON task_assignments(household_id, status, date);

-- Add partial unique indexes for idempotency with NULL child_id support
-- When child_id IS NOT NULL: one assignment per task/child/date
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_assignments_task_child_date_unique
ON task_assignments(task_id, child_id, date)
WHERE child_id IS NOT NULL;

-- When child_id IS NULL: one assignment per task/date (household-wide)
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_assignments_task_date_unique
ON task_assignments(task_id, date)
WHERE child_id IS NULL;

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('021', 'rename_due_date_to_date', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
