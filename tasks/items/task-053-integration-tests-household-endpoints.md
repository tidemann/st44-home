# Task: Integration Tests for Household Endpoints

## Metadata
- **ID**: task-053
- **Feature**: feature-011 - Backend Testing Infrastructure
- **Epic**: epic-006 - Testing & Quality Assurance Infrastructure
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-15
- **Assigned Agent**: backend + testing
- **Estimated Duration**: 5-6 hours

## Description
Create comprehensive integration tests for all household API endpoints including list, create, read, update, and delete operations. Tests verify authentication, authorization, request/response formats, error handling, and database interactions for the household management API.

## Requirements
- Integration tests for GET /api/households (list user's households)
- Integration tests for POST /api/households (create new household)
- Integration tests for GET /api/households/:id (get household details)
- Integration tests for PUT /api/households/:id (update household)
- Integration tests for DELETE /api/households/:id (delete household)
- Test authentication requirements (401 if not authenticated)
- Test authorization (403 if not household member)
- Test input validation (400 for invalid data)
- Test error responses (proper status codes and messages)
- Use test database with fixtures for data isolation

## Acceptance Criteria
- [ ] All 5 household endpoints have integration tests
- [ ] Authentication tests: 401 responses when not logged in
- [ ] Authorization tests: 403 responses for non-members
- [ ] Validation tests: 400 responses for invalid input
- [ ] Success tests: 200/201 responses with correct data
- [ ] Database state verified after mutations
- [ ] Tests use fixtures for test data setup
- [ ] Tests clean up after themselves
- [ ] All tests pass in < 10 seconds
- [ ] Test coverage > 90% for household routes

## Dependencies
- task-051: Test infrastructure must be set up
- Existing households.test.ts file (currently empty placeholder)

## Technical Notes

### Test File Location
- File exists: `apps/backend/src/routes/households.test.ts` (currently empty)
- Add comprehensive integration tests to this file

### Test Structure Pattern
```typescript
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { setupTestDatabase, cleanupTestDatabase } from '../test-helpers/database.js';
import { createTestUser, createTestHousehold } from '../test-helpers/fixtures.js';

describe('Household API Endpoints', () => {
  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clean database before each test
  });

  describe('GET /api/households', () => {
    it('returns 401 when not authenticated', async () => {
      // Test logic
    });

    it('returns user\'s households when authenticated', async () => {
      // Test logic
    });
  });

  // More test suites...
});
```

### Test Cases per Endpoint

**GET /api/households**
- Returns 401 when not authenticated
- Returns empty array when user has no households
- Returns user's households as owner
- Returns user's households as member
- Does not return households user is not part of

**POST /api/households**
- Returns 401 when not authenticated
- Returns 400 when name is missing
- Returns 400 when name is too long
- Creates household successfully with valid data
- Sets creator as owner
- Returns household with correct structure

**GET /api/households/:id**
- Returns 401 when not authenticated
- Returns 404 when household doesn't exist
- Returns 403 when user is not a member
- Returns household details for member
- Returns household details for owner

**PUT /api/households/:id**
- Returns 401 when not authenticated
- Returns 404 when household doesn't exist
- Returns 403 when user is not the owner
- Returns 400 for invalid data
- Updates household successfully
- Returns updated household

**DELETE /api/households/:id**
- Returns 401 when not authenticated
- Returns 404 when household doesn't exist
- Returns 403 when user is not the owner
- Deletes household successfully
- Cascades to related data (members, children, tasks)

## Affected Areas
- [x] Backend (Fastify/Node.js)
- [x] Testing
- [x] Database

## Implementation Plan

### Phase 1: Setup and Authentication Tests
1. Import test helpers and fixtures
2. Set up test database lifecycle (before/after hooks)
3. Write authentication tests (401 responses)

### Phase 2: GET /api/households Tests
1. Test unauthenticated request (401)
2. Test empty households list
3. Test households as owner
4. Test households as member
5. Test household isolation (no unauthorized data)

### Phase 3: POST /api/households Tests
1. Test unauthenticated request (401)
2. Test missing name (400)
3. Test invalid name (400)
4. Test successful creation (201)
5. Verify owner role is set
6. Verify database state

### Phase 4: GET /api/households/:id Tests
1. Test unauthenticated request (401)
2. Test non-existent household (404)
3. Test unauthorized access (403)
4. Test authorized access (200)
5. Verify response structure

### Phase 5: PUT /api/households/:id Tests
1. Test unauthenticated request (401)
2. Test non-existent household (404)
3. Test non-owner access (403)
4. Test invalid data (400)
5. Test successful update (200)
6. Verify database state

### Phase 6: DELETE /api/households/:id Tests
1. Test unauthenticated request (401)
2. Test non-existent household (404)
3. Test non-owner access (403)
4. Test successful deletion (200)
5. Verify cascade deletion

## Progress Log
- [2025-12-15 16:30] Task created by Orchestrator Agent

## Testing Strategy
- Use test fixtures for creating users and households
- Clean database before each test
- Test both happy path and error cases
- Verify HTTP status codes match expectations
- Verify response bodies match API contracts

## Related PRs
[To be added during implementation]

## Lessons Learned
[To be filled after completion]
