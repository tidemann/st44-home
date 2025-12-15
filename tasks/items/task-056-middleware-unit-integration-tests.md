# Task: Middleware Unit and Integration Tests

## Metadata
- **ID**: task-056
- **Feature**: feature-011 - Backend Testing Infrastructure
- **Epic**: epic-006 - Testing & Quality Assurance Infrastructure
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-15
- **Assigned Agent**: backend + testing
- **Estimated Duration**: 3-4 hours

## Description
Create comprehensive unit and integration tests for backend middleware functions including `authenticateUser` (JWT authentication) and `validateHouseholdMembership` (authorization). Tests verify authentication success/failure, token validation, authorization checks, error handling, and middleware chaining.

## Requirements
- Unit tests for `authenticateUser` middleware (apps/backend/src/middleware/auth.ts)
- Unit tests for `validateHouseholdMembership` middleware (apps/backend/src/middleware/household-membership.ts)
- Integration tests for middleware in request pipeline
- Test authentication success and failure scenarios
- Test authorization success and denial scenarios
- Test error handling and response formats
- Test middleware chaining (auth → household validation)
- Mock JWT verification and database queries

## Acceptance Criteria
- [ ] authenticateUser middleware has comprehensive unit tests
- [ ] validateHouseholdMembership middleware has comprehensive unit tests
- [ ] Integration tests verify middleware work in request pipeline
- [ ] Test JWT validation success and failure
- [ ] Test household membership validation success and failure
- [ ] Test error responses (401, 403) with correct formats
- [ ] Test middleware sets request.user correctly
- [ ] All tests use mocked dependencies
- [ ] All tests pass in < 5 seconds
- [ ] Test coverage > 95% for middleware functions

## Dependencies
- task-051: Test infrastructure must be set up
- Middleware files exist and are documented

## Technical Notes

### Test Files to Create
- `apps/backend/src/middleware/auth.test.ts`
- `apps/backend/src/middleware/household-membership.test.ts`

### authenticateUser Middleware Tests

**Test Cases:**
- Extracts token from Authorization header (Bearer token)
- Returns 401 when Authorization header is missing
- Returns 401 when Authorization header format is invalid
- Returns 401 when token is invalid/malformed
- Returns 401 when token is expired
- Returns 401 when user doesn't exist in database
- Successfully authenticates valid token
- Sets request.user with user data
- Calls next() on success
- Does not call next() on failure

### validateHouseholdMembership Middleware Tests

**Test Cases:**
- Returns 400 when householdId parameter is missing
- Returns 400 when householdId is not a valid integer
- Returns 404 when household doesn't exist
- Returns 403 when user is not a household member
- Returns 403 when user's role is insufficient
- Successfully validates household membership
- Sets request.household with household data
- Calls next() on success
- Works correctly when chained after authenticateUser
- Does not call next() on failure

### Integration Tests

**Test Cases:**
- Full request pipeline: auth → household → route handler
- Correct error responses at each middleware layer
- Request context (user, household) available to route handlers
- Multiple middleware can be chained without issues

## Affected Areas
- [x] Backend (Fastify/Node.js)
- [x] Testing
- [ ] Documentation

## Implementation Plan

### Phase 1: authenticateUser Tests
1. Create `src/middleware/auth.test.ts`
2. Import test helpers and mocks
3. Test missing Authorization header (401)
4. Test invalid header format (401)
5. Test malformed token (401)
6. Test expired token (401)
7. Test non-existent user (401)
8. Test successful authentication
9. Verify request.user is set
10. Verify next() is called

### Phase 2: validateHouseholdMembership Tests
1. Create `src/middleware/household-membership.test.ts`
2. Import test helpers and mocks
3. Test missing householdId (400)
4. Test invalid householdId format (400)
5. Test non-existent household (404)
6. Test non-member access (403)
7. Test insufficient role (403)
8. Test successful validation
9. Verify request.household is set
10. Verify next() is called

### Phase 3: Integration Tests
1. Add integration tests to middleware test files
2. Test full middleware chain
3. Test error propagation
4. Test request context availability
5. Test middleware order dependencies

### Phase 4: Edge Cases
1. Test concurrent authentication attempts
2. Test token refresh scenarios
3. Test household deletion during request
4. Test user deletion during request
5. Test database connection failures

## Progress Log
- [2025-12-15 16:30] Task created by Orchestrator Agent

## Testing Strategy
- Mock JWT verification (no real JWT operations)
- Mock database queries (no real database calls)
- Test both unit (isolated) and integration (chained) scenarios
- Verify error responses match API contracts
- Ensure no side effects between tests

## Related PRs
[To be added during implementation]

## Lessons Learned
[To be filled after completion]
