-- Test inserts for task_completions table
-- Requires existing household, task_assignment, and child records

-- Insert valid completion
INSERT INTO task_completions (household_id, task_assignment_id, child_id, points_earned)
VALUES (
  '094902ea-9455-4f83-bb81-71b4b24e83b9',
  (SELECT id FROM task_assignments LIMIT 1),
  (SELECT id FROM children LIMIT 1),
  15
);

-- Verify completion created with automatic timestamp
SELECT id, child_id, points_earned, completed_at 
FROM task_completions 
ORDER BY completed_at DESC 
LIMIT 5;

-- Analytics query: Total points by child
SELECT child_id, SUM(points_earned) as total_points, COUNT(*) as tasks_completed
FROM task_completions
WHERE household_id = '094902ea-9455-4f83-bb81-71b4b24e83b9'
GROUP BY child_id
ORDER BY total_points DESC;
