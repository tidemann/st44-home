-- Migration: 052_create_push_subscriptions
-- Description: Web push (ST-623). One row per phone/browser that turned on
--   notifications, and a marker on assignments so a "due" reminder is sent once.
--   Column names follow the existing tables (snake_case in SQL); the API and the
--   TypeScript types are camelCase, as for every other table.
-- Date: 2026-10-05
-- Related Task: ST-623 (Diddit M3: install on the phone and reminders)
-- Author: Eirik

BEGIN;

-- A browser's push subscription. The endpoint is unique per browser install, so
-- re-subscribing (or another user signing in on the same phone) moves the row.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_success_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- Set when the "due" reminder for an assignment has been sent (or claimed for
-- sending), so a restart or a second check the same day never sends it again
ALTER TABLE task_assignments
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Record the migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('052', 'create_push_subscriptions', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- If you need to undo this migration, create a new migration that reverses these changes:
-- ALTER TABLE task_assignments DROP COLUMN IF EXISTS reminder_sent_at;
-- DROP TABLE IF EXISTS push_subscriptions;
