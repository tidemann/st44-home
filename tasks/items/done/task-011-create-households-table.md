# Task: Create Households Table

## Metadata
- **ID**: task-011
- **Feature**: feature-002 - Multi-Tenant Database Schema
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: completed
- **Priority**: critical
- **Created**: 2025-12-14
- **Completed**: 2025-12-14
- **Assigned Agent**: database
- **Estimated Duration**: 2-3 hours
- **Actual Duration**: 0.5 hours

## Description
Create the households table which serves as the primary tenant identifier in the multi-tenant architecture. This table is the foundation for data isolation, with all other tables referencing household_id to ensure proper data scoping. Every query must filter by household_id to prevent data leaks between families.

## Requirements
- Create households table with UUID primary key
- Include name, created_at, updated_at columns
- Use gen_random_uuid() for automatic UUID generation
- Create migration file following project conventions
- Test migration up and down (idempotent)
- Update init.sql for fresh installs

## Acceptance Criteria
- [x] Migration file created in `docker/postgres/migrations/` with proper naming (011_create_households_table.sql)
- [x] Households table has id (UUID PK), name (VARCHAR 255 NOT NULL), created_at, updated_at
- [x] Migration uses IF NOT EXISTS for idempotency
- [x] Migration records itself in schema_migrations table
- [x] Migration tested locally (up and down)
- [x] init.sql updated with households table
- [x] Migration follows project conventions from migrations/README.md

## Dependencies
- PostgreSQL 17 database running
- Migration system from task-001 (already complete)
- Users table from feature-001 (already complete)

## Technical Notes

### Table Schema
```sql
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Migration File Structure
- Use TEMPLATE.sql as starting point
- Name: `011_create_households_table.sql`
- Wrap in BEGIN/COMMIT transaction
- Record in schema_migrations
- Make idempotent with IF NOT EXISTS

### Testing Commands
```bash
# Apply migration
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/011_create_households_table.sql

# Verify
docker exec -it st44-db psql -U postgres -d st44 -c "\d households"
docker exec -it st44-db psql -U postgres -d st44 -c "SELECT * FROM schema_migrations ORDER BY version;"
```

## Affected Areas
- [x] Database (PostgreSQL)
- [ ] Backend (Fastify/Node.js)
- [ ] Frontend (Angular)
- [ ] Infrastructure (Docker/Nginx)
- [ ] CI/CD
- [x] Documentation

## Implementation Plan

### Research Phase
- [x] Review migration system documentation
- [x] Review existing migrations (001-010)
- [x] Understand households table requirements

### Implementation Steps
1. Create migration file `011_create_households_table.sql`
2. Add CREATE TABLE IF NOT EXISTS households with proper columns
3. Add migration tracking INSERT INTO schema_migrations
4. Wrap in BEGIN/COMMIT transaction
5. Test migration locally
6. Update init.sql with households table
7. Verify table structure with \d command

### Testing Strategy
- Apply migration and verify table created
- Check schema_migrations entry
- Verify column types and constraints
- Test migration idempotency (run twice)
- Verify init.sql includes new table

## Progress Log
- [2025-12-14 00:20] Task created from feature-002 breakdown
- [2025-12-14 00:30] Status changed to in-progress
- [2025-12-14 00:35] Migration file 011_create_households_table.sql created
- [2025-12-14 00:40] Updated init.sql with households table and trigger
- [2025-12-14 00:45] Migration applied successfully to database
- [2025-12-14 00:50] Table structure verified - id (UUID PK), name (VARCHAR 255), created_at, updated_at
- [2025-12-14 00:55] Migration recorded in schema_migrations (version 011)
- [2025-12-14 01:00] Idempotency tested - migration can be run multiple times safely
- [2025-12-14 01:05] All acceptance criteria met, status changed to completed

## Related Files
- `docker/postgres/migrations/011_create_households_table.sql` - Migration file
- `docker/postgres/init.sql` - Fresh install script
- `docker/postgres/migrations/README.md` - Migration conventions

## Lessons Learned
- Migration creation was straightforward following TEMPLATE.sql conventions
- IF NOT EXISTS clause ensures idempotent migrations
- Including triggers in init.sql maintains consistency with migration files
- Testing with information_schema.columns provides clear verification
- Actual time (0.5h) was much faster than estimated (2-3h) due to clear specifications
