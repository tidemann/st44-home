# Task: Create Database Migration Runner Script for Production

## Metadata
- **ID**: task-022
- **Feature**: feature-005 - Production Database Deployment & Migration System
- **Epic**: None (Critical Bug Fix)
- **Status**: pending
- **Priority**: critical
- **Created**: 2025-12-14
- **Assigned Agent**: database
- **Estimated Duration**: 2-3 hours

## Description
Create a production-ready migration runner script that can execute database migrations safely and idempotently. The script should connect to a PostgreSQL database, check which migrations have been applied, execute pending migrations in order, handle errors gracefully, and log all actions for debugging.

## Requirements
- Script can run in GitHub Actions environment or Docker container
- Connects to PostgreSQL using environment variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
- Reads migration files from `docker/postgres/migrations/`
- Checks `schema_migrations` table to determine applied migrations
- Executes migrations in alphanumeric order (000, 001, 011-016, etc.)
- Idempotent: Safe to run multiple times (skips already-applied migrations)
- Exits with error code if any migration fails
- Logs migration status (applied, skipped, failed)
- Validates database connectivity before running migrations

## Acceptance Criteria
- [ ] Migration runner script created (`docker/postgres/run-migrations.sh` or similar)
- [ ] Script connects to database using environment variables
- [ ] Script reads and sorts migration files correctly
- [ ] Script checks schema_migrations table for applied migrations
- [ ] Script executes pending migrations in correct order
- [ ] Script handles errors and exits with non-zero code on failure
- [ ] Script logs all actions (connecting, checking, applying, success/failure)
- [ ] Script is idempotent (running twice is safe)
- [ ] Tested locally with fresh database
- [ ] Tested locally with partially migrated database (idempotency)
- [ ] Documentation added to script (comments explaining logic)

## Dependencies
- task-021 completed (deployment process understood)
- Existing migration files in `docker/postgres/migrations/`
- PostgreSQL `psql` client available in execution environment

## Technical Notes

### Implementation Language Options
1. **Bash script** - Simple, works in most environments, no dependencies
2. **Node.js script** - Can use pg library, more robust error handling
3. **Python script** - Good database support, but adds dependency

**Recommendation**: Bash script with psql for simplicity

### Script Requirements

**Connection String:**
```bash
PGHOST=${DB_HOST:-localhost}
PGPORT=${DB_PORT:-5432}
PGDATABASE=${DB_NAME:-st44}
PGUSER=${DB_USER:-postgres}
PGPASSWORD=${DB_PASSWORD}
```

**Migration Logic:**
```bash
# 1. Wait for database to be ready
# 2. Connect and verify schema_migrations exists
# 3. Get list of applied migrations
# 4. Get list of migration files
# 5. For each migration file:
#    a. Check if already applied (in schema_migrations)
#    b. If not applied, execute it
#    c. Record in schema_migrations
#    d. Log result
# 6. Exit 0 if all successful, exit 1 if any failed
```

**Error Handling:**
- Database connection failed → Exit 1 with clear message
- Migration file syntax error → Exit 1, show which migration failed
- Already applied migrations → Skip with log message
- Transaction support → Each migration in its own transaction

### Migration File Format
Existing migrations follow this pattern:
```sql
BEGIN;

CREATE TABLE IF NOT EXISTS tablename (...);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('XXX', 'migration-name', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

**Important**: Migrations already include their own schema_migrations insert, so script only needs to execute the file.

### Testing Strategy
```bash
# Test 1: Fresh database
docker exec -it st44-db psql -U postgres -d st44 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
./run-migrations.sh
# Verify all tables exist

# Test 2: Idempotency
./run-migrations.sh  # Should skip all migrations
# Verify no errors, no duplicate data

# Test 3: Partial state
# Apply migrations 000, 001 only
# Run script
# Verify 011-016 get applied, 000-001 skipped
```

## Affected Areas
- [ ] Frontend
- [ ] Backend (indirectly - migrations enable backend to work)
- [x] Database (migration target)
- [x] Infrastructure (script will run in deploy environment)
- [x] CI/CD (script will be called from GitHub Actions)
- [ ] Documentation

## Implementation Plan

### Research Phase
- [ ] Review existing migration files for patterns
- [ ] Confirm psql is available in GitHub Actions runners
- [ ] Determine best location for script (`docker/postgres/` or `scripts/`)
- [ ] Review PostgreSQL error codes for better error handling

### Design Phase
- [ ] Decide on script language (Bash recommended)
- [ ] Design script structure (functions for connect, check, apply)
- [ ] Design logging format (timestamps, levels, messages)
- [ ] Plan error handling strategy

### Implementation Steps
1. Create script file: `docker/postgres/run-migrations.sh`
2. Add shebang, set -e for error handling
3. Implement database connection function
4. Implement get_applied_migrations function
5. Implement get_migration_files function
6. Implement apply_migration function
7. Implement main logic loop
8. Add logging throughout
9. Make script executable: `chmod +x`
10. Test with fresh database
11. Test idempotency
12. Test error scenarios

### Testing Strategy
- Test with fresh database (no schema_migrations)
- Test with partial migrations applied
- Test idempotency (run twice, second run is no-op)
- Test with invalid migration file (syntax error)
- Test with database connection failure
- Test with wrong credentials

## Progress Log
- [2025-12-14 02:30] Task created

## Testing Results
[To be filled during testing phase]

## Review Notes
[To be filled during review phase]

## Related PRs
[To be added when PR is created]

## Lessons Learned
[To be filled after completion]

