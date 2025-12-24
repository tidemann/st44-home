-- Migration: 038_create_password_reset_tokens_table
-- Description: Create password_reset_tokens table for password recovery flow
-- Date: 2025-12-24
-- Related Issue: #167
-- Author: Claude Sonnet 4.5

BEGIN;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Record migration in schema_migrations table
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('038', 'create_password_reset_tokens_table', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
