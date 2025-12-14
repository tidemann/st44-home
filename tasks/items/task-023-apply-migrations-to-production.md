# Task: Apply Existing Migrations to Production Database

## Metadata
- **ID**: task-023
- **Feature**: feature-005 - Production Database Deployment & Migration System
- **Epic**: None (Critical Bug Fix)
- **Status**: pending
- **Priority**: critical (immediate - restore service)
- **Created**: 2025-12-14
- **Assigned Agent**: database
- **Estimated Duration**: 1 hour

## Description
**IMMEDIATE FIX**: Manually apply all existing database migrations to the production database to restore service. This is the emergency fix to unblock users who cannot register. Once this is complete, users will be able to register and the application will function correctly. Task-022 and task-024 will prevent this from happening again.

## Requirements
- Connect to production PostgreSQL database
- Verify database is accessible and credentials work
- Apply migrations in order: 000, 001, 011, 012, 013, 014, 015, 016
- Verify each migration completes successfully
- Confirm all tables exist after migrations
- Test user registration endpoint works
- Document the process for future reference

## Acceptance Criteria
- [ ] Production database connection established
- [ ] Migration 000: schema_migrations table created
- [ ] Migration 001: users table created
- [ ] Migration 011: households table created
- [ ] Migration 012: household_members table created
- [ ] Migration 013: children table created
- [ ] Migration 014: tasks table created
- [ ] Migration 015: task_assignments table created
- [ ] Migration 016: task_completions table created
- [ ] All foreign keys and indexes verified
- [ ] schema_migrations table shows all 8 migrations applied
- [ ] User registration works in production (test with real request)
- [ ] No errors in production logs after fix
- [ ] Process documented for next time

## Dependencies
- Production database credentials
- Access to production environment
- Existing migration files in `docker/postgres/migrations/`

## Technical Notes

### Current Production Error
```
DatabaseError: relation "users" does not exist
POST /api/auth/register → 500
```

### Migration Files to Apply
Location: `docker/postgres/migrations/`

1. `000_create_migrations_table.sql` - Creates schema_migrations tracking table
2. `001_create_users_table.sql` - Users + user_sessions for authentication
3. `011_create_households_table.sql` - Multi-tenant households
4. `012_create_household_members_table.sql` - User-household relationships
5. `013_create_children_table.sql` - Child profiles
6. `014_create_tasks_table.sql` - Task templates with JSONB rules
7. `015_create_task_assignments_table.sql` - Task instances assigned to children
8. `016_create_task_completions_table.sql` - Completion history for analytics

### Execution Methods

**Option 1: Docker exec (if database in Docker)**
```bash
# Copy migrations to database container
docker cp docker/postgres/migrations/000_create_migrations_table.sql st44-db:/tmp/
docker exec -it st44-db psql -U postgres -d st44 -f /tmp/000_create_migrations_table.sql

# Repeat for each migration...
```

**Option 2: psql from local machine (if database is remote)**
```bash
psql -h production-db-host -U postgres -d st44 -f docker/postgres/migrations/000_create_migrations_table.sql
```

**Option 3: Database management tool**
- pgAdmin, DBeaver, or similar
- Connect to production database
- Execute each migration file manually
- Verify results after each one

### Verification Queries
After applying migrations:
```sql
-- Check schema_migrations table
SELECT * FROM schema_migrations ORDER BY version;

-- Verify tables exist
\dt

-- Verify users table structure
\d users

-- Test insert (will fail on duplicate if registration works)
INSERT INTO users (email, password_hash) 
VALUES ('test@example.com', 'dummy_hash');
```

### Safety Considerations
- **Backups**: Verify database backups exist before running migrations
- **Read-only check**: Ensure no users are actively using the system (registration is broken anyway)
- **Rollback**: Migrations are additive (CREATE TABLE IF NOT EXISTS), safe to run
- **Idempotency**: Each migration has ON CONFLICT DO NOTHING for schema_migrations
- **Testing**: After each migration, verify no errors before proceeding

### Post-Fix Testing
```bash
# Test registration endpoint
curl -X POST https://home.st44.no/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'

# Should return 201 or 409 (if email exists), NOT 500
```

## Affected Areas
- [ ] Frontend (indirectly - registration will work)
- [ ] Backend (indirectly - queries will succeed)
- [x] Database (direct - applying schema)
- [ ] Infrastructure
- [ ] CI/CD
- [x] Documentation

## Implementation Plan

### Preparation Phase
- [ ] Verify production database credentials
- [ ] Test database connectivity
- [ ] Review migration files for syntax errors
- [ ] Verify database has sufficient disk space
- [ ] Ensure database backup exists

### Execution Phase
1. Connect to production database
2. Verify database name and user permissions
3. Apply migration 000 (schema_migrations table)
4. Verify schema_migrations table exists
5. Apply migration 001 (users table)
6. Verify users table exists
7. Apply migration 011 (households table)
8. Verify households table exists
9. Apply migration 012 (household_members table)
10. Verify household_members table exists
11. Apply migration 013 (children table)
12. Verify children table exists
13. Apply migration 014 (tasks table)
14. Verify tasks table exists
15. Apply migration 015 (task_assignments table)
16. Verify task_assignments table exists
17. Apply migration 016 (task_completions table)
18. Verify task_completions table exists
19. Query schema_migrations to confirm all 8 migrations recorded
20. Test user registration endpoint

### Documentation Phase
- [ ] Document the exact commands used
- [ ] Note any issues encountered
- [ ] Record migration application time
- [ ] Update task with results

## Progress Log
- [2025-12-14 02:30] Task created - Emergency fix to restore production service

## Testing Results
[To be filled after migrations applied]

### Pre-Migration State
- [ ] Database accessible: ___
- [ ] Existing tables: ___
- [ ] Registration endpoint status: BROKEN (500 error)

### Post-Migration State
- [ ] All 8 migrations applied: ___
- [ ] schema_migrations records: ___
- [ ] Table count: ___
- [ ] Registration endpoint status: ___

## Review Notes
[To be filled during review phase]

## Related PRs
N/A - Manual database operation, no code changes

## Lessons Learned
[To be filled after completion]

### Expected Lessons
- Manual database operations are error-prone
- Need automated migration system (task-022, task-024)
- Need better dev/prod parity
- Need database schema validation in health checks (task-025)

