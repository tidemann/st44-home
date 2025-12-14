## Problem

**Production Issue**: Users unable to register accounts - backend returns 500 error with `relation 'users' does not exist`.

**Root Cause**: Database migrations were applied manually during local development but never deployed to production. The production database had no schema, causing all database queries to fail.

## Solution

This PR implements a comprehensive solution to **prevent this from ever happening again**:

### 1. 🤖 Automated Migration Runner
- Created `docker/postgres/run-migrations.sh` - production-ready Bash script
- Automatically applies pending migrations in order
- Idempotent: Safe to run multiple times (skips applied migrations)
- Fails deployment if any migration fails
- Logs all actions for debugging
- Validates database connectivity before running

### 2. 🏥 Database Health Check Endpoint
- New endpoint: `GET /health/database`
- Returns detailed database status:
  - Connection status and response time
  - List of applied migrations
  - Validation that all critical tables exist
- Returns 200 (healthy/degraded) or 503 (unhealthy)
- Catches schema issues early for monitoring

### 3. 🚀 Deploy Workflow Integration
- Updated `.github/workflows/deploy.yml`
- New deployment sequence:
  1. Build & push Docker images
  2. Start database container
  3. **Run migrations** (NEW!)
  4. Start backend & frontend
  5. **Verify health checks** (NEW!)
  6. Purge CDN cache
- Deployment fails if migrations fail (fail-fast)
- Health check verification after deploy

### 4. 📚 Comprehensive Documentation
- Created `docs/DEPLOYMENT.md` with:
  - Complete deployment process guide
  - How to create new migrations
  - Health check usage examples
  - Troubleshooting common issues
  - Rollback procedures
  - Best practices

## Changes

### New Files
- ✅ `docker/postgres/run-migrations.sh` - Migration runner script
- ✅ `docs/DEPLOYMENT.md` - Deployment documentation

### Modified Files
- ✅ `apps/backend/src/server.ts` - Added `/health/database` endpoint
- ✅ `.github/workflows/deploy.yml` - Added migration step and health checks

## Impact

### Before This PR
❌ Migrations applied manually (error-prone)  
❌ Production schema out of sync with code  
❌ No visibility into schema status  
❌ Users experiencing 500 errors  
❌ No automated validation  

### After This PR
✅ Migrations run automatically on every deployment  
✅ Deployment fails if schema update fails (fail-fast)  
✅ Health endpoint shows schema status  
✅ No more manual database operations  
✅ Database schema always matches application code  
✅ Monitoring can track schema health  

## Prevention

This completely prevents the production bug from recurring:

1. **Automation**: Migrations run on every deployment
2. **Validation**: Health checks verify schema after deploy
3. **Fail-Fast**: Bad migrations stop deployment
4. **Visibility**: Health endpoint exposes schema status
5. **Documentation**: Clear guide for future migrations

## Next Steps

**IMPORTANT**: After this PR is merged, we still need to apply migrations to the current production database to fix the immediate issue. This PR prevents future occurrences but doesn't fix the current state.

See task-023 for manual migration application to production.

## Related

- Feature: feature-005 (Production Database Deployment System)
- Tasks: task-021, task-022, task-024, task-025, task-026
- Incident: Production 500 errors on 2025-12-14
