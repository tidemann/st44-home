-- Migration: 051_add_qr_token_to_children
-- Description: Add QR token support to children table for QR code-based authentication
-- Date: 2026-01-14
-- Related Issue: #238
-- Author: Database Agent

BEGIN;

-- Add qr_token column to children table
-- VARCHAR(255) is sufficient for URL-safe base64-encoded 32-byte tokens (~43 chars)
-- UNIQUE constraint prevents token collisions
-- Column is nullable (children can still use password login)
ALTER TABLE children
ADD COLUMN IF NOT EXISTS qr_token VARCHAR(255) UNIQUE;

-- Create partial index for QR token lookups
-- Partial index (WHERE qr_token IS NOT NULL) saves space since most children
-- may not use QR codes initially
CREATE INDEX IF NOT EXISTS idx_children_qr_token
ON children(qr_token)
WHERE qr_token IS NOT NULL;

-- Record the migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('051', 'add_qr_token_to_children', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- If you need to undo this migration, create a new migration that reverses these changes:
-- ALTER TABLE children DROP COLUMN IF EXISTS qr_token;
-- DROP INDEX IF EXISTS idx_children_qr_token;
