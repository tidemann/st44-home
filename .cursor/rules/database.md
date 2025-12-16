# Database Development Rules

When working with PostgreSQL database code in this project, follow these rules:

## Migrations
- **Always create a migration file** in `docker/postgres/migrations/`
- Follow naming convention: `NNN_descriptive_name.sql` (001, 002, etc.)
- Use `TEMPLATE.sql` as starting point
- Make migrations **idempotent** (use `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, etc.)
- Include transaction blocks (`BEGIN`/`COMMIT`)
- Update `schema_migrations` table

## Schema Changes
- For new tables: Update both migration file AND `docker/postgres/init.sql`
- Use consistent naming conventions (snake_case for tables/columns)
- Add appropriate indexes
- Include foreign key constraints where needed

## Queries
- **Always use parameterized queries** - Never concatenate user input
- Use connection pooling (`pg.Pool`)
- Handle errors gracefully
- Use transactions for multi-step operations

## Testing Migrations
```bash
# Apply migration
docker exec -i st44-db psql -U postgres -d st44 < docker/postgres/migrations/NNN_name.sql

# Verify
docker exec -it st44-db psql -U postgres -d st44 -c "SELECT * FROM schema_migrations ORDER BY version;"
```

## Reference
- See `docker/postgres/migrations/README.md` for migration documentation
- See `apps/backend/AGENTS.md` for database query patterns
- See `.github/copilot-instructions.md` for coding standards

