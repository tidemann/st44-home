# Task: Backend Test Infrastructure Setup

## Metadata
- **ID**: task-051
- **Feature**: feature-011 - Backend Testing Infrastructure
- **Epic**: epic-006 - Testing & Quality Assurance Infrastructure
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-15
- **Assigned Agent**: backend + testing
- **Estimated Duration**: 4-5 hours

## Description
Set up comprehensive testing infrastructure for the Fastify backend including test database configuration with automatic cleanup, test fixtures and utilities, mocking infrastructure for external dependencies, and code coverage reporting. This provides the foundation for all backend unit and integration tests.

## Requirements
- Test database configuration with isolation between test runs
- Test fixtures for creating common test data (users, households, children)
- Utility functions for database cleanup and seeding
- Mocking infrastructure for external dependencies (pg.Pool, bcrypt, JWT)
- Code coverage reporting with c8
- Coverage thresholds enforced (80% minimum)
- Test helper utilities for common assertions

## Acceptance Criteria
- [ ] Test database configured (separate from dev database)
- [ ] Test fixtures created for users, households, children, tasks
- [ ] Database cleanup utility runs before/after each test suite
- [ ] Mocking utilities available for pg.Pool, bcrypt, JWT
- [ ] c8 coverage reporting configured
- [ ] Coverage thresholds set (80% minimum)
- [ ] Test utilities documented with examples
- [ ] All existing tests still pass with new infrastructure
- [ ] Coverage report generates successfully

## Dependencies
- Node.js test runner already configured
- Existing test file (server.test.ts) provides pattern to follow
- PostgreSQL test database available from E2E setup

## Technical Notes

### Test Database Strategy
Use shared test database with cleanup (current pattern in server.test.ts):
- Database: `st44_test` (already exists for E2E tests)
- Cleanup: Truncate all tables in `beforeEach()` or `afterEach()`
- Connection: Use same DB connection pattern as production but with test config

### Coverage Tool: c8
Install c8 for comprehensive coverage reporting:
```bash
npm install --save-dev c8
```

Configure in package.json:
```json
{
  "scripts": {
    "test": "tsx --test src/**/*.test.ts",
    "test:coverage": "c8 --reporter=text --reporter=lcov --check-coverage --lines 80 npm test"
  }
}
```

### Test Fixtures Pattern
Create `src/test-helpers/fixtures.ts`:
```typescript
export async function createTestUser(overrides = {}) {
  const user = {
    email: `test-${Date.now()}@example.com`,
    password_hash: await bcrypt.hash('Test123!', 10),
    ...overrides
  };
  const result = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
    [user.email, user.password_hash]
  );
  return result.rows[0];
}
```

### Mocking Pattern
Use Node.js native mocking (Node 20+):
```typescript
import { mock } from 'node:test';

// Mock database query
const mockQuery = mock.method(pool, 'query', async () => ({
  rows: [{ id: 1, email: 'test@example.com' }]
}));
```

## Affected Areas
- [x] Backend (Fastify/Node.js)
- [x] Testing infrastructure
- [ ] CI/CD (task-057 will add to CI)
- [x] Documentation

## Implementation Plan

### Phase 1: Test Database Configuration
1. Create `src/test-helpers/database.ts`
2. Export `setupTestDatabase()` function
3. Export `cleanupTestDatabase()` function
4. Test connection to `st44_test` database
5. Create truncate all tables utility

### Phase 2: Test Fixtures
1. Create `src/test-helpers/fixtures.ts`
2. Implement `createTestUser()`
3. Implement `createTestHousehold()`
4. Implement `createTestChild()`
5. Implement `createTestTask()`
6. Add cleanup tracking for created records

### Phase 3: Mocking Infrastructure
1. Create `src/test-helpers/mocks.ts`
2. Create database mock utilities
3. Create bcrypt mock utilities
4. Create JWT mock utilities
5. Document mocking patterns

### Phase 4: Coverage Reporting
1. Install c8: `npm install --save-dev c8`
2. Add `test:coverage` script to package.json
3. Configure coverage thresholds (80% lines, branches, functions)
4. Add `.c8rc.json` configuration file
5. Test coverage report generation

### Phase 5: Test Utilities
1. Create `src/test-helpers/assertions.ts`
2. Add common assertion helpers
3. Add error assertion utilities
4. Add response validation helpers

### Phase 6: Documentation
1. Create `src/test-helpers/README.md`
2. Document test database setup
3. Document fixture usage with examples
4. Document mocking patterns
5. Document coverage reporting

## Progress Log
- [2025-12-15 16:30] Task created by Orchestrator Agent

## Testing Strategy
- Verify test database connection works
- Test fixtures create valid data
- Test cleanup removes all test data
- Verify coverage report generates
- Ensure existing tests still pass

## Related PRs
[To be added during implementation]

## Lessons Learned
[To be filled after completion]
