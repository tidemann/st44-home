# Database Migration Quick Reference

## For Database Agent: MANDATORY WORKFLOW

Every time you make a database schema change, you MUST:

### Step 1: Find Next Version Number
```bash
ls -1 docker/postgres/migrations/*.sql | tail -1
# If you see 000_..., next is 001
# If you see 005_..., next is 006
```

### Step 2: Create Migration File
```
docker/postgres/migrations/NNN_descriptive_name.sql
```

Copy from `docker/postgres/migrations/TEMPLATE.sql`

### Step 3: Write Migration
```sql
-- Migration: NNN_add_tasks_table
-- Description: Add tasks table for task management
-- Date: 2025-12-13
-- Related Task: task-042-create-tasks-table

BEGIN;

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);

-- ALWAYS record the migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('NNN', 'add_tasks_table', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

### Step 4: Test Migration
```bash
# Apply it
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/NNN_name.sql

# Verify recorded
docker exec -it st44-db psql -U postgres -d st44 -c "SELECT * FROM schema_migrations ORDER BY version;"

# Test idempotency (run again, should not error)
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/NNN_name.sql
```

### Step 5: Update init.sql (if new table)
If creating a new table, also add it to `docker/postgres/init.sql` (without the migration tracking).

### Step 6: Mark Complete
Only mark your task complete after:
- [ ] Migration file created
- [ ] Migration tested locally
- [ ] Migration is idempotent
- [ ] Migration recorded in schema_migrations
- [ ] init.sql updated (if needed)

---

## For Orchestrator Agent: VERIFICATION

Before marking a database task complete, verify:
```bash
# Check migration file exists
ls docker/postgres/migrations/

# Check it was applied
docker exec -it st44-db psql -U postgres -d st44 -c "SELECT * FROM schema_migrations ORDER BY version;"

# Check schema change applied
docker exec -it st44-db psql -U postgres -d st44 -c "\d table_name"
```

If any verification fails, the task is NOT complete and changes will NOT deploy.

---

## Why This Matters

**Without migration files:**
- ❌ Changes only exist in your local database
- ❌ Production won't get changes
- ❌ Other developers won't get changes
- ❌ Changes lost when DB recreated
- ❌ No audit trail of what changed

**With migration files:**
- ✅ Version controlled
- ✅ CI/CD runs automatically
- ✅ Repeatable across environments
- ✅ Tracked in schema_migrations table
- ✅ Safe deployment guarantee

---

## Common Patterns

### Add Column
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
```

### Add Index
```sql
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### Modify Constraint
```sql
-- Drop old
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS check_status;

-- Add new
ALTER TABLE tasks ADD CONSTRAINT check_status
CHECK (status IN ('pending', 'completed', 'archived'));
```

### Add Foreign Key
```sql
ALTER TABLE posts
ADD CONSTRAINT fk_user_id
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE;
```

---

## Full Documentation

See `docker/postgres/migrations/README.md` for:
- Complete migration system documentation
- More examples and patterns
- Troubleshooting guide
- CI/CD integration
- Best practices

---

**Remember**: Migration files are your deployment guarantee. Never skip them.
