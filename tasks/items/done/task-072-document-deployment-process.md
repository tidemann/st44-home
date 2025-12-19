# Task: Document Production Database Deployment Process

## Metadata
- **ID**: task-026
- **Feature**: feature-005 - Production Database Deployment & Migration System
- **Epic**: None (Critical Bug Fix)
- **Status**: pending
- **Priority**: medium
- **Created**: 2025-12-14
- **Assigned Agent**: orchestrator
- **Estimated Duration**: 1 hour

## Description
Create comprehensive documentation for the production database deployment process, including how migrations are applied, how to troubleshoot issues, and best practices for future schema changes. This documentation will help developers understand the deployment pipeline and reduce the risk of future database-related production issues.

## Requirements
- Document the complete deployment flow (code → build → migrate → deploy)
- Explain how migrations are executed automatically
- Provide troubleshooting guide for common issues
- Document how to create new migrations
- Explain rollback procedures
- Include examples and commands
- Document health check endpoint usage
- Add links to relevant files and tools

## Acceptance Criteria
- [ ] Deployment flow documented with diagram
- [ ] Migration execution process explained
- [ ] Troubleshooting guide created
- [ ] New migration creation guide added
- [ ] Rollback procedures documented
- [ ] Health check endpoint documented
- [ ] Common issues and solutions listed
- [ ] Examples and code snippets included
- [ ] Documentation reviewed for clarity
- [ ] Documentation published (in README, wiki, or docs folder)

## Dependencies
- task-021 completed (deployment process understood)
- task-022 completed (migration runner exists)
- task-023 completed (migrations applied)
- task-024 completed (workflow updated)
- task-025 completed (health check exists)

## Technical Notes

### Documentation Structure

**1. Overview**
- What is the deployment system
- Why migrations are automated
- Architecture diagram

**2. Deployment Flow**
```
Code Push → Build Images → Run Migrations → Start Services
    ↓           ↓              ↓               ↓
  GitHub     Docker       PostgreSQL      Production
  Actions    Registry     Database        Containers
```

**3. Migration System**
- How migrations are stored (`docker/postgres/migrations/`)
- Naming convention (XXX_description.sql)
- Migration file format
- schema_migrations tracking

**4. Automated Execution**
- When migrations run (on every deploy)
- What the migration runner does
- Idempotency guarantees
- Error handling

**5. Creating New Migrations**
```bash
# 1. Create migration file
cp docker/postgres/migrations/TEMPLATE.sql docker/postgres/migrations/017_my_change.sql

# 2. Edit migration
# - Add your schema changes
# - Update version in schema_migrations insert

# 3. Test locally
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/017_my_change.sql

# 4. Commit and push
git add docker/postgres/migrations/017_my_change.sql
git commit -m "feat(db): add new table"
git push

# 5. Merge to main
# - Migration runs automatically on deployment
```

**6. Troubleshooting**

**Issue: Migration fails during deployment**
```bash
# Check GitHub Actions logs
gh run view --log

# Check migration runner output
# Look for "Migration failed" messages

# Fix the migration
# Push fix
# Redeploy
```

**Issue: Schema out of sync**
```bash
# Check health endpoint
curl https://home.st44.no/health/database

# View applied migrations
docker exec -it st44-db psql -U postgres -d st44 -c "SELECT * FROM schema_migrations ORDER BY version;"

# Apply missing migration manually (emergency)
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/XXX_missing.sql
```

**Issue: Deployment stuck waiting for database**
```bash
# Check database is running
docker ps | grep db

# Check database logs
docker logs st44-db

# Restart database if needed
docker restart st44-db
```

**7. Health Checks**
- `/health` - Basic application health
- `/health/database` - Detailed database status
- How to interpret health check responses

**8. Rollback Procedures**

**Scenario 1: Bad migration deployed**
```bash
# Revert the commit
git revert <commit-hash>
git push

# Redeploy (will not re-run failed migration)
```

**Scenario 2: Need to undo schema change**
```bash
# Write a new migration that reverses the change
# Example: If migration 017 added a column, 018 drops it
# Deploy forward migration
```

**Note**: We don't rollback migrations backward, we always migrate forward

**9. Best Practices**
- Always use IF NOT EXISTS
- Always use ON CONFLICT DO NOTHING for schema_migrations
- Test migrations locally first
- Keep migrations small and focused
- Add indexes in separate migrations (can be slow)
- Never edit an applied migration
- Document breaking changes
- Coordinate schema changes with code changes

**10. References**
- Migration guide: `docker/postgres/migrations/README.md`
- Template: `docker/postgres/migrations/TEMPLATE.sql`
- Migration runner: `docker/postgres/run-migrations.sh`
- Deploy workflow: `.github/workflows/deploy.yml`

### Documentation Location Options
1. **Primary**: Update existing `docker/postgres/migrations/README.md`
2. **Secondary**: Create `docs/DEPLOYMENT.md` for full deployment guide
3. **Tertiary**: Update root `README.md` with deployment section

**Recommendation**: Update both `docker/postgres/migrations/README.md` (for migration-specific details) and create `docs/DEPLOYMENT.md` (for full deployment overview)

## Affected Areas
- [ ] Frontend
- [ ] Backend
- [ ] Database
- [ ] Infrastructure
- [x] CI/CD (workflow described)
- [x] Documentation (primary output)

## Implementation Plan

### Research Phase
- [ ] Review all completed tasks (021-025) for details
- [ ] Gather example commands and outputs
- [ ] Take screenshots of health check responses
- [ ] Review existing documentation for style/format

### Writing Phase
1. Create outline based on structure above
2. Write deployment flow section with diagram
3. Document migration execution process
4. Write migration creation guide with examples
5. Create troubleshooting guide with real scenarios
6. Document health check endpoints
7. Write rollback procedures
8. Add best practices section
9. Add references and links

### Review Phase
- [ ] Read through for clarity
- [ ] Verify all commands are correct
- [ ] Test examples work
- [ ] Get feedback from team
- [ ] Publish documentation

## Progress Log
- [2025-12-14 02:30] Task created

## Testing Results
N/A - Documentation task, but should verify:
- [ ] All commands are correct
- [ ] All file paths are accurate
- [ ] All links work
- [ ] Examples can be followed successfully

## Review Notes
[To be filled during review phase]

## Related PRs
- May include documentation updates in final feature PR
- Or separate documentation PR

## Lessons Learned
[To be filled after completion]

