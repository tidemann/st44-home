# Docker - Agent Context

## Overview

Docker configurations for containerized services. Contains Dockerfiles and initialization scripts for building custom images.

## Structure

```
docker/
└── postgres/
    ├── Dockerfile      # PostgreSQL image with init script
    └── init.sql        # Database schema initialization
```

## PostgreSQL Container

### Dockerfile (`postgres/Dockerfile`)

Based on official PostgreSQL 17 Alpine image. Copies initialization script to be executed on first database creation.

```dockerfile
FROM postgres:17-alpine
COPY init.sql /docker-entrypoint-initdb.d/
```

**Initialization**:
- Scripts in `/docker-entrypoint-initdb.d/` run automatically
- Only executes if database doesn't exist (volume is empty)
- Runs in alphabetical order (useful for multiple scripts)

### Database Schema (`postgres/init.sql`)

Defines initial database structure. This file runs once when the database is first created.

**Purpose**: Provides "current state" schema for fresh installations.

**Current Schema**:
- `schema_migrations` table (tracks applied migrations)
- `users` table (authentication with email/password and OAuth)
- `items` table (example table)
- Triggers for `updated_at` column updates

### Migration System (`postgres/migrations/`)

⚠️ **CRITICAL**: The migration system guarantees database changes deploy correctly.

**Purpose**: Track and apply schema changes to existing databases.

**Key Files**:
- `README.md` - Comprehensive migration documentation
- `TEMPLATE.sql` - Template for creating new migrations
- `NNN_*.sql` - Numbered migration files (000, 001, 002, etc.)

**Why Migrations Matter**:
- **Deployment Safety**: Changes are version-controlled
- **Repeatability**: Same changes apply everywhere
- **Auditability**: Track what changed and when
- **No Data Loss**: Existing data preserved during changes

**Migration Rules**:
1. **EVERY schema change requires a migration file**
2. Migrations are IMMUTABLE (never edit after creation)
3. Sequential numbering required (001, 002, 003...)
4. Must be idempotent (safe to run multiple times)
5. Must record itself in schema_migrations table

**See `docker/postgres/migrations/README.md` for complete documentation.**

### Schema Management

