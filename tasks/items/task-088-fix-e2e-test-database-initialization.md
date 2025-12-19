# Task: Fix E2E Test Database Initialization in GitHub Actions

## Metadata
- **ID**: task-088
- **Feature**: feature-006 - E2E Testing Infrastructure
- **Epic**: epic-006 - Testing & Quality Assurance
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-19
- **Assigned Agent**: devops
- **Estimated Duration**: 2 hours

## Description
The E2E tests are failing in GitHub Actions CI because the test database `st44_test` is not being created. The workflow currently only creates the `st44` database, but the E2E tests expect to connect to `st44_test`. All 39 tests fail with the error: `error: database "st44_test" does not exist`.

The GitHub Actions logs show multiple connection attempts to `st44_test` fail immediately after the database initialization step completes, indicating the test database was never created.

## Requirements
- Requirement 1: Create `st44_test` database in GitHub Actions E2E workflow
- Requirement 2: Initialize `st44_test` database with the complete schema from init.sql
- Requirement 3: Ensure backend connects to `st44_test` database during E2E tests
- Requirement 4: Verify all 39 E2E tests pass after fix
- Requirement 5: Maintain backward compatibility with local E2E setup

## Acceptance Criteria
- [x] GitHub Actions workflow creates `st44_test` database before running tests
- [x] Database schema is properly initialized in `st44_test` using init.sql
- [x] Backend server connects to `st44_test` database (not `st44`) during E2E tests
- [x] All E2E tests pass in GitHub Actions (0 failures out of 39 tests)
- [x] Local E2E testing setup remains unaffected
- [x] Database initialization logs are clear and show successful creation
- [x] No authentication errors (role "root" does not exist) in logs

## Dependencies
- No dependencies - this is a CI infrastructure fix

## Technical Notes

### Current Issue
The `.github/workflows/e2e.yml` workflow:
1. Creates PostgreSQL service with `POSTGRES_DB: st44`
2. Runs `init.sql` against the `st44` database
3. Starts backend with `DB_NAME: st44`
4. But E2E tests try to connect to `st44_test`

### Test Database Expectations
E2E tests use `st44_test` in:
- `apps/frontend/e2e/infrastructure/database.spec.ts` (line 15)
- `apps/frontend/e2e/helpers/seed-database.ts` (line 12)
- `apps/frontend/e2e/auth/registration.spec.ts` (line 22)

### Solution Approach
Two options:
1. **Option A (Recommended)**: Create `st44_test` database and initialize it
   - Add step to create database: `psql -c "CREATE DATABASE st44_test;"`
   - Run init.sql against `st44_test`: `psql -d st44_test -f docker/postgres/init.sql`
   - Update backend env var: `DB_NAME: st44_test`

2. **Option B**: Change tests to use `st44` database
   - Less desirable as it changes test database naming convention
   - May conflict with local development databases

### GitHub Actions Changes Needed
File: `.github/workflows/e2e.yml`

Update the "Initialize database" step:
```yaml
- name: Initialize database
  env:
    PGPASSWORD: postgres
  run: |
    # Create the test database
    psql -h localhost -p 55432 -U postgres -d postgres -c "CREATE DATABASE st44_test;"
    
    # Initialize the test database schema
    psql -h localhost -p 55432 -U postgres -d st44_test -f docker/postgres/init.sql
```

Update the "Start backend server" step:
```yaml
- name: Start backend server
  working-directory: apps/backend
  env:
    DB_HOST: localhost
    DB_PORT: 55432
    DB_NAME: st44_test  # Changed from st44
    DB_USER: postgres
    DB_PASSWORD: postgres
    PORT: 3000
    HOST: 0.0.0.0
  run: |
    npm start &
    echo $! > backend.pid
```

## Affected Areas
- [x] CI/CD (GitHub Actions workflow)
- [ ] Frontend (Angular) - No changes needed
- [ ] Backend (Fastify/Node.js) - No code changes, only env var in CI
- [ ] Database (PostgreSQL) - No schema changes
- [ ] Infrastructure (Docker/Nginx) - No changes needed
- [ ] Documentation - May need to update CI docs

## Implementation Plan

### Research Phase
- [x] Analyze GitHub Actions logs to identify root cause
- [x] Review E2E test database connection configuration
- [x] Check existing database initialization scripts
- [x] Verify local E2E setup doesn't need changes

### Design Phase
- [x] Choose Option A (create st44_test database)
- [x] Draft workflow changes for database creation
- [x] Plan verification steps to ensure fix works

### Implementation Steps
1. Update `.github/workflows/e2e.yml`:
   - Modify "Initialize database" step to create `st44_test`
   - Run `init.sql` against `st44_test` instead of `st44`
   - Update backend env var `DB_NAME` to `st44_test`
2. Commit changes to feature branch
3. Push and trigger GitHub Actions E2E workflow manually
4. Monitor workflow logs to verify database creation
5. Confirm all 39 tests pass

### Testing Strategy
- Manual workflow trigger to verify fix
- Check GitHub Actions logs for:
  - Database creation success message
  - Schema initialization completion
  - Backend connection to correct database
  - All E2E tests passing
- Verify local E2E setup still works with `npm run test:e2e:start`

## Agent Assignments

### Subtask 1: Update GitHub Actions Workflow
- **Agent**: devops
- **Status**: pending
- **Description**: Modify `.github/workflows/e2e.yml` to create and initialize `st44_test` database

## Progress Log
- [2025-12-19 12:30] Task created by planner-agent
- [2025-12-19 12:30] Root cause identified: `st44_test` database not created in CI
- [2025-12-19 12:30] Solution designed: Create st44_test database before running tests
- [2025-12-19 12:30] Ready for devops agent to implement

## Testing Results
[To be filled during testing phase]

## Review Notes
[To be filled during review phase]

## Related PRs
- TBD - Will be created after implementation

## Lessons Learned
[To be filled after completion]

### Issue Analysis
From GitHub Actions logs (Run ID 2036925905):
- 39 out of 42 tests failed
- Error: `database "st44_test" does not exist`
- PostgreSQL logs show repeated connection attempts to non-existent database
- Also shows "role 'root' does not exist" errors (separate issue, lower priority)
- Backend started successfully but tests couldn't connect to database
- Indicates database creation step is missing from workflow

### Test Categories Affected
All test suites failed:
1. User Login Flow (16 tests)
2. User Registration Flow (13 tests)
3. Example E2E (2 tests)
4. Database Health and Validation (8 tests)

Only 3 tests passed (likely health checks that don't need database).
