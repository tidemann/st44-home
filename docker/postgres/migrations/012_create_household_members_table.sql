-- Migration: 012_create_household_members_table
-- Description: Create household_members junction table for user-household many-to-many relationships with roles
-- Date: 2025-12-14
-- Related Task: task-012-create-household-members-table
-- Author: Database Agent

BEGIN;

-- Create household_members junction table
-- Implements many-to-many relationship between users and households
-- Supports role-based permissions (admin, parent, child)
CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'parent', 'child')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(household_id, user_id)
);

-- Index for "get all members of household" queries
CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members(household_id);

-- Index for "get all households for user" queries
CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('012', 'create_household_members_table', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- To rollback this migration, create 012_down.sql in migrations/rollback/ directory:
-- DROP TABLE IF EXISTS household_members CASCADE;
