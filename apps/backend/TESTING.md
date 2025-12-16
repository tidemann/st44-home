# Backend Testing Guide

## Overview

This guide covers the testing infrastructure for the Fastify backend API. We use Node.js's built-in test runner with TypeScript (via tsx) for both unit and integration tests.

**Test Stack:**

- **Runner**: Node.js `node:test` module
- **Assertions**: Node.js `node:assert` module
- **TypeScript**: tsx for direct TS execution
- **Coverage**: c8
- **Database**: PostgreSQL (real DB for integration tests)

## Quick Start

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx tsx --test src/utils/password.test.ts

# Run tests matching a pattern
npx tsx --test src/routes/*.test.ts
```

## Running Tests

### All Tests

```bash
npm test
```

### Unit Tests Only

```bash
npx tsx --test src/utils/*.test.ts src/middleware/auth.test.ts
```

### Integration Tests Only

```bash
npx tsx --test src/routes/*.test.ts src/middleware/household-membership.test.ts
```

### With Coverage

```bash
npm run test:coverage
```

## Writing Unit Tests

Unit tests test functions in isolation without external dependencies (database, network).

### Test File Structure

```typescript
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { functionToTest } from './module.ts';

describe('Module Name', () => {
  describe('functionToTest', () => {
    test('should do something', () => {
      const result = functionToTest('input');
      assert.strictEqual(result, 'expected');
    });
  });
});
```

### Example: Password Validation Test

```typescript
// src/utils/password.test.ts
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { validatePasswordStrength } from './password.ts';

describe('validatePasswordStrength', () => {
  test('should return true for valid password', () => {
    assert.strictEqual(validatePasswordStrength('Test1234'), true);
  });

  test('should return false for password without uppercase', () => {
    assert.strictEqual(validatePasswordStrength('test1234'), false);
  });

  test('should return false for null/undefined', () => {
    assert.strictEqual(validatePasswordStrength(null as any), false);
  });
});
```

### Example: JWT Test

```typescript
// src/utils/jwt.test.ts
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { generateAccessToken, verifyAccessToken } from './jwt.ts';

describe('JWT Utilities', () => {
  const testSecret = 'test-secret';

  test('should generate valid JWT', () => {
    const token = generateAccessToken('user-123', 'test@example.com', testSecret);
    assert.ok(token.split('.').length === 3);
  });

  test('should verify valid token', () => {
    const token = generateAccessToken('user-123', 'test@example.com', testSecret);
    const result = verifyAccessToken(token, testSecret);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.payload?.userId, 'user-123');
  });
});
```

### Example: Auth Middleware Test

```typescript
// src/middleware/auth.test.ts
import { test, describe } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { authenticateUser } from './auth.ts';

function createMockRequest(authHeader?: string) {
  return {
    headers: { authorization: authHeader },
    log: { warn: () => {}, error: () => {} },
    user: undefined,
  } as any;
}

function createMockReply() {
  let statusCode = 200;
  let body: any = null;
  return {
    code: (c: number) => {
      statusCode = c;
      return this;
    },
    send: (b: any) => {
      body = b;
      return this;
    },
    getStatus: () => statusCode,
    getBody: () => body,
  } as any;
}

describe('authenticateUser', () => {
  test('should return 401 when header is missing', async () => {
    const request = createMockRequest(undefined);
    const reply = createMockReply();
    await authenticateUser(request, reply);
    assert.strictEqual(reply.getStatus(), 401);
  });
});
```

## Writing Integration Tests

Integration tests test API endpoints with a real database connection.

### Test File Structure

```typescript
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';

describe('API Name', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;

  before(async () => {
    app = await build();
    await app.ready();
    pool = new pg.Pool({
      /* config */
    });
    // Setup test data
  });

  after(async () => {
    // Cleanup test data
    await pool.end();
    await app.close();
  });

  test('should do something', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/endpoint',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(response.statusCode, 200);
  });
});
```

### Example: Household API Test

```typescript
// src/routes/households.test.ts
describe('POST /api/households', () => {
  test('should create a new household', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/households',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { name: 'Test Household' },
    });

    assert.strictEqual(response.statusCode, 201);
    const body = JSON.parse(response.body);
    assert.ok(body.id);
    assert.strictEqual(body.role, 'admin');
  });

  test('should reject without authentication', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/households',
      payload: { name: 'Unauthenticated' },
    });
    assert.strictEqual(response.statusCode, 401);
  });
});
```

### Example: Authorization Test

```typescript
test('should reject non-member access (403)', async () => {
  const response = await app.inject({
    method: 'GET',
    url: `/api/households/${householdId}`,
    headers: { Authorization: `Bearer ${outsiderToken}` },
  });
  assert.strictEqual(response.statusCode, 403);
});
```

## Test Database Management

### Configuration

Tests use PostgreSQL with these default settings:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=st44_test (or st44 for local)
DB_USER=postgres
DB_PASSWORD=postgres
```

