-- Migration: 022_add_user_id_to_children
-- Description: Add user_id foreign key to children table for child authentication
-- Date: 2025-12-23
-- Related Task: GitHub Issue #146

BEGIN;

-- Add user_id column to children table (nullable for backward compatibility)
ALTER TABLE children
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);

-- Create unique constraint to prevent multiple child profiles per user per household
-- Only applies when user_id is not NULL (backward compatible)
CREATE UNIQUE INDEX IF NOT EXISTS idx_children_user_household_unique
ON children(user_id, household_id) WHERE user_id IS NOT NULL;

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('022', 'add_user_id_to_children', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
