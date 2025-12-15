# Task: Integration Tests for Children Endpoints

## Metadata
- **ID**: task-054
- **Feature**: feature-011 - Backend Testing Infrastructure
- **Epic**: epic-006 - Testing & Quality Assurance Infrastructure
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-15
- **Assigned Agent**: backend + testing
- **Estimated Duration**: 5-6 hours

## Description
Create comprehensive integration tests for all children API endpoints including list, create, read, update, and delete operations. Tests verify authentication, household membership validation, request/response formats, error handling, and database interactions for the children management API.

## Requirements
- Integration tests for GET /api/households/:householdId/children (list children)
- Integration tests for POST /api/households/:householdId/children (create child)
- Integration tests for GET /api/children/:id (get child details)
- Integration tests for PUT /api/children/:id (update child)
- Integration tests for DELETE /api/children/:id (delete child)
- Test authentication requirements (401 if not authenticated)
- Test household membership validation (403 if not member)
- Test input validation (400 for invalid data)
- Test error responses (proper status codes and messages)
- Use test database with fixtures for data isolation

## Acceptance Criteria
- [ ] All 5 children endpoints have integration tests
- [ ] Authentication tests: 401 responses when not logged in
- [ ] Household membership tests: 403 responses for non-members
- [ ] Validation tests: 400 responses for invalid input
- [ ] Success tests: 200/201 responses with correct data
- [ ] Database state verified after mutations
- [ ] Tests use fixtures for test data setup
- [ ] Tests clean up after themselves
- [ ] All tests pass in < 10 seconds
- [ ] Test coverage > 90% for children routes

## Dependencies
- task-051: Test infrastructure must be set up
- task-053: Household tests provide pattern to follow
- Existing children.test.ts file (currently empty placeholder)

## Technical Notes

### Test File Location
- File exists: `apps/backend/src/routes/children.test.ts` (currently empty)
- Add comprehensive integration tests to this file

### Children-Specific Test Cases

**GET /api/households/:householdId/children**
- Returns 401 when not authenticated
- Returns 403 when user is not household member
- Returns empty array when household has no children
- Returns all children in household
- Does not return children from other households

**POST /api/households/:householdId/children**
- Returns 401 when not authenticated
- Returns 403 when user is not household member
- Returns 400 when name is missing
- Returns 400 when date_of_birth is invalid
- Creates child successfully with valid data
- Associates child with correct household

**GET /api/children/:id**
- Returns 401 when not authenticated
- Returns 404 when child doesn't exist
- Returns 403 when user is not household member
- Returns child details for authorized user
- Includes household information

**PUT /api/children/:id**
- Returns 401 when not authenticated
- Returns 404 when child doesn't exist
- Returns 403 when user is not household member
- Returns 400 for invalid data
- Updates child successfully
- Returns updated child data

**DELETE /api/children/:id**
- Returns 401 when not authenticated
- Returns 404 when child doesn't exist
- Returns 403 when user is not household member
- Deletes child successfully
- Cascades to related data (task assignments, completions)

## Affected Areas
- [x] Backend (Fastify/Node.js)
- [x] Testing
- [x] Database

## Implementation Plan

### Phase 1: Setup and Authentication Tests
1. Import test helpers and fixtures
2. Set up test database lifecycle
3. Write authentication tests (401 responses)

### Phase 2: GET /api/households/:householdId/children Tests
1. Test unauthenticated request (401)
2. Test non-member access (403)
3. Test empty children list
4. Test children list for household
5. Test isolation (no other household's children)

### Phase 3: POST /api/households/:householdId/children Tests
1. Test unauthenticated request (401)
2. Test non-member access (403)
3. Test missing name (400)
4. Test invalid date_of_birth (400)
5. Test successful creation (201)
6. Verify household association
7. Verify database state

### Phase 4: GET /api/children/:id Tests
1. Test unauthenticated request (401)
2. Test non-existent child (404)
3. Test non-member access (403)
4. Test authorized access (200)
5. Verify response structure

### Phase 5: PUT /api/children/:id Tests
1. Test unauthenticated request (401)
2. Test non-existent child (404)
3. Test non-member access (403)
4. Test invalid data (400)
5. Test successful update (200)
6. Verify database state

### Phase 6: DELETE /api/children/:id Tests
1. Test unauthenticated request (401)
2. Test non-existent child (404)
3. Test non-member access (403)
4. Test successful deletion (200)
5. Verify cascade deletion

## Progress Log
- [2025-12-15 16:30] Task created by Orchestrator Agent

## Testing Strategy
- Follow patterns from household tests (task-053)
- Use test fixtures for creating users, households, and children
- Clean database before each test
- Test both happy path and error cases
- Verify household membership validation works correctly

## Related PRs
[To be added during implementation]

## Lessons Learned
[To be filled after completion]
