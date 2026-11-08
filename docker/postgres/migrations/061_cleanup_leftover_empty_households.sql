-- Migration: 061_cleanup_leftover_empty_households
-- Description: Remove the empty households left behind when an invited parent
--              registered from an invitation link before joining the inviting household
-- Date: 2026-11-08
-- Related Issue: ST-2348
-- Author: Stephen Seagal (Hermes)

BEGIN;

DELETE FROM households h
WHERE
  -- The household has exactly one member.
  (SELECT COUNT(*) FROM household_members m WHERE m.household_id = h.id) = 1
  -- That member is an admin.
  AND EXISTS (
    SELECT 1
    FROM household_members m
    WHERE m.household_id = h.id
      AND m.role = 'admin'
  )
  -- That member belongs to at least one other household that has two or more members.
  -- The "two or more" matters: an inviting household always holds the inviter as well, and a
  -- household with two members can never match the single-member condition above. Without it,
  -- a user who happened to make two own empty households would lose both and keep none.
  AND EXISTS (
    SELECT 1
    FROM household_members m
    JOIN household_members o
      ON o.user_id = m.user_id
     AND o.household_id <> h.id
    WHERE m.household_id = h.id
      AND (SELECT COUNT(*) FROM household_members k WHERE k.household_id = o.household_id) >= 2
  )
  -- The household has no invitations.
  AND NOT EXISTS (SELECT 1 FROM invitations i WHERE i.household_id = h.id)
  -- The household has no children.
  AND NOT EXISTS (SELECT 1 FROM children c WHERE c.household_id = h.id)
  -- The household has no tasks.
  AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.household_id = h.id)
  -- The household has no task candidates.
  AND NOT EXISTS (SELECT 1 FROM task_candidates tc WHERE tc.household_id = h.id)
  -- The household has no task responses.
  AND NOT EXISTS (SELECT 1 FROM task_responses tr WHERE tr.household_id = h.id)
  -- The household has no task assignments.
  AND NOT EXISTS (SELECT 1 FROM task_assignments ta WHERE ta.household_id = h.id)
  -- The household has no task completions.
  AND NOT EXISTS (SELECT 1 FROM task_completions tco WHERE tco.household_id = h.id)
  -- The household has no task turn moves.
  AND NOT EXISTS (SELECT 1 FROM task_turn_moves ttm WHERE ttm.household_id = h.id)
  -- The household has no task subtasks.
  AND NOT EXISTS (SELECT 1 FROM task_subtasks ts WHERE ts.household_id = h.id)
  -- The household has no rewards.
  AND NOT EXISTS (SELECT 1 FROM rewards r WHERE r.household_id = h.id)
  -- The household has no reward redemptions.
  AND NOT EXISTS (SELECT 1 FROM reward_redemptions rr WHERE rr.household_id = h.id);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('061', 'cleanup_leftover_empty_households', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- Deleted rows were empty households with no data and cannot be restored by a down-migration.
-- Re-running this migration has no effect because the deleted rows are gone.
