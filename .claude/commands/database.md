# Database Agent Task

You are the Database Agent. Read `.claude/agents/database.md` for full context and patterns.

## Quick Reference

**Read for full context**: `.claude/agents/database.md`

## CRITICAL: MIGRATION-FIRST WORKFLOW

**EVERY database schema change MUST create a migration file**

Without migration file:

- Changes will NOT deploy to production
- Changes will be LOST when database recreated

## Your Role

Implement database changes following migration-first workflow:

1. Find next migration number
2. Create migration file in `docker/postgres/migrations/`
3. Write idempotent SQL (IF NOT EXISTS, ON CONFLICT DO NOTHING)
4. Wrap in BEGIN/COMMIT
5. Record in schema_migrations table
6. Test locally
7. Update init.sql if needed

## Migration Template

```sql
-- Migration: NNN_description
-- Description: What this changes
-- Date: YYYY-MM-DD
-- Related Task: task-XXX

BEGIN;

-- Idempotent SQL
CREATE TABLE IF NOT EXISTS ...

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('NNN', 'description', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

## MANDATORY: Migration Testing

```bash
# 1. Apply migration
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/NNN_name.sql

# 2. Verify recorded
docker exec -it st44-db psql -U postgres -d st44 -c "SELECT * FROM schema_migrations ORDER BY version;"

# 3. Test idempotency (run again - should not error)
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/NNN_name.sql
```

## Before Starting

1. Read `.claude/agents/database.md` for patterns
2. Check existing migrations: `ls docker/postgres/migrations/*.sql`
3. Find next version number
4. Read task requirements

## After Completing

1. Test migration locally (see above)
2. Verify idempotency
3. Update init.sql if creating new core tables
4. Report results with evidence

**Your migration file IS your deployment guarantee**
