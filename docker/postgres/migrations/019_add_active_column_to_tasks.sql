-- Migration: 019_add_active_column_to_tasks
-- Description: Add active column to tasks table for soft delete functionality
-- Date: 2025-12-19
-- Related Task: task-082-task-templates-crud-api
-- Author: Backend Agent

BEGIN;

-- Add active column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- Create index for active status queries
CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks(household_id, active);

-- Record the migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('019', 'add_active_column_to_tasks', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- If you need to undo this migration, create a new migration that reverses these changes.
-- Example rollback (as new migration):
-- DROP INDEX IF EXISTS idx_tasks_active;
-- ALTER TABLE tasks DROP COLUMN IF EXISTS active;
