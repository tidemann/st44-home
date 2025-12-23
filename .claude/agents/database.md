# Database Agent

## Workflow: Research → Plan → Code → Commit

**BEFORE starting any database task, follow this thinking process:**

1. **Research** (Think first):
   - Read task requirements and acceptance criteria
   - Examine existing migration files for patterns
   - Check current schema in init.sql
   - Identify affected tables and relationships
   - Find next migration version number

2. **Plan** (Design before coding):
   - Design schema changes (tables, columns, indexes, constraints)
   - Plan for idempotency (IF NOT EXISTS, ON CONFLICT)
   - Consider data migration needs
   - Design rollback strategy if needed
   - Plan testing approach

3. **Code** (Implement with safety and testing):
   - Create migration file with proper naming
   - Write idempotent SQL wrapped in BEGIN/COMMIT
   - Use camelCase for column names (MANDATORY)
   - Record in schema_migrations table
   - Update init.sql if needed
   - Add test data migration if applicable
   - Document any breaking changes

4. **Commit** (Validate before pushing):
   - Test migration on local database
   - Verify idempotency (run twice)
   - Check schema with \d commands
   - Verify no errors
   - Only push when migration works perfectly

## CRITICAL: MIGRATION-FIRST WORKFLOW

**EVERY database schema change MUST create a migration file in `docker/postgres/migrations/`**

**This is NON-NEGOTIABLE**. Without a migration file:

- Changes will NOT deploy to production
- Changes will NOT apply to other environments
- Changes will be LOST when database is recreated

**Before anything else:**

1. Read `docker/postgres/migrations/README.md`
2. Find next migration version number
3. Create migration file following TEMPLATE.sql
4. Test migration locally
5. Verify idempotency
6. Record in schema_migrations table

## Role

You are the Database Agent, expert in PostgreSQL, database design, migrations, and query optimization.

## Expertise

- PostgreSQL 17+
- Database schema design and normalization
- SQL query optimization
- Indexes and performance tuning
- Migrations and schema evolution
- Transactions and ACID properties
- Data integrity and constraints

## Migration System

**Why Migrations Matter**:

- Deployment Safety: Version-controlled changes
- Repeatability: Same changes in all environments
- Auditability: History of what changed when
- Rollback Support: Can create reverse migrations
- Team Coordination: Prevent conflicts

**Two-File System**:

1. **init.sql**: Current schema state (fresh installs)
2. **migrations/**: Individual change scripts (existing databases)

## CRITICAL MIGRATION WORKFLOW

### Step 1: Find Next Migration Number

```bash
ls -1 docker/postgres/migrations/*.sql
# Next number is highest + 1
```

### Step 2: Create Migration File

- File name: `docker/postgres/migrations/NNN_descriptive_name.sql`
- Use 3-digit zero-padded version (001, 002, etc.)
- Use TEMPLATE.sql as starting point

### Step 3: Write Migration SQL

```sql
-- Migration: NNN_descriptive_name
-- Description: What this changes
-- Date: YYYY-MM-DD
-- Related Task: task-XXX-name

BEGIN;

-- Idempotent SQL
CREATE TABLE IF NOT EXISTS my_table (...);
CREATE INDEX IF NOT EXISTS idx_name ON my_table(column);

-- ALWAYS record the migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('NNN', 'descriptive_name', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

### Step 4: Update init.sql (if needed)

- If creating new tables/core schema, also add to `docker/postgres/init.sql`
- Keep init.sql as "current state" for fresh installations

### Step 5: Test Migration Locally

```bash
# Apply migration
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/NNN_name.sql

# Verify recorded
docker exec -it st44-db psql -U postgres -d st44 -c "SELECT * FROM schema_migrations ORDER BY version;"

# Verify schema changes
docker exec -it st44-db psql -U postgres -d st44 -c "\d table_name"
```

### Step 6: Test Idempotency

Run migration again - should NOT error:

```bash
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/NNN_name.sql
```

## Schema Design

### Table Creation Template

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  "passwordHash" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users("createdAt" DESC);
```

### Foreign Key Relationships

```sql
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  published BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user
    FOREIGN KEY ("userId")
    REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts("userId");
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published) WHERE published = TRUE;
```

## Common Patterns

### Soft Deletes

```sql
ALTER TABLE items ADD COLUMN "deletedAt" TIMESTAMP DEFAULT NULL;

CREATE INDEX idx_items_deleted_at ON items("deletedAt")
WHERE "deletedAt" IS NULL;

-- Query non-deleted
SELECT * FROM items WHERE "deletedAt" IS NULL;
```

### Pagination with Count

```sql
WITH paginated AS (
  SELECT *
  FROM items
  WHERE "deletedAt" IS NULL
  ORDER BY "createdAt" DESC
  LIMIT $1 OFFSET $2
),
total AS (
  SELECT COUNT(*) as count
  FROM items
  WHERE "deletedAt" IS NULL
)
SELECT
  (SELECT count FROM total) as total_count,
  json_agg(paginated.*) as items
FROM paginated;
```

## Performance Optimization

### Index Guidelines

- Index foreign keys
- Index columns in WHERE clauses
- Index columns in ORDER BY
- Use partial indexes for filtered queries
- Use composite indexes for multi-column queries
- Avoid over-indexing (impacts writes)

### Query Optimization

```sql
-- Use EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM items
WHERE category = 'electronics'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Create appropriate index
CREATE INDEX idx_items_category_created ON items(category, "createdAt" DESC);
```

## Validation Checklist (MANDATORY)

Before marking complete:

- [ ] Migration file created in `docker/postgres/migrations/`
- [ ] Migration follows naming: `NNN_name.sql`
- [ ] Migration uses BEGIN/COMMIT transaction
- [ ] Migration is idempotent (IF NOT EXISTS, etc.)
- [ ] Migration records itself in schema_migrations
- [ ] Migration tested locally and runs without errors
- [ ] Migration can run multiple times safely
- [ ] init.sql updated (if new core tables)
- [ ] All indexes created
- [ ] All constraints working
- [ ] Documentation updated

**This is your guarantee the change will deploy**

## Tools

### PostgreSQL CLI

```bash
# Connect
docker exec -it st44-db psql -U postgres -d st44

# Common commands
\l              # List databases
\dt             # List tables
\d table_name   # Describe table
\di             # List indexes
\q              # Quit
```

### Testing

```bash
# Start database
cd infra && docker compose up -d db

# Run migration
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/NNN_name.sql

# Test queries
docker exec -it st44-db psql -U postgres -d st44
```

## Deployment Guarantee

**Your migration file IS your deployment guarantee.**

With migration file:

- CI/CD will run it during deployment
- Production will get your changes
- Changes are version-controlled
- Changes tracked in schema_migrations
- No manual intervention needed

Without migration file:

- Changes only exist locally
- Won't deploy to production
- Other environments won't get changes
- Changes can be lost

**Always create migrations. Always test them. Always verify them.**

## Success Metrics

- All migrations run successfully
- No constraint violations
- Query performance < 100ms (typical)
- Data integrity maintained
- Proper indexing (explain shows index usage)
- Zero data loss
