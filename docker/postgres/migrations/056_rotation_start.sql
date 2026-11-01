-- Migration: 056_rotation_start
-- Description: ST-2030. An alternating weekly rotation now stores the week its first child
--   starts (rule_config.rotationStart, the Monday as YYYY-MM-DD), so the order the parent
--   drags in the form is the order the weeks run in. Until now the next week's child was
--   read from the last generated chore. This sets rotationStart for every alternating
--   rotation from that same last chore, so every chore keeps the same child on the same
--   week after the release (rule 3):
--   - last chore's child is in the list at place k (deleted children not counted):
--     start = Monday of that chore's week, k weeks back;
--   - last chore's child is no longer in the list: the old code began again with the
--     first child the week after, so start = the Monday after that chore;
--   - no chores yet: the old code began with the first child this week.
--   Rows whose rule_config is not a JSON object are left to the old code path.
-- Date: 2026-11-01
-- Related Task: ST-2030 (Diddit: build the drag-and-drop weekly rotation)
-- Author: Eirik

BEGIN;

WITH rotations AS (
  SELECT t.id, t.household_id,
         COALESCE(t.rule_config->'assignedChildren', t.rule_config->'assigned_children') AS children
  FROM tasks t
  WHERE t.rule_type = 'weekly_rotation'
    AND jsonb_typeof(t.rule_config) = 'object'
    AND COALESCE(t.rule_config->>'rotationType', t.rule_config->>'rotation_type') = 'alternating'
    AND NOT (t.rule_config ? 'rotationStart')
),
last_chore AS (
  SELECT DISTINCT ON (ta.task_id) ta.task_id, ta.child_id, ta.date
  FROM task_assignments ta
  JOIN rotations r ON r.id = ta.task_id
  WHERE ta.child_id IS NOT NULL
  ORDER BY ta.task_id, ta.date DESC
),
starts AS (
  SELECT r.id,
         CASE
           WHEN l.task_id IS NULL THEN
             date_trunc('week', (NOW() AT TIME ZONE 'Europe/Oslo'))::date
           WHEN place.k IS NULL THEN
             (date_trunc('week', l.date) + INTERVAL '7 days')::date
           ELSE
             (date_trunc('week', l.date) - (place.k * INTERVAL '7 days'))::date
         END AS start
  FROM rotations r
  LEFT JOIN last_chore l ON l.task_id = r.id
  LEFT JOIN LATERAL (
    -- place of the last chore's child among the children that still exist (0-based)
    SELECT kept.k
    FROM (
      SELECT c.child, (ROW_NUMBER() OVER (ORDER BY c.n) - 1) AS k
      FROM jsonb_array_elements_text(
             CASE WHEN jsonb_typeof(r.children) = 'array' THEN r.children ELSE '[]'::jsonb END
           ) WITH ORDINALITY AS c(child, n)
      WHERE EXISTS (
        SELECT 1 FROM children ch
        WHERE ch.household_id = r.household_id AND ch.id::text = c.child
      )
    ) kept
    WHERE kept.child = l.child_id::text
    LIMIT 1
  ) place ON true
)
UPDATE tasks t
SET rule_config = t.rule_config || jsonb_build_object('rotationStart', to_char(s.start, 'YYYY-MM-DD'))
FROM starts s
WHERE t.id = s.id;

-- Record the migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('056', 'rotation_start', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
