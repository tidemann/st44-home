-- Migration: 000_create_migrations_table
-- Description: Create schema_migrations table to track applied migrations
-- Date: 2025-12-13
-- Related Task: System Infrastructure

BEGIN;

-- Create migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(10) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add index for querying by date
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
ON schema_migrations(applied_at);

-- Record this migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('000', 'create_migrations_table', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
