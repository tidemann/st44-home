-- Test Seed File: Sample Households and Members
-- Description: Creates sample households with parent members
-- Dependencies: Requires 01-users.sql to be loaded first

-- Sample household: The Smith Family
INSERT INTO households (id, name, created_at, updated_at)
VALUES 
  (
    'household-test-smith',
    'The Smith Family',
    '2025-01-01 00:00:00',
    '2025-01-01 00:00:00'
  )
ON CONFLICT (id) DO NOTHING;

-- Add parent1 as member
INSERT INTO household_members (id, household_id, user_id, role, joined_at)
VALUES 
  (
    'member-smith-parent1',
    'household-test-smith',
    'user-test-parent-1',
    'parent',
    '2025-01-01 00:00:00'
  )
ON CONFLICT (id) DO NOTHING;

-- Sample household: The Johnson Family
INSERT INTO households (id, name, created_at, updated_at)
VALUES 
  (
    'household-test-johnson',
    'The Johnson Family',
    '2025-01-01 00:00:00',
    '2025-01-01 00:00:00'
  )
ON CONFLICT (id) DO NOTHING;

-- Add parent2 as member
INSERT INTO household_members (id, household_id, user_id, role, joined_at)
VALUES 
  (
    'member-johnson-parent2',
    'household-test-johnson',
    'user-test-parent-2',
    'parent',
    '2025-01-01 00:00:00'
  )
ON CONFLICT (id) DO NOTHING;
