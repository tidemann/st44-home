# Database Migrations

## Overview

This directory contains **versioned migration scripts** that track and apply database schema changes. Every database change MUST be recorded as a migration to ensure deployment reliability.

## Critical Rules

### MANDATORY for Database-Agent

1. **EVERY database schema change MUST create a migration file**
   - Table creation/modification
   - Column additions/deletions
   - Index creation/deletion
   - Constraint changes
   - Function/trigger changes

2. **Migrations are IMMUTABLE**
   - Once created, never edit a migration file
   - If a mistake is made, create a new migration to fix it
   - Never delete migration files

3. **Sequential numbering is REQUIRED**
   - Format: `NNN_descriptive_name.sql` (e.g., `001_create_users_table.sql`)
   - Find highest number and increment by 1
   - Zero-pad to 3 digits (001, 002, ..., 010, etc.)

4. **Each migration MUST include**
   - Header comment with description and date
   - BEGIN/COMMIT transaction wrapper
   - Idempotent checks (CREATE IF NOT EXISTS, etc.)
   - Entry in schema_migrations table

## Migration File Structure

```sql
-- Migration: NNN_descriptive_name
-- Description: What this migration does
-- Date: YYYY-MM-DD
-- Related Task: task-XXX-name (if applicable)

BEGIN;

-- Idempotent checks
CREATE TABLE IF NOT EXISTS table_name (
  -- columns
);

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('NNN', 'descriptive_name', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

## Usage

### Creating a New Migration

1. **Find next version number**:
   ```bash
   ls -1 docker/postgres/migrations/*.sql | tail -1
   ```

2. **Create migration file**:
   ```
   docker/postgres/migrations/NNN_description.sql
   ```

3. **Write migration following template above**

4. **Update init.sql** (if needed for fresh installs):
   - If the migration creates a table needed for fresh installs, also add to init.sql
   - Keep init.sql as the "current state" of the schema

### Running Migrations

#### Local Development (Database Already Exists)
```bash
# Run specific migration
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/NNN_name.sql

# Run all pending migrations
for file in docker/postgres/migrations/*.sql; do
  echo "Applying $(basename $file)..."
  docker exec -i st44-db psql -U postgres -d st44 < "$file"
done
```

#### Fresh Database (Docker Compose)
Migrations run automatically via init.sql's migration loader.

#### Production Deployment
Migrations must run as part of deployment process (CI/CD):
```bash
# Example deployment script
for file in docker/postgres/migrations/*.sql; do
  psql $DATABASE_URL < "$file"
done
```

### Checking Migration Status

```bash
# See applied migrations
docker exec -it st44-db psql -U postgres -d st44 -c "SELECT * FROM schema_migrations ORDER BY version;"

# See pending migrations (compare with filesystem)
docker exec -it st44-db psql -U postgres -d st44 -c "SELECT version FROM schema_migrations;" > applied.txt
ls -1 docker/postgres/migrations/*.sql | grep -o '[0-9]\{3\}' > all.txt
comm -13 applied.txt all.txt  # Shows missing versions
```

## Migration Patterns

### Creating a Table

```sql
-- Migration: 005_create_tasks_table
-- Description: Add tasks table for task management feature
-- Date: 2025-12-13
-- Related Task: task-042-task-management

BEGIN;

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT check_status
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Add trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('005', 'create_tasks_table', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

### Adding a Column

```sql
-- Migration: 006_add_user_timezone
-- Description: Add timezone column to users table
-- Date: 2025-12-13
-- Related Task: task-051-user-preferences

BEGIN;

-- Add column with default
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('006', 'add_user_timezone', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

### Creating an Index

```sql
-- Migration: 007_add_users_email_index
-- Description: Add index on users.email for faster lookups
-- Date: 2025-12-13
-- Related Task: task-055-performance-optimization

BEGIN;

CREATE INDEX IF NOT EXISTS idx_users_email_lookup ON users(email);

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('007', 'add_users_email_index', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

### Modifying a Table

```sql
-- Migration: 008_modify_tasks_status_enum
-- Description: Add 'archived' status to tasks table
-- Date: 2025-12-13
-- Related Task: task-062-task-archiving

BEGIN;

-- Drop old constraint
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS check_status;

-- Add new constraint with additional value
ALTER TABLE tasks 
ADD CONSTRAINT check_status
CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'archived'));

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('008', 'modify_tasks_status_enum', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

### Creating a Function/Trigger

```sql
-- Migration: 009_add_soft_delete_function
-- Description: Add soft delete support for tasks
-- Date: 2025-12-13
-- Related Task: task-070-soft-deletes

BEGIN;

-- Add deleted_at column
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for non-deleted items
CREATE INDEX IF NOT EXISTS idx_tasks_not_deleted 
ON tasks(deleted_at) 
WHERE deleted_at IS NULL;

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('009', 'add_soft_delete_function', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

## Troubleshooting

### Migration Already Applied
If you see `duplicate key value violates unique constraint "schema_migrations_pkey"`, the migration has already been applied. This is safe to ignore.

### Migration Failed Mid-Transaction
PostgreSQL automatically rolls back failed transactions. Check the error, fix the migration (create a new one), and apply the corrected version.

### Out of Order Migrations
Never run migrations out of order. Always apply in sequential order from lowest to highest version number.

### Production Emergency
If you need to make an emergency database change in production:
1. Make the change manually
2. Immediately create a migration file matching what you did
3. Commit the migration to version control
4. This ensures the change is tracked and will be applied to new deployments

## Best Practices

1. **Test migrations locally first**
   ```bash
   # Test on fresh database
   docker compose down -v
   docker compose up -d db
   # Verify schema is correct
   ```

2. **Keep migrations small and focused**
   - One logical change per migration
   - Easier to debug and review
   - Safer to apply in production

3. **Use transactions**
   - Always wrap in BEGIN/COMMIT
   - Ensures atomicity
   - Automatic rollback on error

4. **Make migrations idempotent**
   - Use IF NOT EXISTS clauses
   - Check before dropping
   - Safe to run multiple times

5. **Document your changes**
   - Clear description in header
   - Link to related task
   - Explain why, not just what

6. **Update init.sql for major schema changes**
   - Keep init.sql as "current state"
   - New installations get current schema
   - Existing installations use migrations

## Integration with CI/CD

Migrations should run automatically during deployment:

```yaml
# Example GitHub Actions workflow
- name: Run Database Migrations
  run: |
    for file in docker/postgres/migrations/*.sql; do
      echo "Applying $(basename $file)..."
      psql $DATABASE_URL < "$file" || exit 1
    done
```

## Verification

Before marking a database task complete:
- [ ] Migration file created with correct version number
- [ ] Migration follows template structure
- [ ] Migration tested locally
- [ ] Migration is idempotent
- [ ] Schema_migrations entry added
- [ ] Init.sql updated if needed for fresh installs
- [ ] Related task documentation updated

---

**Remember**: Migrations are your deployment safety net. When done correctly, they guarantee that database changes are applied consistently across all environments.
