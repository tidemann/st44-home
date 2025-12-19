# Task: Add Migration Runner to GitHub Actions Deploy Workflow

## Metadata
- **ID**: task-024
- **Feature**: feature-005 - Production Database Deployment & Migration System
- **Epic**: None (Critical Bug Fix)
- **Status**: pending
- **Priority**: critical
- **Created**: 2025-12-14
- **Assigned Agent**: orchestrator
- **Estimated Duration**: 2-3 hours

## Description
Integrate the database migration runner script (from task-022) into the GitHub Actions deployment workflow to ensure migrations are automatically executed before the application starts. This prevents the production database from ever being out of sync with the application code again.

## Requirements
- Add migration runner step to `.github/workflows/deploy.yml`
- Migration step runs BEFORE application containers start
- Migration step has access to production database credentials
- Migration step fails deployment if migrations fail
- Migration logs are visible in GitHub Actions output
- Handle database not being ready (wait/retry logic)
- Ensure migration step is idempotent (safe to re-run)

## Acceptance Criteria
- [ ] `.github/workflows/deploy.yml` updated with migration step
- [ ] Migration step runs after database is available but before app starts
- [ ] Database credentials passed securely from GitHub Secrets
- [ ] Migration runner script executed successfully
- [ ] Deployment fails if migrations fail (exit code check)
- [ ] Migration logs visible in GitHub Actions UI
- [ ] Tested with test deployment (or staging environment if available)
- [ ] Documentation updated with new deployment flow
- [ ] PR created and reviewed

## Dependencies
- task-021 completed (deployment process understood)
- task-022 completed (migration runner script created)
- task-023 completed (production database has schema)
- Production database credentials in GitHub Secrets

## Technical Notes

### Current Deploy Workflow Structure
Review `.github/workflows/deploy.yml` to understand:
- Trigger conditions (push to main)
- Build steps (Docker image creation)
- Deployment target (where images are pushed/deployed)
- Existing steps and their order

### Migration Step Requirements

**Placement:**
```yaml
jobs:
  deploy:
    steps:
      - name: Checkout code
      - name: Build Docker images
      - name: Push Docker images
      - name: Wait for database to be ready    # NEW
      - name: Run database migrations          # NEW
      - name: Deploy application containers    # EXISTING
```

**Database Wait Logic:**
```bash
# Wait for database to accept connections
until pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do
  echo "Waiting for database..."
  sleep 2
done
```

**Migration Execution:**
```bash
# Run migration script
bash docker/postgres/run-migrations.sh
if [ $? -ne 0 ]; then
  echo "Migration failed!"
  exit 1
fi
```

### Secrets Configuration
Required GitHub Secrets (may already exist):
- `DB_HOST` - Production database host
- `DB_PORT` - Database port (5432)
- `DB_NAME` - Database name (st44)
- `DB_USER` - Database user (postgres)
- `DB_PASSWORD` - Database password

**Usage in workflow:**
```yaml
env:
  DB_HOST: ${{ secrets.DB_HOST }}
  DB_PORT: ${{ secrets.DB_PORT }}
  DB_NAME: ${{ secrets.DB_NAME }}
  DB_USER: ${{ secrets.DB_USER }}
  DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
```

### Error Handling
- Database not reachable → Retry with timeout, fail after X attempts
- Migration fails → Log error, fail deployment, don't start app
- Migration succeeds → Log success, continue to app deployment

### Testing Strategy
**Option 1: Test in pull request**
- Create PR with workflow changes
- Use test database credentials
- Verify migration step runs correctly

**Option 2: Staging environment**
- If staging exists, test there first
- Verify migrations work before production deploy

**Option 3: Dry-run mode**
- Add flag to migration script for dry-run
- Test workflow without actually applying migrations

## Affected Areas
- [ ] Frontend (indirectly - ensures schema exists)
- [ ] Backend (indirectly - ensures schema exists)
- [x] Database (migration target)
- [x] Infrastructure (Docker deployment)
- [x] CI/CD (GitHub Actions workflow)
- [x] Documentation

## Implementation Plan

### Research Phase
- [ ] Review current `.github/workflows/deploy.yml` structure
- [ ] Identify where application containers are started
- [ ] Determine how to access database from GitHub Actions runner
- [ ] Confirm GitHub Secrets are configured
- [ ] Check if pg_isready or psql are available in runner

### Design Phase
- [ ] Design step order in workflow
- [ ] Design error handling and retry logic
- [ ] Design logging for migration status
- [ ] Plan testing approach
- [ ] Consider rollback scenario

### Implementation Steps
1. Checkout feature branch for changes
2. Open `.github/workflows/deploy.yml`
3. Add "Wait for database" step
   - Install postgresql-client if needed
   - Use pg_isready to check database
   - Retry logic with timeout
4. Add "Run database migrations" step
   - Pass database credentials as environment variables
   - Execute migration runner script
   - Check exit code
   - Log output
5. Update deployment step if needed
6. Test workflow with PR
7. Document changes in workflow comments
8. Create PR for review

### Testing Strategy
- Create PR with workflow changes
- Trigger workflow on test branch
- Verify migration step appears in logs
- Verify migrations run (check schema_migrations)
- Verify application starts after migrations
- Test failure scenario (break a migration)
- Verify deployment fails gracefully

## Progress Log
- [2025-12-14 02:30] Task created

## Testing Results
[To be filled during testing phase]

### Test Scenarios
- [ ] Scenario 1: Fresh deployment (migrations 000-016)
- [ ] Scenario 2: Incremental deployment (some migrations already applied)
- [ ] Scenario 3: No new migrations (all applied, should skip)
- [ ] Scenario 4: Migration failure (simulate error, verify deployment fails)
- [ ] Scenario 5: Database not reachable (verify retry logic)

## Review Notes
[To be filled during review phase]

## Related PRs
[To be added when PR is created]

## Lessons Learned
[To be filled after completion]

