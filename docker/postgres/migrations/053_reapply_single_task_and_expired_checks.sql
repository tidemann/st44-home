-- Migration: 053_reapply_single_task_and_expired_checks
-- Description: Production still had the pre-040 CHECK on tasks.rule_type (only
--   weekly_rotation/repeating/daily), although schema_migrations lists 040. Every
--   one-time chore ('single') failed with SQLSTATE 23514 and a 500 in the app.
--   This sets the two CHECKs that 040 and 044 meant to set, again. Each runs in its
--   own transaction, so one cannot hold back the other. Safe to run more than once.
-- Date: 2026-10-05
-- Related Task: ST-686
-- Author: Eirik

BEGIN;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_rule_type_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_rule_type_check
  CHECK (rule_type IN ('daily', 'repeating', 'weekly_rotation', 'single'));

COMMIT;

BEGIN;

ALTER TABLE task_assignments DROP CONSTRAINT IF EXISTS task_assignments_status_check;
ALTER TABLE task_assignments ADD CONSTRAINT task_assignments_status_check
  CHECK (status IN ('pending', 'completed', 'overdue', 'expired'));

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('053', 'reapply_single_task_and_expired_checks', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- Nothing to undo: both CHECKs only allow more values than before. To go back,
-- write a new migration that sets the old lists (fails while such rows exist).
