# Production Database Deployment Guide

## Overview

This document describes how database migrations are managed and deployed to production. The system ensures that database schema changes are automatically applied during deployment, preventing the "relation does not exist" errors that occurred on 2025-12-14.

## Architecture

```
Code Push to main
      ↓
GitHub Actions Build
      ↓
Docker Images Built & Pushed to GHCR
      ↓
SSH to Production Server
      ↓
Pull Latest Images
      ↓
Start Database Container
      ↓
🔄 RUN MIGRATIONS (New Step!)
      ↓
Start Backend & Frontend
      ↓
Verify Health Checks
      ↓
Purge CDN Cache
```

## Automated Migration System

### What It Does

1. **Waits for database** to be ready (health check with retries)
2. **Checks applied migrations** from `schema_migrations` table
3. **Applies pending migrations** in order (000, 001, 011, 012, ...)
4. **Validates results** and fails deployment if any migration fails
5. **Logs everything** for debugging and auditing

### How It Works

The migration runner script (`docker/postgres/run-migrations.sh`) is executed during deployment:

- **Idempotent**: Safe to run multiple times - skips already-applied migrations
- **Atomic**: Each migration runs in its own transaction
- **Fail-safe**: Deployment fails if migrations fail, preventing broken app
- **Logged**: All actions logged to GitHub Actions output

### Migration Files

Location: `docker/postgres/migrations/`

Naming: `XXX_description.sql` (e.g., `001_create_users_table.sql`)

**Current Migrations:**
- `000_create_migrations_table.sql` - Migration tracking infrastructure
- `001_create_users_table.sql` - Authentication
- `011_create_households_table.sql` - Multi-tenancy
- `012_create_household_members_table.sql` - User-household relationships
- `013_create_children_table.sql` - Child profiles
- `014_create_tasks_table.sql` - Task templates
- `015_create_task_assignments_table.sql` - Task instances
- `016_create_task_completions_table.sql` - Completion history

## Creating New Migrations

### Step 1: Create Migration File

```bash
# Copy template
cp docker/postgres/migrations/TEMPLATE.sql docker/postgres/migrations/017_add_rewards_table.sql
```

### Step 2: Edit Migration

```sql
-- Migration: 017_add_rewards_table
-- Description: Add rewards table for gamification
-- Date: 2025-12-14

BEGIN;

-- Your schema changes here
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  points_cost INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rewards_household ON rewards(household_id);

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('017', 'add_rewards_table', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

### Step 3: Test Locally

```bash
# Apply to local database
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/017_add_rewards_table.sql

# Verify
docker exec -it st44-db psql -U postgres -d st44 -c "\d rewards"
docker exec -it st44-db psql -U postgres -d st44 -c "SELECT * FROM schema_migrations ORDER BY version;"
```

### Step 4: Commit and Deploy

```bash
git add docker/postgres/migrations/017_add_rewards_table.sql
git commit -m "feat(db): add rewards table for gamification"
git push

# Create PR, wait for CI, merge to main
# Migration runs automatically on deployment!
```

## Health Checks

### Basic Health Check

**URL**: `GET /health`

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-12-14T02:30:00.000Z"
}
```

### Database Health Check

**URL**: `GET /health/database`

**Healthy Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-12-14T02:30:00.000Z",
  "database": {
    "connected": true,
    "responseTime": 42
  },
  "migrations": {
    "applied": ["000", "001", "011", "012", "013", "014", "015", "016"],
    "latest": "016",
    "count": 8
  },
  "schema": {
    "critical_tables": [
      {"name": "users", "exists": true},
      {"name": "households", "exists": true},
      {"name": "children", "exists": true},
      {"name": "tasks", "exists": true},
      {"name": "task_assignments", "exists": true},
      {"name": "task_completions", "exists": true}
    ],
    "all_tables_exist": true
  }
}
```

**Degraded Response** (200 OK - with warnings):
```json
{
  "status": "degraded",
  "migrations": {
    "warning": "Expected 8 migrations, only 2 applied"
  },
  "schema": {
    "all_tables_exist": false
  }
}
```

**Unhealthy Response** (503 Service Unavailable):
```json
{
  "status": "unhealthy",
  "database": {
    "connected": false,
    "error": "Connection timeout"
  }
}
```

### Using Health Checks

**After Deployment**:
```bash
curl https://home.st44.no/health/database
```

**In Monitoring**:
- Set up alerts if status != "healthy"
- Poll `/health/database` every 5 minutes
- Alert if schema.all_tables_exist == false

**For Debugging**:
```bash
# Quick check
curl https://home.st44.no/health/database | jq '.status'

