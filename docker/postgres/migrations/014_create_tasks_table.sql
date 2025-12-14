-- Migration: 014_create_tasks_table
-- Description: Create tasks table for chore templates with automation rules (JSONB)
-- Date: 2025-12-14
-- Related Task: task-014-create-tasks-table
-- Author: Database Agent

BEGIN;

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points INTEGER DEFAULT 10,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('weekly_rotation', 'repeating', 'daily')),
  rule_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for household-scoped queries
CREATE INDEX IF NOT EXISTS idx_tasks_household ON tasks(household_id);

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('014', 'create_tasks_table', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES
-- DROP TABLE IF EXISTS tasks CASCADE;
