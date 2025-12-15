# Test Database Seed Files

This directory contains SQL seed files for populating the test database with sample data for manual testing and development.

## Files

- **01-users.sql** - Sample test users with pre-hashed passwords
- **02-households.sql** - Sample households and household members
- **03-children.sql** - Sample children for test households
- **04-tasks.sql** - Sample tasks for test households

## Loading Seed Files

### Via Docker (Recommended)

```bash
# Load all seed files in order
for file in docker/postgres/test-seeds/*.sql; do
  docker exec -i st44-test-db psql -U postgres -d st44_test < "$file"
done
```

### Via psql directly

```bash
# If you have PostgreSQL client installed
psql -h localhost -p 55432 -U postgres -d st44_test -f docker/postgres/test-seeds/01-users.sql
psql -h localhost -p 55432 -U postgres -d st44_test -f docker/postgres/test-seeds/02-households.sql
psql -h localhost -p 55432 -U postgres -d st44_test -f docker/postgres/test-seeds/03-children.sql
psql -h localhost -p 55432 -U postgres -d st44_test -f docker/postgres/test-seeds/04-tasks.sql
```

### PowerShell Script

```powershell
# Load all seed files
Get-ChildItem -Path "docker/postgres/test-seeds/*.sql" | Sort-Object Name | ForEach-Object {
  Get-Content $_.FullName | docker exec -i st44-test-db psql -U postgres -d st44_test
}
```

## Test Credentials

All sample users use the same password for convenience:

- **Email**: parent1@test.local, parent2@test.local, guest@test.local
- **Password**: `SecureTestPass123!`

## Sample Data Overview

### The Smith Family
- **Parent**: Test Parent 1 (parent1@test.local)
- **Children**: Emma Smith (8), Noah Smith (10)
- **Tasks**: Clean Room, Do Homework, Feed Pet

### The Johnson Family
- **Parent**: Test Parent 2 (parent2@test.local)
- **Children**: Olivia Johnson (7), Liam Johnson (9), Ava Johnson (11)
- **Tasks**: Load Dishwasher, Take Out Trash

## Idempotency

All seed files use `ON CONFLICT DO NOTHING` clauses, making them safe to run multiple times. Existing records will not be duplicated.

## Programmatic Seeding

For E2E tests, prefer using the TypeScript seeding utilities in `apps/frontend/e2e/helpers/seed-database.ts`. These files are primarily for manual testing and exploration.

## Cleaning Test Data

To reset the test database:

```typescript
import { resetDatabase } from './apps/frontend/e2e/helpers/seed-database';

await resetDatabase();
```

Or use the existing test helper:

```typescript
import { resetTestDatabase } from './apps/frontend/e2e/helpers/test-helpers';

await resetTestDatabase();
```