# See which migrations are applied
curl https://home.st44.no/health/database | jq '.migrations'

# Check which tables are missing
curl https://home.st44.no/health/database | jq '.schema.critical_tables[] | select(.exists == false)'
```

## Troubleshooting

### Issue: Migration Fails During Deployment

**Symptoms**: GitHub Actions deploy job fails at "Run Database Migrations" step

**Check**:
```bash
# View GitHub Actions logs
gh run view --log

# Look for migration runner output
# Shows which migration failed and SQL error
```

**Fix**:
1. Identify the problematic migration from logs
2. Fix the migration SQL file
3. Commit and push fix
4. Deployment will retry automatically

### Issue: Schema Out of Sync

**Symptoms**: Health check shows missing tables or migrations

**Check**:
```bash
# SSH to production server
ssh user@home.st44.no

# Check database
docker exec -it st44-db psql -U postgres -d st44 -c "SELECT * FROM schema_migrations ORDER BY version;"

# Check health
curl http://localhost/health/database | jq
```

**Fix (Emergency Manual Migration)**:
```bash
# Copy migration to server
scp docker/postgres/migrations/017_missing.sql user@home.st44.no:/tmp/

# SSH and apply
ssh user@home.st44.no
docker exec -i st44-db psql -U postgres -d st44 < /tmp/017_missing.sql

# Verify
docker exec -it st44-db psql -U postgres -d st44 -c "SELECT * FROM schema_migrations ORDER BY version;"
```

### Issue: Database Not Ready

**Symptoms**: Migration runner times out waiting for database

**Check**:
```bash
ssh user@home.st44.no
docker ps | grep db
docker logs st44-db
```

**Fix**:
```bash
# Restart database
docker restart st44-db

# Wait for health
docker exec -it st44-db pg_isready -U postgres

# Re-run migration manually if needed
cd /srv/st44-home
./docker/postgres/run-migrations.sh
```

### Issue: 500 Errors on Registration

**Symptoms**: Users can't register, backend logs show "relation does not exist"

**Root Cause**: This was the original issue - migrations not applied

**Check**:
```bash
curl https://home.st44.no/health/database
# Should show "degraded" or "unhealthy" with missing tables
```

**Fix**: Apply migrations immediately
```bash
# SSH to server
ssh user@home.st44.no
cd /srv/st44-home

# Run migration script
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=st44
export DB_USER=postgres
export DB_PASSWORD='your-password'
./docker/postgres/run-migrations.sh

# Restart backend to clear connection pool
docker restart st44-backend

# Verify
curl https://home.st44.no/health/database
curl -X POST https://home.st44.no/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!!"}'
```

## Rollback Procedures

### Important: The Schema Rolls Forward, the Images Roll Back

Two different things are being rolled back, and they have different answers:

- **Database migrations** are additive and irreversible. We don't roll migrations
  back; we write a new migration that undoes the change. That is the rest of this
  section.
- **Application images** are immutable and tagged by commit SHA, so they *can* be
  rolled back to a named previous artifact. That is the section immediately below,
  and it is the fast path when a deploy breaks the app but not the schema.

### Rolling back to a previous image

Every deploy pushes three images tagged with the commit SHA it was built from:

```
ghcr.io/tidemann/st44-home-frontend:<sha>
ghcr.io/tidemann/st44-home-backend:<sha>
ghcr.io/tidemann/st44-home-db:<sha>
```

The server's compose file still says `:latest` and is never edited by CI. Instead
the deploy generates a small compose override naming those three tags and merges it
over the server's file, which is why the running stack is identifiable. Rolling
back is doing the same merge by hand with an earlier tag. `latest` also moves on
every deploy: it is a convenience pointer, never the answer to "what is running?".

#### Step 1: Find the previous good SHA

Three places, cheapest first:

```bash
# a) The deploy run summary. Every Deploy run opens with a "Rollback anchor"
#    block naming the images that were running before it, and closes with a
#    "Deployed artifact" table naming the ones it installed.
gh run list --workflow=deploy.yml --limit 10
gh run view <run-id>

