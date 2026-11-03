-- Migration: 060_weekly_due_day
-- Description: ST-2143. A weekly chore is due on one day of the week (rule_config.dueDay,
--   0 = Sunday ... 6 = Saturday) and has one row per week, dated on that day. Existing weekly
--   chores get Sunday, and their open per-day rows from yesterday on are dropped, except the row
--   on the deadline day. Rows a child has started, sent or been paid for are kept.
--   Safe to run more than once.
-- Date: 2026-11-03
-- Related Task: ST-2143
-- Author: Eirik

BEGIN;

-- 1. Existing weekly chores are due on Sunday
UPDATE tasks
SET rule_config = COALESCE(rule_config, '{}'::jsonb) || '{"dueDay": 0}'::jsonb
WHERE rule_type = 'weekly_rotation'
  AND NOT (COALESCE(rule_config, '{}'::jsonb) ? 'dueDay');

-- 2. One row per week: drop the untouched open rows that are not on the deadline day
DELETE FROM task_assignments ta
USING tasks t
WHERE ta.task_id = t.id
  AND t.rule_type = 'weekly_rotation'
  AND ta.status = 'pending'
  AND ta.submitted_at IS NULL
  AND ta.date >= CURRENT_DATE - 1
  AND EXTRACT(DOW FROM ta.date)::int <> COALESCE((t.rule_config->>'dueDay')::int, 0)
  AND NOT EXISTS (SELECT 1 FROM assignment_subtask_states s WHERE s.assignment_id = ta.id)
  AND NOT EXISTS (SELECT 1 FROM task_completions c WHERE c.task_assignment_id = ta.id);

-- 3. A week already ticked off under the old per-day rows is done: drop its open deadline row
DELETE FROM task_assignments ta
USING tasks t
WHERE ta.task_id = t.id
  AND t.rule_type = 'weekly_rotation'
  AND ta.status = 'pending'
  AND ta.submitted_at IS NULL
  AND ta.date >= CURRENT_DATE - 1
  AND NOT EXISTS (SELECT 1 FROM assignment_subtask_states s WHERE s.assignment_id = ta.id)
  AND EXISTS (
    SELECT 1 FROM task_assignments d
    WHERE d.task_id = ta.task_id
      AND d.status = 'completed'
      AND date_trunc('week', d.date) = date_trunc('week', ta.date)
  );

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('060', 'weekly_due_day', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- UPDATE tasks SET rule_config = rule_config - 'dueDay' WHERE rule_type = 'weekly_rotation';
-- The dropped open rows come back when the scheduler runs with the old code.
