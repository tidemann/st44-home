-- Migration: 054_add_redemption_decision
-- Description: Rewards (ST-624). A parent says yes or no to a child's reward
--   request, with a reason for "no", and can undo the answer for 5 minutes.
--   decided_at starts the undo window; decided_by says which parent answered.
--   Column names follow the existing tables (snake_case in SQL); the API and the
--   TypeScript types are camelCase, as for every other table.
-- Date: 2026-10-05
-- Related Task: ST-624 (Diddit M4: rewards and first-time setup)
-- Author: Eirik

BEGIN;

ALTER TABLE reward_redemptions
ADD COLUMN IF NOT EXISTS decided_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE reward_redemptions
ADD COLUMN IF NOT EXISTS decided_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE reward_redemptions
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Record the migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('054', 'add_redemption_decision', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- The old image ignores these columns, so a redeploy of the previous tag runs
-- fine with them in place. To remove them, create a new migration that runs:
--   ALTER TABLE reward_redemptions DROP COLUMN IF EXISTS rejection_reason;
--   ALTER TABLE reward_redemptions DROP COLUMN IF EXISTS decided_by;
--   ALTER TABLE reward_redemptions DROP COLUMN IF EXISTS decided_at;
