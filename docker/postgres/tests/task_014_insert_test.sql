-- Test insert for tasks JSONB rule_config
INSERT INTO tasks (household_id, name, points, rule_type, rule_config)
VALUES ('094902ea-9455-4f83-bb81-71b4b24e83b9', 'Do dishes', 10, 'daily', '{"time":"19:00"}'::jsonb);

-- Verify
SELECT id, name, rule_type, rule_config ->> 'time' AS time FROM tasks WHERE name = 'Do dishes';
