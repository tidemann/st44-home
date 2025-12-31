-- Migration: 044_add_expired_status
-- Description: Add 'expired' status to task_assignments for deadline-passed single tasks
-- Date: 2025-12-31
-- Related Task: #403
-- Author: Database Agent

BEGIN;

-- Drop existing CHECK constraint on status column
ALTER TABLE task_assignments DROP CONSTRAINT IF EXISTS task_assignments_status_check;

-- Add new CHECK constraint with 'expired' status
ALTER TABLE task_assignments ADD CONSTRAINT task_assignments_status_check
  CHECK (status IN ('pending', 'completed', 'overdue', 'expired'));

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('044', 'add_expired_status', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES
-- ALTER TABLE task_assignments DROP CONSTRAINT IF EXISTS task_assignments_status_check;
-- ALTER TABLE task_assignments ADD CONSTRAINT task_assignments_status_check
--   CHECK (status IN ('pending', 'completed', 'overdue'));
