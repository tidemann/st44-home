# Task: Create Users Table with Profile Fields

## Metadata
- **ID**: task-001
- **Feature**: feature-001 - User Profile Management
- **Epic**: None
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-13
- **Assigned Agent**: database
- **Estimated Duration**: 2-3 hours

## Description
Create a new `users` table in PostgreSQL with fields needed for user profiles: username, email, name, bio, avatar_url. Include proper constraints, indexes, and triggers for `updated_at` timestamp.

## Requirements
1. Create users table with appropriate columns
2. Add primary key, constraints, and indexes
3. Add `updated_at` trigger following project pattern
4. Update database documentation
5. Consider future authentication needs

## Acceptance Criteria
- [ ] Users table created with all required columns
- [ ] Username is unique and not null
- [ ] Email is unique and not null
- [ ] Name and bio allow NULL (optional fields)
- [ ] Timestamps (created_at, updated_at) included
- [ ] updated_at trigger configured
- [ ] Changes documented in docker/AGENT.md
- [ ] init.sql follows existing formatting patterns

## Dependencies
None - foundational task

## Technical Notes

### Schema Design
```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  bio TEXT,
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for common queries
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Trigger for updated_at (following project pattern)
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert sample user for testing
INSERT INTO users (username, email, name, bio) VALUES
  ('testuser', 'test@example.com', 'Test User', 'This is a test user profile');
```

### Files to Modify
- `docker/postgres/init.sql` - Add users table definition
- `docker/AGENT.md` - Document new schema

### Considerations
- Username: Short alphanumeric identifier for display
- Email: For authentication (future) and contact
- Name: Full display name (optional, can differ from username)
- Bio: User description/about me
- Avatar URL: Will store image URLs (future upload feature)

## Implementation Plan
1. Add users table to init.sql after items table
2. Follow same pattern as items (constraints, indexes, trigger)
3. Add sample data for development/testing
4. Update docker/AGENT.md with schema documentation
5. Test by rebuilding database container

## Progress Log
- [2025-12-13 DRY RUN] Task created by Orchestrator during feature breakdown
