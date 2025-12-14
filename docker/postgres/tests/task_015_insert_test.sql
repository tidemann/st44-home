-- Test inserts for task_assignments table
-- Requires existing household, task, and child records

-- Insert valid assignment
INSERT INTO task_assignments (household_id, task_id, child_id, due_date, status)
VALUES (
  '094902ea-9455-4f83-bb81-71b4b24e83b9',
  (SELECT id FROM tasks LIMIT 1),
  (SELECT id FROM children LIMIT 1),
  CURRENT_DATE,
  'pending'
);

-- Verify assignment created with default status
SELECT id, due_date, status, created_at 
FROM task_assignments 
WHERE due_date = CURRENT_DATE;

-- Test invalid status (should fail)
-- INSERT INTO task_assignments (household_id, task_id, child_id, due_date, status)
-- VALUES ('094902ea-9455-4f83-bb81-71b4b24e83b9', (SELECT id FROM tasks LIMIT 1), (SELECT id FROM children LIMIT 1), CURRENT_DATE, 'invalid_status');
