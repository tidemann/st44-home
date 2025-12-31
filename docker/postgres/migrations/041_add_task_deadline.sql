-- Migration: 041_add_task_deadline
-- Description: Add optional deadline field to tasks for single task expiration tracking
-- Date: 2025-12-31
-- Related Task: #401
-- Author: Database Agent

BEGIN;

-- Add deadline column (nullable for backward compatibility)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE NULL;

-- Create index for efficient deadline queries
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline) WHERE deadline IS NOT NULL;

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('041', 'add_task_deadline', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES
-- DROP INDEX IF EXISTS idx_tasks_deadline;
-- ALTER TABLE tasks DROP COLUMN IF EXISTS deadline;
