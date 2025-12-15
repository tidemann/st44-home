-- Test Seed File: Sample Tasks
-- Description: Creates sample tasks for test households
-- Dependencies: Requires 02-households.sql to be loaded first

-- Tasks for The Smith Family
INSERT INTO tasks (id, household_id, name, description, assignment_rule, created_at, updated_at)
VALUES 
  (
    'task-smith-clean-room',
    'household-test-smith',
    'Clean Room',
    'Make bed, organize toys, and put away clothes',
    'weekly_rotation',
    '2025-01-01 00:00:00',
    '2025-01-01 00:00:00'
  ),
  (
    'task-smith-homework',
    'household-test-smith',
    'Do Homework',
    'Complete all school assignments before dinner',
    'manual',
    '2025-01-01 00:00:00',
    '2025-01-01 00:00:00'
  ),
  (
    'task-smith-feed-pet',
    'household-test-smith',
    'Feed Pet',
    'Feed and water the family dog',
    'weekly_rotation',
    '2025-01-01 00:00:00',
    '2025-01-01 00:00:00'
  )
ON CONFLICT (id) DO NOTHING;

-- Tasks for The Johnson Family
INSERT INTO tasks (id, household_id, name, description, assignment_rule, created_at, updated_at)
VALUES 
  (
    'task-johnson-dishes',
    'household-test-johnson',
    'Load Dishwasher',
    'Clear table and load dishwasher after dinner',
    'weekly_rotation',
    '2025-01-01 00:00:00',
    '2025-01-01 00:00:00'
  ),
  (
    'task-johnson-trash',
    'household-test-johnson',
    'Take Out Trash',
    'Take trash and recycling to the curb',
    'manual',
    '2025-01-01 00:00:00',
    '2025-01-01 00:00:00'
  )
ON CONFLICT (id) DO NOTHING;
