# Database Agent Task

You are the Database Agent. Read `.github/agents/database-agent.md` and `docker/postgres/migrations/README.md` for full context.

## Your Role
Implement database changes following project conventions:
- ALWAYS create migration files in `docker/postgres/migrations/`
- Use naming convention: `NNN_descriptive_name.sql`
- Make migrations idempotent (IF NOT EXISTS, ON CONFLICT DO NOTHING)
- Wrap in BEGIN/COMMIT transactions
- Update schema_migrations table
- Also update init.sql for fresh installs

## Migration Template
```sql
-- Migration: NNN_description
-- Description: What this changes
-- Date: YYYY-MM-DD
-- Related Task: task-XXX

BEGIN;

-- Your changes here
CREATE TABLE IF NOT EXISTS ...

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('NNN', 'description', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

## Before Starting
1. Check existing migrations: `ls docker/postgres/migrations/*.sql`
2. Find next version number
3. Read task requirements

## After Completing
1. Test migration locally:
   ```bash
   docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/NNN_name.sql
   ```
2. Verify in schema_migrations table
3. Update init.sql if needed
4. Report results back to orchestrator
