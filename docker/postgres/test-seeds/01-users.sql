-- Test Seed File: Sample Users
-- Description: Creates sample test users with hashed passwords
-- Usage: Load these users for manual testing or as fixtures
-- Note: Passwords are bcrypt hashed with cost factor 10

-- Sample users for testing
-- Password for all: "SecureTestPass123!"
-- Hash: $2a$10$YourHashHere... (regenerate when needed)

INSERT INTO users (id, email, password_hash, name, provider, created_at, updated_at)
VALUES 
  (
    'user-test-parent-1',
    'parent1@test.local',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- SecureTestPass123!
    'Test Parent 1',
    'email',
    '2025-01-01 00:00:00',
    '2025-01-01 00:00:00'
  ),
  (
    'user-test-parent-2',
    'parent2@test.local',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- SecureTestPass123!
    'Test Parent 2',
    'email',
    '2025-01-01 00:00:00',
    '2025-01-01 00:00:00'
  ),
  (
    'user-test-guest-1',
    'guest@test.local',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- SecureTestPass123!
    'Test Guest',
    'email',
    '2025-01-01 00:00:00',
    '2025-01-01 00:00:00'
  )
ON CONFLICT (email) DO NOTHING;