# b) The host, if the previous containers are still around.
ssh <deploy-user>@home.st44.no \
  "docker ps -a --filter name=st44 --format '{{.Names}}\t{{.Image}}\t{{.CreatedAt}}'"

# c) git. The tag *is* the commit, so the last good deploy is a commit on main.
git log --oneline -20 main
```

#### Step 2: Confirm the images for that SHA exist in the registry

Skipping this is how a rollback turns into an outage — a SHA whose images were
never pushed (for example a commit that only touched docs, which the deploy path
filter skips) will fail the pull and leave nothing running.

Run this **on the server**. The GHCR packages are private and the credential for
them lives in the deploy user's docker config on the host; a laptop or an agent gets
401/403 (see ST-60 — the GitHub App token cannot read GHCR package versions either).

```bash
ssh <deploy-user>@home.st44.no
SHA=<previous-good-sha>
for svc in frontend backend db; do
  docker manifest inspect "ghcr.io/tidemann/st44-home-$svc:$SHA" > /dev/null 2>&1 \
    && echo "$svc: ok" || echo "$svc: MISSING — pick another SHA"
done
```

If all three say MISSING, that SHA predates SHA tagging (anything before ST-59
merged). Roll forward instead, or pick a later commit.

#### Step 3: Start the stack on that tag

Run on the server as the deploy user. This does not edit the server's compose file
or `.env`, and it does not need a CI run — it writes the same override the deploy
writes, with an older tag:

```bash
ssh <deploy-user>@home.st44.no
SHA=<previous-good-sha>

# The same file the deploy sends. Three services, one tag each.
cat > ~/st44-home-image-pin.yml <<YAML
services:
  frontend:
    image: ghcr.io/tidemann/st44-home-frontend:${SHA}
  backend:
    image: ghcr.io/tidemann/st44-home-backend:${SHA}
  db:
    image: ghcr.io/tidemann/st44-home-db:${SHA}
YAML

cd /srv/st44-home/infra
export COMPOSE_FILE="docker-compose.yml:$HOME/st44-home-image-pin.yml"

# Check the merge before acting on it: three images on $SHA, and the external
# network and the frontend on 3100 still there.
docker compose config | grep -E 'image:|3100|st44_default'

docker compose pull
docker compose up -d --force-recreate frontend backend

# Only recreate db if the rollback is meant to change the database image too.
# Rolling the db image back does NOT undo migrations that have already run.
```

`cd /srv/st44-home/infra` matters: compose takes the project directory from the
first file, and that is where `.env` — `DB_PASSWORD`, `CORS_ORIGIN` — lives.

#### Step 4: Verify, then record

```bash
# The containers are on the tag you asked for
docker inspect -f '{{.Config.Image}}' st44-frontend st44-backend

# The app answers
curl -fsS http://localhost:3000/health
curl -fsS -o /dev/null -w '%{http_code}\n' https://home.st44.no/health
```

Then make the rollback durable, because the next push to main deploys whatever is
on `main`:

- Revert the bad commit on `main` (`git revert <bad-sha>`, PR, merge). The next
  deploy then rebuilds the reverted state and `IMAGE_TAG` catches up with the host.
- Until that lands, **do not merge to main** — a deploy would overwrite the
  rolled-back stack.

#### What this does not cover

- **Migrations that already ran.** The schema stays where it is; read the rest of
  this section. A rolled-back backend must still be able to talk to the newer
  schema, which is what the additive-migration rule buys.
- **The Cloudflare cache.** Purge it after a rollback that changes frontend
  assets, the same way the deploy workflow does.

### Scenario 1: Bad Migration Just Deployed

**If migration fails**:
- Deployment automatically fails and doesn't start app
- Database remains in last known good state
- Fix migration file and redeploy

**If migration succeeds but breaks app**:
```bash
# Revert the application code
git revert <bad-commit-hash>
git push

