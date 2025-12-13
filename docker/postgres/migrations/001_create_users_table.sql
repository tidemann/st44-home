-- Migration: 001_create_users_table
-- Description: Create users table for authentication with OAuth support
-- Date: 2025-12-13
-- Related Task: task-001-create-users-table-schema
-- Author: Database Agent

BEGIN;

-- Create users table for authentication (supports email/password and OAuth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- Nullable for OAuth users
  oauth_provider VARCHAR(50), -- 'google', 'microsoft', etc.
  oauth_provider_id VARCHAR(255), -- User ID from OAuth provider
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT check_auth_method CHECK (
    (password_hash IS NOT NULL) OR 
    (oauth_provider IS NOT NULL AND oauth_provider_id IS NOT NULL)
  )
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_provider_id) 
WHERE oauth_provider IS NOT NULL;

-- Create trigger function for updated_at (if not already exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for users table (drop first if exists to make idempotent)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('001', 'create_users_table', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- To reverse this migration, create a new migration with:
-- DROP TRIGGER IF EXISTS update_users_updated_at ON users;
-- DROP TABLE IF EXISTS users CASCADE;
