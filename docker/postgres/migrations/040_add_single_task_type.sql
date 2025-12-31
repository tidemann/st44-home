-- Migration: 040_add_single_task_type
-- Description: Extend task rule_type to include 'single' for one-time tasks
-- Date: 2025-12-31
-- Related Task: #400
-- Author: Database Agent

BEGIN;

-- Drop existing CHECK constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_rule_type_check;

-- Add new CHECK constraint with 'single' type
ALTER TABLE tasks ADD CONSTRAINT tasks_rule_type_check
  CHECK (rule_type IN ('daily', 'repeating', 'weekly_rotation', 'single'));

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('040', 'add_single_task_type', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES
-- ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_rule_type_check;
-- ALTER TABLE tasks ADD CONSTRAINT tasks_rule_type_check
--   CHECK (rule_type IN ('daily', 'repeating', 'weekly_rotation'));
