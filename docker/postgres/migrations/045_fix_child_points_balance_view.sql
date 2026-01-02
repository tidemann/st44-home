-- Migration: 045_fix_child_points_balance_view
-- Description: Fix Cartesian product in child_points_balance view causing incorrect balance calculations
-- Date: 2026-01-02
-- Related Task: GitHub Issue #454 - Points balance calculation incorrect
-- Author: Database Agent
--
-- BUG: The original view joined task_completions and reward_redemptions directly,
-- creating a Cartesian product when a child has multiple task completions AND
-- multiple redemptions. For example, with 10 task completions worth 5 points each
-- and 1 redemption for 50 points, the join creates 10 rows, causing the redemption
-- to be counted 10 times (500 instead of 50).
--
-- FIX: Use subqueries to pre-aggregate each table before joining to avoid the
-- Cartesian product problem.

BEGIN;

-- Drop and recreate the view with corrected logic
CREATE OR REPLACE VIEW child_points_balance AS
SELECT
  c.id as child_id,
  c.household_id,
  COALESCE(tc_agg.total_earned, 0) as points_earned,
  COALESCE(rr_agg.total_spent, 0) as points_spent,
  COALESCE(tc_agg.total_earned, 0) - COALESCE(rr_agg.total_spent, 0) as points_balance
FROM children c
LEFT JOIN (
  -- Pre-aggregate task completions per child
  SELECT child_id, SUM(points_earned) as total_earned
  FROM task_completions
  GROUP BY child_id
) tc_agg ON c.id = tc_agg.child_id
LEFT JOIN (
  -- Pre-aggregate non-rejected redemptions per child
  SELECT child_id, SUM(points_spent) as total_spent
  FROM reward_redemptions
  WHERE status != 'rejected'
  GROUP BY child_id
) rr_agg ON c.id = rr_agg.child_id;

-- Record the migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('045', 'fix_child_points_balance_view', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- To revert this migration, recreate the original (buggy) view:
--
-- CREATE OR REPLACE VIEW child_points_balance AS
-- SELECT
--   c.id as child_id,
--   c.household_id,
--   COALESCE(SUM(tc.points_earned), 0) as points_earned,
--   COALESCE(SUM(rr.points_spent), 0) as points_spent,
--   COALESCE(SUM(tc.points_earned), 0) - COALESCE(SUM(rr.points_spent), 0) as points_balance
-- FROM children c
-- LEFT JOIN task_completions tc ON c.id = tc.child_id
-- LEFT JOIN reward_redemptions rr ON c.id = rr.child_id AND rr.status != 'rejected'
-- GROUP BY c.id, c.household_id;
