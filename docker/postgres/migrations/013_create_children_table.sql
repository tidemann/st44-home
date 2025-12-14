-- Migration: 013_create_children_table
-- Description: Create children table scoped to households for child profiles used in task assignments
-- Date: 2025-12-14
-- Related Task: task-013-create-children-table
-- Author: Database Agent

BEGIN;

-- Create children table
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  birth_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for household-scoped queries
CREATE INDEX IF NOT EXISTS idx_children_household ON children(household_id);

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('013', 'create_children_table', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- To rollback this migration, create 013_down.sql in migrations/rollback/ directory:
-- DROP TABLE IF EXISTS children CASCADE;
