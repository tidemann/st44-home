-- Migration: 040_add_user_name_fields
-- Description: Add first_name and last_name columns to users table
-- Created: 2025-01-30

BEGIN;

-- Guard: Check if migration has already been applied
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '040') THEN
        RAISE EXCEPTION 'Migration 040 has already been applied';
    END IF;
END $$;

-- Add first_name column (nullable for backwards compatibility)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);

-- Add last_name column (nullable for backwards compatibility)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Migrate existing name data: split single "name" field into first/last name
-- This handles names like "John Doe" -> first_name="John", last_name="Doe"
-- For single word names, put in first_name only
UPDATE users
SET
    first_name = CASE
        WHEN name IS NOT NULL AND POSITION(' ' IN TRIM(name)) > 0
        THEN TRIM(SPLIT_PART(name, ' ', 1))
        ELSE TRIM(name)
    END,
    last_name = CASE
        WHEN name IS NOT NULL AND POSITION(' ' IN TRIM(name)) > 0
        THEN TRIM(SUBSTRING(name FROM POSITION(' ' IN TRIM(name)) + 1))
        ELSE NULL
    END
WHERE name IS NOT NULL AND first_name IS NULL;

-- Record migration as applied
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('040', 'add_user_name_fields', NOW());

COMMIT;
