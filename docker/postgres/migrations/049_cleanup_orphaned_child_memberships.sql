-- Migration: Clean up orphaned child memberships
-- Description: Removes household_members entries with role='child' that don't have corresponding child records
-- Date: 2026-01-03
--
-- Problem: Migration 048 didn't work because it only moves children, but the real issue is:
-- - User foo@bar.com has household_members entry in Household A with role='child'
-- - But the child record in children table is in Household B (or doesn't exist)
-- - This causes child to appear in Family page but can't be deleted (404)
--
-- Solution: Remove orphaned household_members entries where role='child' but no matching child exists.
-- This is safer than moving children around, and allows proper cleanup.

BEGIN;

-- Log orphaned household_members entries that will be removed
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'Checking for orphaned household_members with role=child...';

  FOR rec IN
    SELECT
      hm.household_id,
      hm.user_id,
      u.email,
      h.name as household_name,
      (SELECT COUNT(*) FROM children WHERE user_id = hm.user_id) as child_count,
      (SELECT COUNT(*) FROM children WHERE user_id = hm.user_id AND household_id = hm.household_id) as matching_child_count
    FROM household_members hm
    JOIN users u ON hm.user_id = u.id
    LEFT JOIN households h ON hm.household_id = h.id
    WHERE hm.role = 'child'
      AND NOT EXISTS (
        SELECT 1 FROM children c
        WHERE c.user_id = hm.user_id
          AND c.household_id = hm.household_id
      )
    ORDER BY h.name, u.email
  LOOP
    RAISE NOTICE 'Will remove: user % (%) from household "%" - child exists in % other household(s)',
      rec.email,
      rec.user_id,
      rec.household_name,
      rec.child_count;
  END LOOP;
END $$;

-- Remove orphaned household_members entries
-- These are entries where role='child' but no matching child record exists in that household
DELETE FROM household_members hm
WHERE hm.role = 'child'
  AND NOT EXISTS (
    SELECT 1 FROM children c
    WHERE c.user_id = hm.user_id
      AND c.household_id = hm.household_id
  );

-- Log the result
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Removed % orphaned household_members entries with role=child', affected_count;
END $$;

-- Also fix any remaining children that are in wrong household
-- Only fix if user has role='child' in EXACTLY ONE household
DO $$
DECLARE
  rec RECORD;
  households_with_child_role INTEGER;
BEGIN
  RAISE NOTICE 'Checking for children in wrong households...';

  FOR rec IN
    SELECT
      c.id as child_id,
      c.name as child_name,
      c.household_id as current_household_id,
      c.user_id,
      h1.name as current_household_name
    FROM children c
    LEFT JOIN households h1 ON c.household_id = h1.id
    WHERE c.user_id IS NOT NULL
  LOOP
    -- Count how many households this user has role='child'
    SELECT COUNT(*) INTO households_with_child_role
    FROM household_members
    WHERE user_id = rec.user_id AND role = 'child';

    IF households_with_child_role = 1 THEN
      -- User has role='child' in exactly one household - check if it matches
      DECLARE
        correct_household_id UUID;
        correct_household_name TEXT;
      BEGIN
        SELECT hm.household_id, h.name INTO correct_household_id, correct_household_name
        FROM household_members hm
        JOIN households h ON hm.household_id = h.id
        WHERE hm.user_id = rec.user_id AND hm.role = 'child';

        IF rec.current_household_id != correct_household_id THEN
          RAISE NOTICE 'Moving child "%" from "%" to "%"',
            rec.child_name,
            rec.current_household_name,
            correct_household_name;

          UPDATE children
          SET household_id = correct_household_id, updated_at = NOW()
          WHERE id = rec.child_id;
        END IF;
      END;
    ELSIF households_with_child_role > 1 THEN
      RAISE WARNING 'Child "%" (%) belongs to user with role=child in % households - skipping',
        rec.child_name, rec.child_id, households_with_child_role;
    ELSIF households_with_child_role = 0 THEN
      RAISE WARNING 'Child "%" (%) has no household_members entry with role=child - orphaned',
        rec.child_name, rec.child_id;
    END IF;
  END LOOP;
END $$;

-- Update schema_migrations table
INSERT INTO schema_migrations (version, name, applied_at)
VALUES (49, 'cleanup_orphaned_child_memberships', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;

COMMIT;
