-- Migration: 057_task_subtasks
-- Description: ST-2074. Chores with sub-tasks. A chore (tasks row) can have an ordered list
--   of sub-tasks, each with its own points; the chore's points become their sum. On each
--   chore instance (task_assignments row) the child marks a sub-task done or "not possible".
--   task_assignments.submitted_at is set when the child sends a chore with sub-tasks that
--   are not all done to a parent for approval.
-- Date: 2026-11-02
-- Related Task: ST-2074 (Diddit: chores with sub-tasks)
-- Author: Eirik

BEGIN;

CREATE TABLE IF NOT EXISTS task_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0 AND points <= 1000),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_subtasks_task ON task_subtasks(task_id, position);

CREATE TABLE IF NOT EXISTS assignment_subtask_states (
  assignment_id UUID NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  subtask_id UUID NOT NULL REFERENCES task_subtasks(id) ON DELETE CASCADE,
  state VARCHAR(20) NOT NULL CHECK (state IN ('done', 'not_possible')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (assignment_id, subtask_id)
);

ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

-- Record the migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('057', 'task_subtasks', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
