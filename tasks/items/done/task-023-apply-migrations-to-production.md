# Task: Apply Existing Migrations to Production Database

## Metadata
- **ID**: task-023
- **Feature**: feature-005 - Production Database Deployment & Migration System
- **Epic**: None (Critical Bug Fix)
- **Status**: completed
- **Priority**: critical (immediate - restore service)
- **Created**: 2025-12-14
- **Assigned Agent**: database
- **Estimated Duration**: 1 hour
- **Completed**: 2025-12-14

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
- [x] Production database connection established
- [x] Migration 000: schema_migrations table created
- [x] Migration 001: users table created
- [x] Migration 011: households table created
- [x] Migration 012: household_members table created
- [x] Migration 013: children table created
- [x] Migration 014: tasks table created
- [x] Migration 015: task_assignments table created
- [x] Migration 016: task_completions table created
- [x] All foreign keys and indexes verified
- [x] schema_migrations table shows all 8 migrations applied
- [x] User registration works in production (test with real request)
- [x] No errors in production logs after fix
- [x] Process documented for next time

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
- [2025-12-14 02:21] PR #39 merged - Root cause fixed (migrations now embedded in Docker image)
- [2025-12-14 02:21] Manual migration application still needed to restore current production
- [2025-12-14 02:35] Deployment workflow fixed - health checks now use correct port 3000
- [2025-12-14 02:40] Deployment successful - all health checks passing
- [2025-12-14 02:47] **VERIFIED PRODUCTION OPERATIONAL**:
  - Database health check: HEALTHY
  - All 8 migrations applied: 000, 001, 011-016
  - All critical tables exist: users, households, household_members, children, tasks, task_assignments, task_completions
  - User registration tested successfully: Created user with ID 956dce5f-1d1b-4a86-b1c7-4edea313a16e
- [2025-12-14 02:48] Status changed to completed - Production service restored

## Testing Results

### Pre-Migration State
- [x] Database accessible: YES (production PostgreSQL)
- [x] Existing tables: NONE (clean database)
- [x] Registration endpoint status: BROKEN (500 error - relation "users" does not exist)

### Post-Migration State
- [x] All 8 migrations applied: YES (000, 001, 011, 012, 013, 014, 015, 016)
- [x] schema_migrations records: 8 migrations recorded
- [x] Table count: 7 critical tables + schema_migrations
- [x] Registration endpoint status: **WORKING** (201 response, user created)

## Review Notes
[To be filled during review phase]

## Related PRs
N/A - Manual database operation, no code changes

## Lessons Learned

### What Worked Well
- **Automated migration system** (PR #38 + PR #39): Migrations now embedded in Docker image and run automatically during deployment
- **Health check endpoints**: /health/database endpoint provided detailed verification of migration status
- **Docker deployment workflow**: Once corrected to use port 3000, health checks work reliably
- **Idempotent migrations**: All migrations designed to be safe to run multiple times

### What Didn't Work
- **Initial deployment**: Health checks were using wrong port (localhost:80 instead of localhost:3000)
- **Port assumptions**: Assumed standard nginx port 80 setup, but production has custom port mappings
- **Manual intervention**: Originally planned for manual migration application, but automated system worked once workflow was fixed

### Process Improvements
1. **Documentation**: Production architecture now documented (Frontend:3001, Backend:3000, DB:5432)
2. **Health checks**: Workflow now correctly checks backend on port 3000
3. **Migration automation**: No manual intervention needed for future deployments
4. **Testing**: Health check endpoint provides comprehensive validation

### Preventative Measures (Already Implemented)
- Migration files embedded in Docker image (PR #39)
- Automatic migration execution in deployment workflow (PR #38)
- Health check verification before completing deployment
- Database schema validation in health endpoint (PR #38)

### Future Considerations
- Consider adding E2E tests to catch production issues before deployment (feature-006)
- Document production port mappings in deployment documentation
- Add pre-deployment smoke tests for critical endpoints

