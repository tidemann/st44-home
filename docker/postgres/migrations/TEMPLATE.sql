-- Migration: NNN_descriptive_name
-- Description: Brief description of what this migration does
-- Date: YYYY-MM-DD
-- Related Task: task-XXX-name (if applicable)
-- Author: [Agent Name]

BEGIN;

-- Your migration SQL here
-- Use IF NOT EXISTS, IF EXISTS clauses for idempotency
-- Example:
-- CREATE TABLE IF NOT EXISTS my_table (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
-- );

-- Always record the migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('NNN', 'descriptive_name', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- If you need to undo this migration, create a new migration that reverses these changes.
-- Never modify this file once it's committed.
-- Example rollback (as new migration):
-- DROP TABLE IF EXISTS my_table;
