# Feature: Production Database Deployment & Migration System

## Metadata
- **ID**: feature-005
- **Epic**: None (Critical Bug Fix / Infrastructure)
- **Status**: pending
- **Priority**: critical (blocking production)
- **Created**: 2025-12-14
- **Estimated Duration**: 1 day (8-10 hours)

## Description
Fix critical production bug where the database schema doesn't exist in the deployed environment, causing 500 errors on user registration. Implement a proper production database deployment strategy that ensures migrations are applied automatically during deployment, and establish monitoring to detect schema issues early.

## User Stories
- **As a** user, **I want** to register an account, **so that** I can use the application (currently broken in production)
- **As a** developer, **I want** migrations to run automatically on deployment, **so that** database schema is always up to date
- **As a** DevOps engineer, **I want** health checks to validate database schema, **so that** deployment issues are caught early
- **As a** system administrator, **I want** visibility into migration status, **so that** I can troubleshoot schema problems

## Requirements

### Functional Requirements
- Apply all existing migrations to production database (000, 001, 011-016)
- Implement automated migration runner in deployment workflow
- Add database health check endpoint that validates schema
- Log migration status and errors for debugging
- Support rollback mechanism for failed deployments
- Ensure idempotent migrations (safe to run multiple times)

### Non-Functional Requirements
- **Performance**: Migration execution < 30 seconds
- **Security**: Migrations run with appropriate database permissions
- **Reliability**: Deployment fails fast if migrations fail
- **Monitoring**: Clear error messages and logging
- **Idempotency**: Safe to re-run migrations

## Acceptance Criteria
- [ ] All migrations (000, 001, 011-016) applied to production database
- [ ] Users can register accounts in production
- [ ] Deployment workflow includes migration runner
- [ ] Health check endpoint validates database schema exists
- [ ] Migration errors logged and deployment fails gracefully
- [ ] Documentation updated with deployment process
- [ ] Migration status visible in monitoring/logs

## Tasks
**🔴 CRITICAL - Production is broken, needs immediate attention**

- [ ] **task-021**: Audit deployment process and identify where migrations should run (1 hour, orchestrator)
- [ ] **task-022**: Create database migration runner script for production (2-3 hours, database)
- [ ] **task-023**: Apply existing migrations to production database (1 hour, database)
- [ ] **task-024**: Add migration runner to GitHub Actions deploy workflow (2-3 hours, orchestrator)
- [ ] **task-025**: Create database health check endpoint with schema validation (2-3 hours, backend)
- [ ] **task-026**: Document production database deployment process (1 hour, orchestrator)

## Dependencies
- Existing migrations in `docker/postgres/migrations/` (already created)
- Production database access (verify credentials and connectivity)
- GitHub Actions Deploy workflow (`.github/workflows/deploy.yml`)

## Technical Notes

### Current State (Broken)
**Production Error:**
```
DatabaseError: relation "users" does not exist
```

**Root Cause:**
- Local development: Migrations applied manually via `docker exec`
- Production: Docker image built with code, but migrations never applied
- Database container starts fresh without schema
- Application code tries to query non-existent tables → 500 errors

### Existing Migrations to Apply
```
000_create_migrations_table.sql      - Migration tracking
001_create_users_table.sql           - User authentication
011_create_households_table.sql      - Multi-tenant foundation
012_create_household_members_table.sql
013_create_children_table.sql
014_create_tasks_table.sql
015_create_task_assignments_table.sql
016_create_task_completions_table.sql
```

### Solution Architecture

**Migration Runner Script** (`docker/postgres/run-migrations.sh`):
```bash
#!/bin/bash
# Connect to production database
# Run migrations in order (000, 001, 011-016)
# Check schema_migrations table
# Apply missing migrations only
# Log success/failure
# Exit with error code if failed
```

**Health Check Endpoint** (`GET /health/database`):
```json
{
  "status": "healthy",
  "database": "connected",
  "migrations": {
    "applied": ["000", "001", "011", "012", "013", "014", "015", "016"],
    "latest": "016",
    "pending": []
  }
}
```

**Deploy Workflow Integration:**
```yaml
- name: Run Database Migrations
  run: |
    # Wait for database to be ready
    # Run migration script
    # Fail deployment if migrations fail
```

### Production Database Access
- Connection via environment variables:
  - `DB_HOST`: Production database host
  - `DB_PORT`: 5432
  - `DB_NAME`: st44
  - `DB_USER`: postgres
  - `DB_PASSWORD`: (from secrets)
- Verify network connectivity (firewall rules, security groups)
- Check database user has CREATE TABLE permissions

## UI/UX Considerations
N/A - This is infrastructure/deployment fix with no direct user interface

## Implementation Plan

### Phase 1: Immediate Fix (Stop the Bleeding)
1. **task-021**: Audit current deployment to understand the issue
2. **task-023**: Manually apply migrations to production database to restore service

### Phase 2: Automated Solution (Prevent Recurrence)
3. **task-022**: Create migration runner script
4. **task-024**: Integrate migration runner into deploy workflow

### Phase 3: Monitoring & Documentation
5. **task-025**: Add health check for schema validation
6. **task-026**: Document the process

## Progress Log
- [2025-12-14 02:30] Feature created - Production broken, users cannot register
- [2025-12-14 02:30] Issue discovered: relation "users" does not exist in production
- [2025-12-14 02:30] Root cause identified: Migrations not applied during deployment

## Testing Strategy
- [ ] Test migration runner locally with fresh database
- [ ] Verify idempotency (run migrations twice, second run is no-op)
- [ ] Test health check endpoint returns correct schema status
- [ ] Test deployment workflow runs migrations before starting services
- [ ] Verify production user registration works after fix
- [ ] Test rollback scenario if migration fails

## Related PRs
[To be added as tasks are implemented]

## Rollback Plan
If migrations fail or cause issues:
1. Revert deploy to previous version
2. Database remains in last known good state (migrations are additive)
3. Investigate migration errors from logs
4. Fix migration script
5. Retry deployment

## Monitoring & Alerts
- Database health check endpoint (`/health/database`)
- Migration logs in deployment output
- Application startup logs should show migration status
- Alert if health check fails after deployment

## Lessons Learned
[To be filled after completion]

### Initial Observations
- Local development process doesn't match production deployment
- Need better dev/prod parity
- Migration testing should be part of CI/CD
- Health checks should validate critical dependencies (database schema)

