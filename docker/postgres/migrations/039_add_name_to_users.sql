-- Migration: 039_add_name_to_users
-- Description: Add name column to users table for profile display
-- Created: 2025-01-29

BEGIN;

-- Guard: Check if migration has already been applied
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '039') THEN
        RAISE EXCEPTION 'Migration 039 has already been applied';
    END IF;
END $$;

-- Add name column to users table (nullable to support existing users)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Record migration as applied
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('039', 'add_name_to_users', NOW());

COMMIT;
