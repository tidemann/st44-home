-- Migration: Fix child household mismatches
-- Description: Fixes children whose household_id doesn't match their user's household_members entry
-- Date: 2026-01-03
--
-- Problem: Some children with user accounts (linked children) have a different household_id
-- in the children table than their user's household_id in the household_members table.
-- This causes 404 errors when trying to delete them because the DELETE checks children.household_id.

BEGIN;

-- Log children that will be fixed (for debugging)
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'Checking for children with mismatched household assignments...';

  FOR rec IN
    SELECT
      c.id as child_id,
      c.name as child_name,
      c.household_id as current_household_id,
      hm.household_id as correct_household_id,
      h1.name as current_household_name,
      h2.name as correct_household_name
    FROM children c
    JOIN household_members hm ON c.user_id = hm.user_id
    LEFT JOIN households h1 ON c.household_id = h1.id
    LEFT JOIN households h2 ON hm.household_id = h2.id
    WHERE c.user_id IS NOT NULL
      AND c.household_id != hm.household_id
  LOOP
    RAISE NOTICE 'Child "%" (%) will be moved from "%" (%) to "%" (%)',
      rec.child_name,
      rec.child_id,
      rec.current_household_name,
      rec.current_household_id,
      rec.correct_household_name,
      rec.correct_household_id;
  END LOOP;
END $$;

-- Fix mismatched children by updating their household_id to match household_members
UPDATE children c
SET
  household_id = hm.household_id,
  updated_at = CURRENT_TIMESTAMP
FROM household_members hm
WHERE c.user_id = hm.user_id
  AND c.user_id IS NOT NULL
  AND c.household_id != hm.household_id;

-- Log the result
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % children with mismatched household assignments', affected_count;
END $$;

-- Update schema_migrations table
INSERT INTO schema_migrations (version, name, applied_at)
VALUES (46, 'fix_child_household_mismatches', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;

COMMIT;
