-- Migration: 058_next_in_line
-- Description: ST-2075. «Etter tur» (next in line) chores. A new rule type 'next_in_line':
--   one child has the turn at a time (the open turn is one pending task_assignments row) and
--   the turn goes round tasks.rule_config.assignedChildren in order. Adds:
--   - tasks.scan_code: the short code in the chore's QR/NFC link https://home.st44.no/s/<code>;
--   - task_completions.completed_via: 'app' (normal tick) or 'scan' (QR code / NFC sticker),
--     NULL for every completion before this release;
--   - task_turn_moves: a parent moved the turn by hand (history: «flyttet av Mor»).
--   Safe to run more than once. 057 is taken by ST-2074 (sub-tasks).
-- Date: 2026-11-02
-- Related Task: ST-2075
-- Author: Eirik

BEGIN;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_rule_type_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_rule_type_check
  CHECK (rule_type IN ('daily', 'repeating', 'weekly_rotation', 'single', 'next_in_line'));

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scan_code VARCHAR(16);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_scan_code ON tasks(scan_code) WHERE scan_code IS NOT NULL;

ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS completed_via VARCHAR(10);
ALTER TABLE task_completions DROP CONSTRAINT IF EXISTS task_completions_completed_via_check;
ALTER TABLE task_completions ADD CONSTRAINT task_completions_completed_via_check
  CHECK (completed_via IS NULL OR completed_via IN ('app', 'scan'));

CREATE TABLE IF NOT EXISTS task_turn_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  to_child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  moved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  moved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_turn_moves_task ON task_turn_moves(task_id, moved_at DESC);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('058', 'next_in_line', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK NOTES (for reference, not executed):
-- New migration: DROP TABLE task_turn_moves; drop the two new columns; set the old
-- rule_type CHECK (fails while next_in_line rows exist).
