-- Migration: 011_create_households_table
-- Description: Create households table as primary tenant identifier for multi-tenant architecture
-- Date: 2025-12-14
-- Related Task: task-011-create-households-table
-- Author: Database Agent

BEGIN;

-- Create households table
-- This is the primary tenant identifier in the multi-tenant system.
-- All other tables will reference household_id for data isolation.
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('011', 'create_households_table', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- To rollback this migration, create 011_down.sql in migrations/rollback/ directory:
-- DROP TABLE IF EXISTS households CASCADE;