### Local Setup

```bash
# Start database container
cd infra && docker compose up -d db

# Tests will use the dev database
npm test
```

### CI Setup

CI workflow automatically:

1. Starts PostgreSQL 17 service
2. Initializes database from `docker/postgres/init.sql`
3. Runs tests with test database

### Test Data Isolation

Each test suite should:

1. Create its own test users and data in `before()`
2. Clean up all created data in `after()`
3. Use unique identifiers (e.g., `Date.now()` in emails)

```typescript
before(async () => {
  const email = `test-${Date.now()}@example.com`;
  // Create user with unique email
});

after(async () => {
  // Delete created users, households, etc.
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
});
```

## Mocking Patterns

### When to Mock

- **Unit tests**: Mock everything external (DB, JWT, bcrypt)
- **Integration tests**: Use real implementations

### Mock Request/Reply

```typescript
function createMockRequest(authHeader?: string) {
  return {
    headers: { authorization: authHeader },
    log: { warn: () => {}, error: () => {}, info: () => {} },
    user: undefined,
  } as any;
}

function createMockReply() {
  let statusCode = 200;
  let body: any = null;
  let sent = false;
  return {
    code: function (c: number) {
      statusCode = c;
      return this;
    },
    send: function (b: any) {
      body = b;
      sent = true;
      return this;
    },
    getStatus: () => statusCode,
    getBody: () => body,
    wasSent: () => sent,
  } as any;
}
```

## Code Coverage

### Running Coverage

```bash
npm run test:coverage
```

### Coverage Thresholds

- **Lines**: 80% minimum
- **Functions**: 80% minimum
- **Branches**: 70% minimum

### Viewing Reports

Coverage reports are generated in `coverage/` directory:

- `coverage/lcov-report/index.html` - HTML report
- `coverage/lcov.info` - LCOV format for CI tools

## Best Practices

1. **Test Independence**: Each test should be able to run in isolation
2. **Descriptive Names**: Use clear test names that describe the scenario
3. **Arrange-Act-Assert**: Structure tests in three phases
4. **Test Edge Cases**: Include null, empty, invalid inputs
5. **Clean Up**: Always clean up test data
6. **Use Unique Data**: Avoid conflicts with timestamps in emails/names
7. **Fast Tests**: Unit tests < 100ms, integration tests < 5s each

## Troubleshooting

### Database Connection Refused

```
Error: connect ECONNREFUSED ::1:5432
```

**Solution**: Start the database container:

```bash
cd infra && docker compose up -d db
```

### Tests Pass Locally, Fail in CI

**Common causes**:

- Missing environment variables
- Database not initialized
- Timing issues (add small delays or retries)

### Port Already in Use

```bash
# Find and kill process on port 5432
netstat -ano | findstr :5432
taskkill /PID <pid> /F
```

### Timeout Errors

- Increase timeout in test or CI config
- Check for unresolved promises
- Ensure `app.close()` is called in `after()`

### Coverage Below Threshold

- Run coverage locally to see uncovered lines
- Focus on critical paths first
- Add tests for error handling branches

## File Organization

```
src/
├── middleware/
│   ├── auth.ts
│   ├── auth.test.ts           # Unit tests
│   ├── household-membership.ts
│   └── household-membership.test.ts  # Integration tests
├── routes/
│   ├── households.ts
│   ├── households.test.ts     # Integration tests
│   ├── children.ts
│   ├── children.test.ts
│   └── invitations.ts
├── utils/
│   ├── password.ts
│   ├── password.test.ts       # Unit tests
│   ├── jwt.ts
│   └── jwt.test.ts            # Unit tests
├── test-helpers/
│   ├── database.ts            # Test DB utilities
│   ├── fixtures.ts            # Test data factories
│   ├── mocks.ts               # Mock utilities
│   └── assertions.ts          # Custom assertions
└── server.test.ts             # Server integration tests
```
