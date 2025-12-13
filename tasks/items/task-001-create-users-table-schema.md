# Task: Create Users Table Schema

## Metadata
- **ID**: task-001
- **Feature**: feature-001 - User Authentication System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: critical
- **Created**: 2025-12-13
- **Assigned Agent**: database
- **Estimated Duration**: 2-3 hours

## Description
Create the users table in PostgreSQL with proper constraints, indexes, and security considerations. This table is the foundation for user authentication and will store user credentials securely. Supports both email/password authentication and OAuth (Google) authentication where password is not required.

## Requirements
- Table named `users` with UUID primary key
- Email field with UNIQUE constraint
- Password hash field (nullable for OAuth users)
- OAuth provider and provider_id fields (for Google Sign-In)
- Timestamp fields for created_at and updated_at
- Index on email for fast lookups
- Index on provider + provider_id for OAuth lookups
- Proper data types and constraints

## Acceptance Criteria
- [ ] Users table created with all required fields
- [ ] UUID used as primary key with auto-generation
- [ ] Email field has UNIQUE constraint
- [ ] Email field has NOT NULL constraint
- [ ] Password_hash field is NULLABLE (for OAuth users)
- [ ] OAuth fields (provider, provider_id) added
- [ ] Constraint ensures either password or OAuth is provided
- [ ] Index created on email column
- [ ] Unique index created on (oauth_provider, oauth_provider_id)
- [ ] Timestamps have default values
- [ ] Schema documented in init.sql
- [ ] Migration can be applied to existing database
- [ ] Migration can be rolled back cleanly

## Dependencies
- PostgreSQL 17 database running
- Existing init.sql file structure

## Technical Notes

### Schema Definition
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- Nullable for OAuth users
  oauth_provider VARCHAR(50), -- 'google', 'microsoft', etc.
  oauth_provider_id VARCHAR(255), -- User ID from OAuth provider
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT check_auth_method CHECK (
    (password_hash IS NOT NULL) OR 
    (oauth_provider IS NOT NULL AND oauth_provider_id IS NOT NULL)
  )
);

CREATE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_oauth ON users(oauth_provider, oauth_provider_id) WHERE oauth_provider IS NOT NULL;

-- Optional: Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Data Types (nullable for OAuth)
- **VARCHAR(50)**: OAuth provider name ('google', 'microsoft', 'facebook', etc.)
- **VARCHAR(255)**: OAuth provider's user ID
- **TIMESTAMP**: PostgreSQL native timestamp type

### Security Considerations
- NEVER store plain text passwords
- Email uniqueness prevents duplicate accounts
- UUID prevents enumeration attacks
- Index on email for fast authentication queries
- OAuth users don't have passwords, use provider authentication
- CHECK constraint ensures users have either password OR OAuth credentials
- Unique index on OAuth provider+ID prevents duplicate OAuth account
- Email uniqueness prevents duplicate accounts
- UUID prevents enumeration attacks
- Index on email for fast authentication queries

## Affected Areas
- [x] Database (PostgreSQL)
- [ ] Backend (needs to use this schema)
- [ ] Infrastructure (Docker init script)

## Implementation Plan

### Research Phase
- [x] Review existing init.sql structure
- [x] Confirm PostgreSQL version features (gen_random_uuid available in PG 17)
- [x] Review bcrypt hash length requirements

### Implementation Steps
1. Add users table to `docker/postgres/init.sql`
2. Place after database creation but before any dependent tables
3. Add index creation
4. Add updated_at trigger (optional but recommended)
5. Test by restarting database container
6. Verify table created with `\d users` in psql

### Testing Strategy
- Verify table exists: `SELECT * FROM pg_tables WHERE tablename = 'users';`
- Verify index exists: `SELECT * FROM pg_indexes WHERE tablename = 'users';`
- Test unique constraint: Try inserting duplicate email
- Test UUID generation: Insert row without specifying ID

## Progress Log
- [2025-12-13 21:45] Task created from feature-001 breakdown

## Related Files
- `docker/postgres/init.sql` - Database initialization script
- `docker/postgres/Dockerfile` - Database container setup

## Testing Commands
```bash
# Restart database to apply changes
cd infra && docker compose down db && docker compose up -d db

# Connect to database
docker exec -it st44-db psql -U postgres -d st44

# Verify table
\d users

# Test insert
INSERT INTO users (email, password_hash) VALUES ('test@example.com', 'hash123');

# Verify
SELECT * FROM users;
```

## Lessons Learned
[To be filled after completion]
