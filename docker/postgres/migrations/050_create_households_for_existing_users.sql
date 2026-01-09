-- Migration: 050_create_households_for_existing_users
-- Description: Create households for users who registered before the auto-creation fix
-- Date: 2026-01-09
-- Related Issue: #550
-- Author: Claude Sonnet 4.5

BEGIN;

-- Create households for users who don't have any household membership
-- This fixes users who registered before PRs #545 and #546 were deployed
DO $$
DECLARE
    user_record RECORD;
    household_name TEXT;
    new_household_id UUID;
BEGIN
    -- Loop through all users who don't have household_members entries
    FOR user_record IN
        SELECT u.id, u.email, u.first_name, u.last_name
        FROM users u
        LEFT JOIN household_members hm ON u.id = hm.user_id
        WHERE hm.user_id IS NULL
    LOOP
        -- Determine household name
        IF user_record.first_name IS NOT NULL AND user_record.first_name != '' THEN
            household_name := user_record.first_name || '''s Household';
        ELSE
            -- Fallback to email prefix if no first name
            household_name := split_part(user_record.email, '@', 1) || '''s Household';
        END IF;

        -- Create household for user
        INSERT INTO households (name, created_at, updated_at)
        VALUES (household_name, NOW(), NOW())
        RETURNING id INTO new_household_id;

        -- Add user as admin of their household
        INSERT INTO household_members (household_id, user_id, role, joined_at)
        VALUES (new_household_id, user_record.id, 'admin', NOW());

        -- Log the migration
        RAISE NOTICE 'Created household % for user % (email: %)',
            new_household_id, user_record.id, user_record.email;
    END LOOP;
END $$;

-- Record the migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('050', 'create_households_for_existing_users', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- If you need to undo this migration, you would need to:
-- 1. Identify households created by this migration (check created_at timestamp)
-- 2. Delete household_members entries for these households
-- 3. Delete the households
-- However, this should NOT be done if users have already started using their households.
