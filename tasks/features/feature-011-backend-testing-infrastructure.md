# Feature: Backend Testing Infrastructure

## Metadata
- **ID**: feature-011
- **Epic**: epic-006 - Testing & Quality Assurance Infrastructure
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-15
- **Estimated Duration**: 4-5 days (28-36 hours)

## Description
Comprehensive testing infrastructure for the Fastify backend including unit tests for business logic, integration tests for API endpoints, test database isolation, mocking utilities, and CI pipeline integration. This feature ensures backend code quality, prevents regressions, and provides confidence in API behavior.

## User Stories
- **As a** backend developer, **I want** unit tests for individual functions, **so that** I can refactor code safely without breaking logic
- **As a** developer, **I want** integration tests for all API endpoints, **so that** I know the API contracts are working correctly
- **As a** team member, **I want** tests to run in CI, **so that** PRs are validated automatically before merge
- **As a** developer, **I want** test database isolation, **so that** tests don't interfere with development data
- **As a** maintainer, **I want** clear test coverage reports, **so that** I can identify untested code paths

## Requirements

### Functional Requirements
- All API endpoints have integration tests (registration, login, households, children, invitations)
- Business logic functions have unit tests (password validation, JWT generation, authorization checks)
- Database operations are tested with isolated test database
- Middleware functions (auth, household membership) have comprehensive test coverage
- Error handling paths are tested for all endpoints
- Test utilities for database seeding, fixture creation, and cleanup

### Non-Functional Requirements
- **Performance**: Test suite completes in < 60 seconds
- **Coverage**: Minimum 80% code coverage for backend
- **Isolation**: Tests don't depend on execution order or external state
- **CI Integration**: Tests run automatically on every PR
- **Maintainability**: Clear test structure with describe/test organization
- **Documentation**: Testing guide with examples for common patterns

## Acceptance Criteria
- [ ] All existing API endpoints have integration tests (auth, households, children, invitations)
- [ ] Unit tests for password validation, JWT utilities, authorization logic
- [ ] Test database configured with automatic cleanup between tests
- [ ] Mocking utilities for external dependencies (database, JWT, bcrypt)
- [ ] Backend CI job runs all tests (`npm test`)
- [ ] Test coverage report generated and displayed in CI
- [ ] Coverage threshold enforced (80% minimum)
- [ ] Testing documentation created with examples
- [ ] All tests passing (100% success rate)
- [ ] Test execution time < 60 seconds

## Tasks
**⚠️ Feature must be broken down into tasks by Orchestrator Agent before implementation**

Preliminary task breakdown (to be refined):

- [ ] **task-051**: Configure test infrastructure (4-5h)
  - Test database setup with isolation
  - Test utilities for fixtures and cleanup
  - Mocking infrastructure for external dependencies
  - Coverage reporting configuration

- [ ] **task-052**: Unit tests for utilities and services (6-8h)
  - Password validation unit tests
  - JWT generation/verification unit tests
  - Authorization logic unit tests
  - Error handling utility tests

- [ ] **task-053**: Integration tests for household endpoints (5-6h)
  - GET /api/households (list households for user)
  - POST /api/households (create household)
  - GET /api/households/:id (get household details)
  - PUT /api/households/:id (update household)
  - DELETE /api/households/:id (delete household)
  - Test authentication and authorization

- [ ] **task-054**: Integration tests for children endpoints (5-6h)
  - GET /api/households/:id/children (list children)
  - POST /api/households/:id/children (create child)
  - GET /api/children/:id (get child details)
  - PUT /api/children/:id (update child)
  - DELETE /api/children/:id (delete child)
  - Test household membership validation

- [ ] **task-055**: Integration tests for invitation endpoints (4-5h)
  - POST /api/invitations (create invitation)
  - GET /api/invitations/:token (get invitation details)
  - POST /api/invitations/:token/accept (accept invitation)
  - POST /api/invitations/:token/decline (decline invitation)
  - Test email validation and expiration

- [ ] **task-056**: Middleware tests (3-4h)
  - authenticateUser middleware comprehensive tests
  - validateHouseholdMembership middleware tests
  - Error handling middleware tests

- [ ] **task-057**: CI pipeline integration (2-3h)
  - Add npm test to backend CI job
  - Configure coverage reporting
  - Set up coverage thresholds
  - Add test result artifacts

- [ ] **task-058**: Backend testing documentation (2-3h)
  - Testing guide with examples
  - How to write unit vs integration tests
  - Test database setup instructions
  - Mocking patterns and best practices
  - Coverage expectations

## Dependencies
- None (can start immediately)
- Existing test files provide foundation (server.test.ts with 30+ auth tests)
- Node.js test runner already configured
- Test database pattern established in E2E tests (can reuse)

## Technical Notes

### Current State
- ✅ Node.js test runner configured (`tsx --test`)
- ✅ 1 test file with 30+ integration tests (server.test.ts - auth endpoints)
- ✅ 2 placeholder test files (households.test.ts, children.test.ts - empty)
- ❌ Tests NOT running in CI pipeline
- ❌ No code coverage reporting
- ❌ No unit tests (only integration tests)
- ❌ No test database isolation strategy
- ❌ No mocking infrastructure

