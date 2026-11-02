-- Migration: 059_task_completions_assignment_index
-- Description: ST-2104. Fremgang and my-tasks now add the points the child really got
--   (task_completions.points_earned) per assignment, so look-ups by task_assignment_id need an
--   index. Safe to run more than once.
-- Date: 2026-11-02
-- Related Task: ST-2104
-- Author: Eirik

BEGIN;

CREATE INDEX IF NOT EXISTS idx_task_completions_assignment
  ON task_completions(task_assignment_id);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('059', 'task_completions_assignment_index', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- DROP INDEX IF EXISTS idx_task_completions_assignment;
