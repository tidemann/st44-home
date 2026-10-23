-- Migration: 055_child_invitations
-- Description: ST-1678. A parent invites an existing child profile by link. The child
--   sets their own password. The invitation is tied to the child's row (child_id), so
--   the points and history stay on the same row. role 'child' is now allowed, and only
--   together with a child_id. Creating the invitation is the parent's consent.
-- Date: 2026-10-23
-- Related Task: ST-1678 (Diddit: invite a child by email)
-- Author: Patt (for Eirik)

BEGIN;

ALTER TABLE invitations
ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES children(id) ON DELETE CASCADE;

ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_role_check;
ALTER TABLE invitations
ADD CONSTRAINT invitations_role_check CHECK (role IN ('admin', 'parent', 'child'));

ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_child_check;
ALTER TABLE invitations
ADD CONSTRAINT invitations_child_check CHECK ((role = 'child') = (child_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_invitations_child ON invitations(child_id) WHERE child_id IS NOT NULL;

-- Record the migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('055', 'child_invitations', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- The old image never writes role 'child' and ignores child_id, so a redeploy of the
-- previous tag runs fine with this in place. To remove it, a new migration runs:
--   DELETE FROM invitations WHERE role = 'child';
--   ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_child_check;
--   ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_role_check;
--   ALTER TABLE invitations ADD CONSTRAINT invitations_role_check CHECK (role IN ('admin', 'parent'));
--   DROP INDEX IF EXISTS idx_invitations_child;
--   ALTER TABLE invitations DROP COLUMN IF EXISTS child_id;
