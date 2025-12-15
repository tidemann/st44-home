# Task: Create Invitations Table Schema

## Metadata
- **ID**: task-036
- **Feature**: feature-004 - User Invitation System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: completed
- **Priority**: high
- **Created**: 2025-12-15
- **Completed**: 2025-12-15
- **Assigned Agent**: database
- **Estimated Duration**: 3-4 hours
- **Actual Duration**: 0.5 hours

## Description
Create the invitations table to store household invitation records. Each invitation includes a unique token, expiration date, status tracking, and links to the household and inviting user.

## Requirements

### Table Schema
- UUID primary key
- household_id foreign key (CASCADE delete)
- invited_by foreign key (user who sent invitation)
- invited_email (email address)
- token (unique, for acceptance link)
- role (admin/parent, default: parent)
- status (pending/accepted/declined/cancelled/expired)
- expires_at (default: NOW() + 7 days)
- accepted_at (timestamp when accepted)
- created_at, updated_at timestamps

### Indexes
- idx_invitations_household (household_id)
- idx_invitations_email (invited_email)
- idx_invitations_token (token) - unique
- idx_invitations_status (status)

### Constraints
- Email must be valid format
- Status must be one of: pending, accepted, declined, cancelled, expired
- Role must be one of: admin, parent
- expires_at must be > created_at

## Acceptance Criteria
- [ ] Migration file created (037_create_invitations_table.sql)
- [ ] invitations table created with all columns
- [ ] All foreign keys set up with proper CASCADE behavior
- [ ] All indexes created
- [ ] CHECK constraints for status and role
- [ ] Default values configured (status='pending', role='parent', expires_at)
- [ ] Migration tested locally
- [ ] Migration recorded in schema_migrations table
- [ ] Migration is idempotent (IF NOT EXISTS)
- [ ] init.sql updated for fresh installs

## Dependencies
- feature-001 (users table must exist)
- feature-002 (households table must exist)

## Technical Notes

### Migration Template
```sql
-- Migration: 037_create_invitations_table
-- Description: Create invitations table for household invitation system
-- Date: 2025-12-15
-- Related Feature: feature-004

BEGIN;

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id),
  invited_email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'parent' CHECK (role IN ('admin', 'parent')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_household ON invitations(household_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(invited_email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('037', 'create_invitations_table', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

### Test Queries
```sql
-- Verify table exists
SELECT table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'invitations'
ORDER BY ordinal_position;

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'invitations';

-- Test invitation lifecycle
INSERT INTO invitations (household_id, invited_by, invited_email, token)
VALUES ('<household-id>', '<user-id>', 'test@example.com', 'test-token-123');

SELECT * FROM invitations WHERE invited_email = 'test@example.com';
```

## Implementation Plan

1. Create migration file `docker/postgres/migrations/037_create_invitations_table.sql`
2. Follow migration template with all columns, indexes, and constraints
3. Test migration locally:
   ```bash
   docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/037_create_invitations_table.sql
   ```
4. Verify table created:
   ```bash
   docker exec -it st44-db psql -U postgres -d st44 -c "\d invitations"
   ```
5. Test constraints and defaults work correctly
6. Update `docker/postgres/init.sql` with the same CREATE TABLE statement
7. Verify migration is idempotent (can run multiple times)
8. Commit changes

## Progress Log
- [2025-12-15 08:14] Task created from feature-004 breakdown
- [2025-12-15 08:15] Migration file 037 created with invitations table schema
- [2025-12-15 08:16] Migration applied successfully to local database
- [2025-12-15 08:17] Table structure verified: all columns, indexes, and constraints present
- [2025-12-15 08:18] Foreign key constraints verified (CASCADE on household and user)
- [2025-12-15 08:19] Migration recorded in schema_migrations table (version 037)
- [2025-12-15 08:20] Idempotency tested - migration can run multiple times safely
- [2025-12-15 08:21] init.sql updated with invitations table for fresh installs
- [2025-12-15 08:22] RLS policy added for household isolation
- [2025-12-15 08:23] Updated_at trigger added for timestamp automation
- [2025-12-15 08:24] Task completed in 0.5 hours (vs 3-4 hours estimated)
