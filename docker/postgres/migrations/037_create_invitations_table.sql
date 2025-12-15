-- Migration: 037_create_invitations_table
-- Description: Create invitations table for household invitation system
-- Date: 2025-12-15
-- Related Feature: feature-004
-- Related Task: task-036

BEGIN;

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'parent',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT invitations_role_check CHECK (role IN ('admin', 'parent')),
  CONSTRAINT invitations_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  CONSTRAINT invitations_expiry_check CHECK (expires_at > created_at)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_invitations_household ON invitations(household_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(invited_email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- Record migration in schema_migrations table
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('037', 'create_invitations_table', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