**Two-File System**:
1. **init.sql**: Current schema for fresh installations
2. **migrations/**: Individual changes for existing databases

**When creating new tables:**
- Create migration file in `migrations/`
- Also add to `init.sql` (for fresh installs)
- Test both paths (fresh DB and migration)

**For Fresh Database**:
```bash
docker compose down -v  # Remove volume
docker compose up -d db  # Recreate with init.sql
```

**For Existing Database** (Production/Development):
```bash
# Apply specific migration
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/NNN_name.sql

# Apply all pending migrations
for file in docker/postgres/migrations/*.sql; do
  echo "Applying $(basename $file)..."
  docker exec -i st44-db psql -U postgres -d st44 < "$file"
done

# Check applied migrations
docker exec -it st44-db psql -U postgres -d st44 -c "SELECT * FROM schema_migrations ORDER BY version;"
```

## Database Schema

### Current Tables

#### `items`
Example table demonstrating basic CRUD structure.

```sql
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Columns**:
- `id`: Auto-incrementing primary key
- `title`: Required string (max 255 chars)
- `description`: Optional text
- `created_at`: Auto-set on insert
- `updated_at`: Auto-set on insert (manual update needed)

**Sample Data**: Includes 3 example items

### Adding a New Table

**IMPORTANT**: This requires TWO changes: migration + init.sql update

**1. Create Migration File**:
```sql
-- docker/postgres/migrations/001_add_users_table.sql
-- Migration: 001_add_users_table
-- Description: Add users table for authentication
-- Date: YYYY-MM-DD

BEGIN;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Record migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('001', 'add_users_table', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

**2. Update init.sql**:
Add the same table definition to `init.sql` (without migration tracking)

**3. Apply Migration to Existing Database**:
```bash
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/001_add_users_table.sql
```

**4. Verify**:
```bash
# Check table exists
docker exec -it st44-db psql -U postgres -d st44 -c "\d users"

# Check migration recorded
docker exec -it st44-db psql -U postgres -d st44 -c "SELECT * FROM schema_migrations;"
```

### Database Conventions

**Table Naming**:
- Plural, lowercase, snake_case: `users`, `order_items`

**Column Naming**:
- Lowercase, snake_case: `first_name`, `created_at`

**Primary Keys**:
- Name: `id`
- Type: `SERIAL` (auto-increment integer)

**Timestamps**:
- `created_at`: Auto-set on insert
- `updated_at`: Update manually or via trigger

**Foreign Keys**:
```sql
CONSTRAINT fk_user_id 
FOREIGN KEY (user_id) 
REFERENCES users(id) 
ON DELETE CASCADE
```

**Indexes**:
- Add for frequently queried columns
- Add for foreign keys
- Add for unique constraints
```sql
CREATE INDEX idx_tablename_columnname ON tablename(columnname);
```

## Common Database Operations

### View Current Schema
```bash
docker exec -it st44-db psql -U postgres st44 -c "\dt"
```

### Describe Table
```bash
docker exec -it st44-db psql -U postgres st44 -c "\d items"
```

### Execute Query
```bash
docker exec -it st44-db psql -U postgres st44 -c "SELECT * FROM items;"
```

### Interactive psql
```bash
docker exec -it st44-db psql -U postgres st44
```

### Backup Database
```bash
docker exec st44-db pg_dump -U postgres st44 > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database
```bash
docker exec -i st44-db psql -U postgres st44 < backup.sql
```

### Run SQL File
```bash
docker exec -i st44-db psql -U postgres st44 < migration.sql
```

## Migration Strategy (Future)

**Current State**: File-based migrations with manual application

**How It Works**:
1. Each schema change gets a numbered migration file
2. Migrations run via psql command
3. `schema_migrations` table tracks what's applied
4. Idempotent migrations safe to re-run

**Running Migrations**:
```bash
# Local development
for file in docker/postgres/migrations/*.sql; do
  docker exec -i st44-db psql -U postgres st44 < "$file"
done

# Production (CI/CD)
for file in docker/postgres/migrations/*.sql; do
  psql $DATABASE_URL < "$file" || exit 1
done
```

**Future Enhancements** (if needed):
- Automated migration runner in CI/CD
- Migration rollback support
- Migration status dashboard
- Dry-run testing

**Current approach is sufficient for:**
- Small to medium projects
- Predictable deployment schedules
- Version-controlled schema changes

## Database Best Practices

### Schema Design
- [ ] Normalize data (avoid duplication)
- [ ] Use appropriate data types
- [ ] Add NOT NULL where appropriate
- [ ] Define foreign keys with proper ON DELETE behavior
- [ ] Add indexes for performance
- [ ] Use TIMESTAMP WITH TIME ZONE for dates

### Performance
- [ ] Index frequently queried columns
- [ ] Index foreign keys
- [ ] Use EXPLAIN ANALYZE to test queries
- [ ] Avoid SELECT * (specify columns)
- [ ] Use connection pooling (already configured in backend)
- [ ] Regular VACUUM and ANALYZE

### Security
- [ ] Use parameterized queries (never concatenate SQL)
- [ ] Principle of least privilege (user permissions)
- [ ] Change default passwords
- [ ] Restrict network access
- [ ] Regular backups
- [ ] Encrypt sensitive data

### Data Integrity
- [ ] Foreign key constraints
- [ ] Unique constraints where needed
- [ ] Check constraints for validation
- [ ] Default values for timestamps
- [ ] NOT NULL for required fields

## Example Schemas

### Users Table
```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
```

### Posts with Foreign Key
```sql
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_published ON posts(published);
```

### Many-to-Many with Junction Table
```sql
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    CONSTRAINT fk_post_id 
        FOREIGN KEY (post_id) 
        REFERENCES posts(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_tag_id 
        FOREIGN KEY (tag_id) 
        REFERENCES tags(id) 
        ON DELETE CASCADE
);
```

## Troubleshooting

### Database Won't Start
**Check logs**:
```bash
docker compose logs db
```

**Common Issues**:
- Volume corruption: `docker compose down -v && docker compose up -d db`
- Port conflict: Change port in `docker-compose.yml`
- Permission issues: Check volume ownership

### Init Script Didn't Run
**Cause**: Database already exists (volume persists)

**Solution**: Remove volume and recreate:
```bash
docker compose down -v
docker compose up -d db
```

### Connection Refused from Backend
**Check**:
1. Database is running: `docker compose ps db`
2. Database is healthy: `docker exec st44-db pg_isready -U postgres`
3. Backend can reach database: `docker exec st44-backend ping db`

**Solution**: Ensure `depends_on` with health check in `docker-compose.yml`

## Related Files

- `../infra/docker-compose.yml` - Service orchestration
- `../apps/backend/src/server.ts` - Database connection
- `../infra/AGENTS.md` - Infrastructure context

---

**Last Updated**: 2025-12-13
**Update This File**: When adding tables, changing schema patterns, or implementing migrations
