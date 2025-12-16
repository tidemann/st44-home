# Backend Test Helpers

This directory contains test utilities for the Fastify backend including database helpers, fixtures, mocks, and assertion utilities.

## Quick Start

```typescript
import { test, describe, before, after } from 'node:test';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  closeTestDatabase,
  createTestUser,
  createTestHousehold,
  assertStatusCode,
} from './test-helpers/index.ts';

describe('My Feature', () => {
  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await cleanupTestDatabase('test%@example.com');
    await closeTestDatabase();
  });

  test('should work', async () => {
    const user = await createTestUser();
    const { household } = await createTestHousehold({ ownerId: user.id });
    // ... test logic
  });
});
```

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
} from './test-helpers/index.ts';
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

Factory functions for creating test data.

```typescript
import {
  createTestUser,
  createTestHousehold,
  createTestChild,
  createTestTask,
  createCompleteTestSetup,
} from './test-helpers/index.ts';
```

**User Fixtures:**

```typescript
// Create user with defaults
const user = await createTestUser();

// Create user with specific email
const user = await createTestUser({ email: 'custom@example.com' });

// Create user with Google OAuth
const user = await createTestUser({ googleId: 'google-123' });
```

**Household Fixtures:**

```typescript
// Create household with new owner
const { household, owner } = await createTestHousehold();

// Create household with existing owner
const { household } = await createTestHousehold({ ownerId: user.id });

// Add member to household
const { member, user } = await addHouseholdMember({ householdId: household.id });
```

**Child Fixtures:**

```typescript
const child = await createTestChild({
  householdId: household.id,
  name: 'Emma',
  age: 10,
});
```

**Task Fixtures:**

```typescript
const task = await createTestTask({
  householdId: household.id,
  title: 'Clean room',
  frequency: 'daily',
  points: 10,
});
```

**Complete Setup:**

```typescript
// Create user, household, and children in one call
const { user, household, children } = await createCompleteTestSetup({
  childrenCount: 2,
  householdName: 'Smith Family',
});
```

### Mocks (`mocks.ts`)

Mocking utilities for unit tests.

```typescript
import {
  createMockPool,
  createMockBcrypt,
  createMockJwt,
  createMockRequest,
  createMockReply,
} from './test-helpers/index.ts';
```

**Database Mocks:**

```typescript
const mockPool = createMockPool();
mockPool.query.mock.mockImplementation(async () => ({
  rows: [{ id: '123', email: 'test@example.com' }],
  rowCount: 1,
}));
```

**Request/Reply Mocks:**

```typescript
const mockRequest = createMockRequest({
  body: { email: 'test@example.com', password: 'Test1234' },
  headers: { authorization: 'Bearer token' },
});

const mockReply = createMockReply();
// After calling handler:
assert.strictEqual(mockReply.statusCode, 200);
assert.deepStrictEqual(mockReply.sentPayload, { success: true });
```

**Mock Data Factories:**

```typescript
const mockUser = createMockUser({ email: 'custom@example.com' });
const mockHousehold = createMockHousehold({ name: 'Test Family' });
const mockChild = createMockChild({ name: 'Emma', age: 10 });
```

### Assertions (`assertions.ts`)

Common assertion helpers.

```typescript
import {
  assertStatusCode,
  assertErrorResponse,
  assertUUID,
  assertJWT,
  assertResponseBody,
} from './test-helpers/index.ts';
```

**Response Assertions:**

```typescript
// Assert status code
assertStatusCode(response, 200);

// Assert error response
assertErrorResponse(response, 400, 'invalid email');

// Assert response body has properties
const body = assertResponseBody<User>(response, ['id', 'email']);
```

**Value Assertions:**

```typescript
// Assert valid UUID
assertUUID(user.id);

// Assert valid JWT
assertJWT(tokens.accessToken);

// Assert valid email
assertEmail(user.email);

// Assert ISO date
assertISODate(user.created_at);
```

**Array Assertions:**

```typescript
// Assert array length
assertArrayLength(users, 3);

// Assert array contains item
const admin = assertArrayContains(users, (u) => u.role === 'admin');
```

**Async Assertions:**

```typescript
// Assert promise rejects
await assertRejects(someService.invalidOperation(), 'expected error message');
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Generate coverage report
npm run test:coverage:report
```

## Coverage Thresholds

The project enforces minimum coverage thresholds:

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 70%
- **Statements**: 80%

Coverage reports are generated in `coverage/` directory.

## Best Practices

### Test Isolation

Each test suite should clean up its own data:

```typescript
after(async () => {
  await cleanupTestDatabase('test%@example.com');
  await closeTestDatabase();
});
```

### Unique Test Data

Use unique identifiers to avoid collisions:

```typescript
const email = `test-${Date.now()}@example.com`;
// or use helper:
const email = generateTestEmail('mytest');
```

### Integration vs Unit Tests

- **Integration tests**: Use fixtures to create real database records
- **Unit tests**: Use mocks to isolate the unit under test

### Test File Naming

- Integration tests: `*.test.ts` in route directories
- Unit tests: `*.test.ts` in same directory as source file

## Troubleshooting

### Database Connection Failed

Ensure test database is running:

```bash
cd infra && docker compose up -d db
```

Or use the test database:

```bash
npm run db:test:up
```

### Tests Interfering

If tests fail intermittently, ensure proper cleanup:

1. Use unique test data (timestamps in emails/names)
2. Clean up in `after()` hooks
3. Consider using `truncateAllTables()` for full reset

### Coverage Not Working

Ensure c8 is properly configured:

1. Check `.c8rc.json` exists
2. Run `npm run test:coverage`
3. Check `coverage/` directory for reports
