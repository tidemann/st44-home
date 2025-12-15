-- Test Seed File: Sample Children
-- Description: Creates sample child records for test households
-- Dependencies: Requires 02-households.sql to be loaded first

-- Children for The Smith Family
INSERT INTO children (id, household_id, name, age, created_at, updated_at)
VALUES 
  (
    'child-smith-emma',
    'household-test-smith',
    'Emma Smith',
    8,
    '2025-01-01 00:00:00',
    '2025-01-01 00:00:00'
  ),
  (
    'child-smith-noah',
    'household-test-smith',
    'Noah Smith',
    10,
    '2025-01-01 00:00:00',
    '2025-01-01 00:00:00'
  )
ON CONFLICT (id) DO NOTHING;

-- Children for The Johnson Family
INSERT INTO children (id, household_id, name, age, created_at, updated_at)
VALUES 
  (
    'child-johnson-olivia',
    'household-test-johnson',
    'Olivia Johnson',
    7,
    '2025-01-01 00:00:00',
    '2025-01-01 00:00:00'
  ),
  (
    'child-johnson-liam',
    'household-test-johnson',
    'Liam Johnson',
    9,
    '2025-01-01 00:00:00',
    '2025-01-01 00:00:00'
  ),
  (
    'child-johnson-ava',
    'household-test-johnson',
    'Ava Johnson',
    11,
    '2025-01-01 00:00:00',
    '2025-01-01 00:00:00'
  )
ON CONFLICT (id) DO NOTHING;