# Write a new migration to undo schema change
# Example: migration 017 added column, 018 drops it
```

### Scenario 2: Need to Remove a Table

❌ **Don't**: Delete the old migration or modify it  
✅ **Do**: Create a new migration that drops the table

```sql
-- Migration: 018_remove_old_rewards_table
-- Description: Remove deprecated rewards table
-- Date: 2025-12-14

BEGIN;

DROP TABLE IF EXISTS rewards CASCADE;

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('018', 'remove_old_rewards_table', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

## Best Practices

### ✅ Do This

- **Use IF NOT EXISTS**: `CREATE TABLE IF NOT EXISTS ...`
- **Use ON CONFLICT DO NOTHING**: In schema_migrations insert
- **Test locally first**: Always test migration before deploying
- **Small migrations**: One logical change per migration
- **Descriptive names**: `017_add_rewards_table.sql` not `017.sql`
- **Add comments**: Explain why the change is needed
- **Use transactions**: BEGIN/COMMIT for atomicity
- **Coordinate code and schema**: Deploy schema first, code second

### ❌ Don't Do This

- **Never edit applied migrations**: Once in production, it's immutable
- **Don't rollback**: Always roll forward with new migrations
- **Don't skip versions**: Use sequential numbers (don't go 015 → 020)
- **Don't run DDL outside migrations**: No manual ALTER TABLE
- **Don't deploy breaking schema changes**: Use multi-phase deploys
- **Don't forget indexes**: Large tables need indexes from the start
- **Don't use DROP TABLE without CASCADE**: You'll get FK errors

## Multi-Phase Deploys (Breaking Changes)

When schema change breaks existing code:

**Phase 1: Add new column (optional)**
```sql
ALTER TABLE users ADD COLUMN new_email VARCHAR(255);
```
Deploy: Schema updated, old code still works (ignores new column)

**Phase 2: Update application code**
Deploy: New code uses new column

**Phase 3: Remove old column**
```sql
ALTER TABLE users DROP COLUMN old_email;
```
Deploy: Old column removed

## Monitoring & Alerts

### Recommended Setup

**Health Check Monitoring**:
- Poll `/health/database` every 5 minutes
- Alert if status == "unhealthy" or "degraded"
- Alert if migrations.count < expected (8 as of 2025-12-14)
- Alert if any critical_tables.exists == false

**Deployment Monitoring**:
- GitHub Actions notifications on workflow failure
- Slack/Discord webhook for failed migrations
- Log aggregation (CloudWatch, Datadog, etc.)

**Application Monitoring**:
- Track 500 errors on `/api/auth/*` endpoints
- Alert on database connection errors
- Monitor query performance

## References

- Migration Template: [`docker/postgres/migrations/TEMPLATE.sql`](../docker/postgres/migrations/TEMPLATE.sql)
- Migration Guide: [`docker/postgres/migrations/README.md`](../docker/postgres/migrations/README.md)
- Migration Runner: [`docker/postgres/run-migrations.sh`](../docker/postgres/run-migrations.sh)
- Deploy Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
- Health Endpoint: Backend `server.ts` lines 565-680

## Incident Report: 2025-12-14

**What Happened**: Production users unable to register, 500 errors

**Root Cause**: Database migrations (000-016) never applied to production

**Why**: Local development applied migrations manually via `docker exec`, but production deployment workflow had no migration step

**Resolution**:
1. Created migration runner script with idempotency and error handling
2. Added migration step to GitHub Actions deploy workflow
3. Added `/health/database` endpoint to validate schema
4. Updated deployment to run migrations before starting application
5. Added health check verification after deployment

**Prevention**: All future deployments automatically apply migrations. Health checks catch schema issues early.

---

**Last Updated**: 2025-12-14  
**Maintainer**: Development Team
