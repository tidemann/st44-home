# Task: Integration Tests for Invitation Endpoints

## Metadata
- **ID**: task-055
- **Feature**: feature-011 - Backend Testing Infrastructure
- **Epic**: epic-006 - Testing & Quality Assurance Infrastructure
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-15
- **Assigned Agent**: backend + testing
- **Estimated Duration**: 4-5 hours

## Description
Create comprehensive integration tests for invitation API endpoints including create invitation, get invitation details, accept invitation, and decline invitation. Tests verify authentication, authorization, email validation, token generation, expiration handling, and database state management for the invitation system.

## Requirements
- Integration tests for POST /api/invitations (create invitation)
- Integration tests for GET /api/invitations/:token (get invitation details)
- Integration tests for POST /api/invitations/:token/accept (accept invitation)
- Integration tests for POST /api/invitations/:token/decline (decline invitation)
- Test authentication requirements (401 if not authenticated)
- Test household ownership validation (only owner can invite)
- Test email validation (400 for invalid email)
- Test token expiration handling
- Test invitation acceptance creates household membership
- Use test database with fixtures for data isolation

## Acceptance Criteria
- [ ] All 4 invitation endpoints have integration tests
- [ ] Authentication tests: 401 responses when not logged in
- [ ] Authorization tests: 403 responses for non-owners
- [ ] Email validation tests: 400 responses for invalid emails
- [ ] Token expiration tests: 410 responses for expired invitations
- [ ] Acceptance tests: Verify household membership created
- [ ] Success tests: 200/201 responses with correct data
- [ ] Database state verified after mutations
- [ ] Tests use fixtures for test data setup
- [ ] All tests pass in < 8 seconds
- [ ] Test coverage > 90% for invitation routes

## Dependencies
- task-051: Test infrastructure must be set up
- task-053: Household tests provide pattern to follow
- Invitation routes exist in `apps/backend/src/routes/invitations.ts`

## Technical Notes

### Test File to Create
- Create new file: `apps/backend/src/routes/invitations.test.ts`
- Follow pattern from households.test.ts and children.test.ts

### Invitation-Specific Test Cases

**POST /api/invitations**
- Returns 401 when not authenticated
- Returns 403 when user is not household owner
- Returns 400 when email is missing
- Returns 400 when email is invalid format
- Returns 400 when household_id is missing
- Returns 400 when role is invalid
- Creates invitation successfully with valid data
- Generates unique token
- Sets expiration date (7 days default)
- Returns invitation with token

**GET /api/invitations/:token**
- Returns 404 when token doesn't exist
- Returns 410 when invitation is expired
- Returns 410 when invitation is already accepted
- Returns invitation details for valid token
- Includes household information
- Does not expose sensitive data (password_hash)

**POST /api/invitations/:token/accept**
- Returns 404 when token doesn't exist
- Returns 410 when invitation is expired
- Returns 410 when invitation is already accepted
- Returns 401 when not authenticated
- Returns 400 when accepting user's email doesn't match invitation
- Accepts invitation successfully
- Creates household_members entry
- Marks invitation as accepted
- Returns household membership

**POST /api/invitations/:token/decline**
- Returns 404 when token doesn't exist
- Returns 410 when invitation is expired
- Returns 410 when invitation is already declined
- Declines invitation successfully (no auth required)
- Marks invitation as declined
- Does not create household membership

## Affected Areas
- [x] Backend (Fastify/Node.js)
- [x] Testing
- [x] Database

## Implementation Plan

### Phase 1: Setup and POST /api/invitations Tests
1. Create `src/routes/invitations.test.ts`
2. Import test helpers and fixtures
3. Set up test database lifecycle
4. Test authentication (401)
5. Test authorization (403 for non-owners)
6. Test email validation (400)
7. Test successful invitation creation (201)
8. Verify token generation
9. Verify expiration date set

### Phase 2: GET /api/invitations/:token Tests
1. Test non-existent token (404)
2. Test expired invitation (410)
3. Test already accepted invitation (410)
4. Test valid invitation (200)
5. Verify response structure
6. Verify no sensitive data exposed

### Phase 3: POST /api/invitations/:token/accept Tests
1. Test non-existent token (404)
2. Test expired invitation (410)
3. Test already accepted invitation (410)
4. Test unauthenticated request (401)
5. Test email mismatch (400)
6. Test successful acceptance (200)
7. Verify household_members entry created
8. Verify invitation marked as accepted
9. Verify response includes household info

### Phase 4: POST /api/invitations/:token/decline Tests
1. Test non-existent token (404)
2. Test expired invitation (410)
3. Test already declined invitation (410)
4. Test successful decline (200)
5. Verify invitation marked as declined
6. Verify no household_members entry created

### Phase 5: Edge Cases and Error Handling
1. Test duplicate invitations (same email)
2. Test invitation to existing household member
3. Test concurrent acceptance attempts
4. Test token format validation
5. Test database transaction rollback on errors

## Progress Log
- [2025-12-15 16:30] Task created by Orchestrator Agent

## Testing Strategy
- Follow patterns from previous endpoint tests
- Use test fixtures for users, households, and invitations
- Test token generation and validation
- Test expiration handling thoroughly
- Verify database state after acceptance/decline

## Related PRs
[To be added during implementation]

## Lessons Learned
[To be filled after completion]
