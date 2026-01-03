-- Migration: Add child household consistency check
-- Description: Ensures children with user accounts always belong to the same household as their user
-- Date: 2026-01-03
--
-- This prevents the data inconsistency where a child's household_id differs from their
-- user's household_id in the household_members table.

BEGIN;

-- Add CHECK constraint to ensure children with user_id match household_members
-- Note: This uses a function because CHECK constraints can't directly query other tables
CREATE OR REPLACE FUNCTION check_child_household_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if user_id is set (linked children)
  IF NEW.user_id IS NOT NULL THEN
    -- Verify the user belongs to this household
    IF NOT EXISTS (
      SELECT 1
      FROM household_members
      WHERE user_id = NEW.user_id
        AND household_id = NEW.household_id
    ) THEN
      RAISE EXCEPTION 'Child user_id % must belong to household % in household_members',
        NEW.user_id, NEW.household_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on INSERT and UPDATE
DROP TRIGGER IF EXISTS enforce_child_household_consistency ON children;
CREATE TRIGGER enforce_child_household_consistency
  BEFORE INSERT OR UPDATE ON children
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION check_child_household_consistency();

-- Also add a trigger on household_members to prevent moving a user
-- to a different household if they have a linked child
CREATE OR REPLACE FUNCTION prevent_child_user_household_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check on UPDATE when household_id changes
  IF TG_OP = 'UPDATE' AND OLD.household_id != NEW.household_id THEN
    -- Check if this user is linked to any children
    IF EXISTS (
      SELECT 1
      FROM children
      WHERE user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Cannot move user % to different household because they are linked to children. Update children.household_id first.',
        NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on household_members
DROP TRIGGER IF EXISTS prevent_child_user_household_change ON household_members;
CREATE TRIGGER prevent_child_user_household_change
  BEFORE UPDATE ON household_members
  FOR EACH ROW
  EXECUTE FUNCTION prevent_child_user_household_change();

-- Update schema_migrations table
INSERT INTO schema_migrations (version, name, applied_at)
VALUES (47, 'add_child_household_consistency_check', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;

COMMIT;
