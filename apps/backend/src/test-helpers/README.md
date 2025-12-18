# Backend Test Helpers

This directory contains test utilities for the Fastify backend including database helpers, fixtures, mocks, and assertion utilities.

## Modules

### Database (`database.ts`)

Test database utilities for setup, cleanup, and queries.

```typescript
import {
  setupTestDatabase,
  cleanupTestDatabase,
  truncateAllTables,
  closeTestDatabase,
  query,
  getTestPool,
} from './test-helpers/database';
```

**Functions:**

- `setupTestDatabase()` - Initialize test database connection
- `cleanupTestDatabase(pattern?)` - Delete test data (optionally matching pattern)
- `truncateAllTables()` - Fast cleanup (truncates all tables)
- `closeTestDatabase()` - Close database connection
- `query(text, params)` - Execute raw SQL query
- `getTestPool()` - Get the pg.Pool instance

**Environment Variables:**

- `TEST_DB_HOST` - Test database host (default: localhost)
- `TEST_DB_PORT` - Test database port (default: 5432)
- `TEST_DB_NAME` - Test database name (default: st44_test)
- `TEST_DB_USER` - Test database user (default: postgres)
- `TEST_DB_PASSWORD` - Test database password (default: postgres)

### Fixtures (`fixtures.ts`)

Test data factories for users, households, children, and tasks.

```typescript
import {
  createTestUser,
  createTestHousehold,
  createTestChild,
  createTestTask,
} from './test-helpers/fixtures';
```

**Functions:**

- `createTestUser(overrides?)` - Create a test user
- `createTestHousehold(overrides?)` - Create a test household
- `createTestChild(householdId, overrides?)` - Create a test child
- `createTestTask(householdId, overrides?)` - Create a test task

### Mocks (`mocks.ts`)

Mocking utilities for unit tests.

```typescript
import { createMockPool, createMockBcrypt, createMockJwt } from './test-helpers/mocks';
```

**Functions:**

- `createMockPool()` - Returns a mock pg.Pool
- `createMockBcrypt()` - Returns mock bcrypt methods
- `createMockJwt()` - Returns mock JWT methods
