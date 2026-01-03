-- Migration: Fix multi-household child assignments
-- Description: Fixes children moved to wrong household when user belongs to multiple households
-- Date: 2026-01-03
--
-- Problem: Migration 046 had a bug when users belong to multiple households.
-- The UPDATE query didn't specify WHICH household to use when multiple matches exist.
-- PostgreSQL randomly picked one, potentially moving children to the wrong household.
--
-- Solution: Move children to the household where their user has role='child',
-- since a user should only have role='child' in the household where they're actually a child.

BEGIN;

-- Log children that will be fixed (for debugging)
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'Checking for children with incorrect household assignments...';

  FOR rec IN
    SELECT
      c.id as child_id,
      c.name as child_name,
      c.household_id as current_household_id,
      c.user_id,
      hm.household_id as correct_household_id,
      h1.name as current_household_name,
      h2.name as correct_household_name,
      hm.role
    FROM children c
    JOIN household_members hm ON c.user_id = hm.user_id AND hm.role = 'child'
    LEFT JOIN households h1 ON c.household_id = h1.id
    LEFT JOIN households h2 ON hm.household_id = h2.id
    WHERE c.user_id IS NOT NULL
      AND c.household_id != hm.household_id
    ORDER BY c.id
  LOOP
    RAISE NOTICE 'Child "%" (%) will be moved from "%" (%) to "%" (%) [user role: %]',
      rec.child_name,
      rec.child_id,
      rec.current_household_name,
      rec.current_household_id,
      rec.correct_household_name,
      rec.correct_household_id,
      rec.role;
  END LOOP;
END $$;

-- Fix children by moving them to the household where their user has role='child'
-- This handles the case where a user might be in multiple households,
-- but should only have role='child' in ONE household
UPDATE children c
SET
  household_id = hm.household_id,
  updated_at = CURRENT_TIMESTAMP
FROM household_members hm
WHERE c.user_id = hm.user_id
  AND c.user_id IS NOT NULL
  AND c.household_id != hm.household_id
  AND hm.role = 'child';  -- KEY FIX: Only match where user has role='child'

-- Log the result
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % children with incorrect household assignments', affected_count;
END $$;

-- Verify no children are still mismatched
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM children c
  JOIN household_members hm ON c.user_id = hm.user_id AND hm.role = 'child'
  WHERE c.user_id IS NOT NULL
    AND c.household_id != hm.household_id;

  IF remaining_count > 0 THEN
    RAISE WARNING 'Still have % children with mismatched households after fix!', remaining_count;
  ELSE
    RAISE NOTICE 'All children now correctly assigned to their households';
  END IF;
END $$;

-- Update schema_migrations table
INSERT INTO schema_migrations (version, name, applied_at)
VALUES (48, 'fix_multi_household_child_assignments', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;

COMMIT;