### Test Database Strategy
**Option 1: Shared Test Database with Cleanup** (Current pattern in server.test.ts)
- Use single test database (st44_test_local or st44_test)
- Clean up test data in `after()` hooks
- **Pros**: Simple, matches production schema
- **Cons**: Tests can interfere if cleanup fails

**Option 2: Isolated Test Database per Suite** (Recommended)
- Create unique database per test suite: `st44_test_${Date.now()}`
- Drop database after suite completes
- **Pros**: Perfect isolation, parallel execution possible
- **Cons**: Slightly slower, requires database creation privileges

**Recommendation**: Start with Option 1 (current pattern), migrate to Option 2 if flakiness occurs

### Test Structure
```
apps/backend/src/
├── server.test.ts (integration - auth endpoints) ✅ EXISTS
├── routes/
│   ├── households.test.ts (integration - household endpoints) 🔧 EMPTY
│   ├── children.test.ts (integration - children endpoints) 🔧 EMPTY
│   └── invitations.test.ts (integration - invitation endpoints) ❌ NEW
├── middleware/
│   ├── auth.test.ts (unit + integration) ❌ NEW
│   └── household-membership.test.ts (unit + integration) ❌ NEW
└── utils/ (if created)
    ├── password.test.ts (unit - password validation) ❌ NEW
    ├── jwt.test.ts (unit - JWT utilities) ❌ NEW
    └── validation.test.ts (unit - input validation) ❌ NEW
```

### Coverage Tool Options
**Option 1: c8** (Istanbul wrapper for Node.js native coverage)
```bash
npm install --save-dev c8
# package.json: "test:coverage": "c8 --reporter=text --reporter=lcov npm test"
```

**Option 2: Native Node.js coverage** (Node.js 20+)
```bash
# package.json: "test:coverage": "node --test --experimental-test-coverage src/**/*.test.ts"
```

**Recommendation**: Use c8 for better reporting and thresholds

### Mocking Strategy
Use Node.js built-in `mock` module (available in Node.js 20+):
```typescript
import { mock } from 'node:test';

// Mock pg.Pool.query
const mockQuery = mock.method(pool, 'query', () => ({
  rows: [{ id: 1, email: 'test@example.com' }]
}));
```

For complex scenarios, consider adding `sinon` for more powerful mocking.

## UI/UX Considerations
N/A - Backend infrastructure feature (no user-facing UI)

## Implementation Plan
[To be filled by Orchestrator Agent after task breakdown]

### Phase 1: Infrastructure Setup (task-051)
- Test database configuration
- Test fixtures and utilities
- Mocking infrastructure
- Coverage reporting setup

### Phase 2: Existing Endpoint Tests (tasks-053, 054, 055)
- Households API integration tests
- Children API integration tests  
- Invitations API integration tests

### Phase 3: Unit Tests (task-052, 056)
- Password validation unit tests
- JWT utilities unit tests
- Middleware unit tests

### Phase 4: CI Integration (task-057)
- Add tests to CI pipeline
- Coverage reporting and thresholds
- Test artifacts

### Phase 5: Documentation (task-058)
- Testing guide
- Examples and patterns
- Best practices

## Progress Log
- [2025-12-15 16:20] Feature created by Planner Agent
- [2025-12-15 16:20] Preliminary task breakdown (8 tasks, 28-36 hours)

## Testing Strategy
- [ ] All API endpoints have integration tests
- [ ] Business logic has unit test coverage
- [ ] Middleware functions comprehensively tested
- [ ] Test suite runs in < 60 seconds
- [ ] Code coverage > 80%
- [ ] All tests passing in CI

## Test Coverage Goals

### Critical Paths (Must have 100% coverage)
- Authentication (registration, login, token refresh, logout) ✅ DONE
- Authorization middleware (authenticateUser) 🔧 PARTIAL
- Household membership validation 🔧 PARTIAL
- Password validation ✅ DONE
- JWT token generation/verification ✅ DONE

### High Priority (Target 90%+ coverage)
- Household CRUD operations ❌ NOT TESTED
- Children CRUD operations ❌ NOT TESTED
- Invitation creation and acceptance ❌ NOT TESTED
- Error handling for all endpoints ❌ NOT TESTED

### Medium Priority (Target 80%+ coverage)
- Input validation
- Database query builders
- Response formatting

### Lower Priority (Target 60%+ coverage)
- Server initialization
- Health check endpoints
- Logging utilities

## Related PRs
[To be added during implementation]

## Demo/Screenshots
N/A - Backend infrastructure feature

## Lessons Learned
[To be filled after completion]

## Success Metrics
- **Code Coverage**: Achieve 80%+ coverage (from 0% currently)
- **Test Count**: 100+ tests (from 30 currently)
- **CI Integration**: Tests run automatically on every PR
- **Execution Time**: Test suite completes in < 60 seconds
- **Regression Prevention**: No untested endpoints remain
- **Developer Confidence**: Team can refactor without fear
