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
- Only executes if database doesn't exist
- Runs in alphabetical order (useful for multiple scripts)

### Database Schema (`postgres/init.sql`)

Defines initial database structure. This file runs once when the database is first created.

**Current Schema**:
- `items` table (example table with id, title, description, timestamps)

### Schema Management

**Current State**: Single `init.sql` file
**Limitation**: Only runs on new database creation

**For Fresh Database**:
```bash
docker compose down -v  # Remove volume
docker compose up -d db  # Recreate with init.sql
```

**For Existing Database**: Manual migration required

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

**1. Add to `init.sql`**:
```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

**2. For Fresh Installation**:
- New deployments will have the table automatically

**3. For Existing Databases**:
Option A - Reset database (data loss):
```bash
docker compose down -v
docker compose up -d db
```

Option B - Manual migration:
```bash
docker exec -i st44-db psql -U postgres st44 < migration.sql
```

Option C - Migration tool (recommended for production):
- Use tools like node-pg-migrate, db-migrate, or Flyway
- Track versions and changes
- Rollback capability

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

### Option 1: SQL Files in Directory
```
docker/postgres/migrations/
├── 001_initial_schema.sql
├── 002_add_users_table.sql
└── 003_add_orders_table.sql
```

Run migrations:
```bash
for file in docker/postgres/migrations/*.sql; do
  docker exec -i st44-db psql -U postgres st44 < "$file"
done
```

### Option 2: Node Migration Tool
```bash
npm install node-pg-migrate --save-dev
```

Create migration:
```bash
npx node-pg-migrate create add-users-table
```

Run migrations:
```bash
npx node-pg-migrate up
```

### Option 3: Flyway/Liquibase
- Java-based tools
- Version control for database
- Automatic change tracking
- Rollback support

**Recommended**: Choose Option 2 (node-pg-migrate) for consistency with Node.js stack

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
- `../infra/AGENT.md` - Infrastructure context

---

**Last Updated**: 2025-12-13
**Update This File**: When adding tables, changing schema patterns, or implementing migrations
