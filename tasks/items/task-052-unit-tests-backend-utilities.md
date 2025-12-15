# Task: Unit Tests for Backend Utilities and Services

## Metadata
- **ID**: task-052
- **Feature**: feature-011 - Backend Testing Infrastructure
- **Epic**: epic-006 - Testing & Quality Assurance Infrastructure
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-15
- **Assigned Agent**: backend + testing
- **Estimated Duration**: 6-8 hours

## Description
Create comprehensive unit tests for backend utility functions and services including password validation, JWT generation/verification, authorization logic, and error handling utilities. These tests ensure core business logic works correctly in isolation from the database and HTTP layer.

## Requirements
- Unit tests for password validation (strength, special chars, length)
- Unit tests for JWT generation, verification, and refresh token logic
- Unit tests for authorization helper functions
- Unit tests for input validation utilities
- Unit tests for error formatting and handling utilities
- All edge cases covered (null, undefined, invalid inputs)
- Mocked external dependencies (bcrypt, JWT library)

## Acceptance Criteria
- [ ] Password validation tests cover all validation rules
- [ ] JWT tests cover generation, verification, expiration, refresh
- [ ] Authorization tests cover permission checks and role validation
- [ ] Input validation tests cover all validation functions
- [ ] Error handling tests cover all error types
- [ ] All tests use mocked dependencies (no real bcrypt/JWT calls)
- [ ] 100% code coverage for utility functions
- [ ] All tests pass in < 5 seconds
- [ ] Tests are independent and can run in any order

## Dependencies
- task-051: Test infrastructure must be set up first

## Technical Notes

### Test Files to Create
- `src/utils/password.test.ts` - Password validation unit tests
- `src/utils/jwt.test.ts` - JWT generation/verification tests
- `src/utils/authorization.test.ts` - Authorization logic tests
- `src/utils/validation.test.ts` - Input validation tests
- `src/utils/errors.test.ts` - Error handling tests

### Password Validation Tests
Test cases:
- Password length validation (min 8 chars)
- Special character requirement
- Uppercase letter requirement
- Lowercase letter requirement
- Number requirement
- Password hashing with bcrypt (mocked)
- Password comparison with bcrypt (mocked)

### JWT Tests
Test cases:
- Generate valid JWT with user payload
- Verify valid JWT returns user data
- Reject expired JWT
- Reject invalid signature
- Reject malformed JWT
- Generate refresh token
- Verify refresh token
- Refresh token rotation

### Authorization Tests
Test cases:
- User has permission for action
- User lacks permission for action
- Admin role has all permissions
- Parent role has household permissions
- Child role has limited permissions
- Check household membership
- Check household ownership

## Affected Areas
- [x] Backend (Fastify/Node.js)
- [x] Testing
- [ ] CI/CD (task-057)

## Implementation Plan

### Phase 1: Password Validation Tests
1. Create `src/utils/password.test.ts`
2. Test password strength validation
3. Test password hashing (mock bcrypt)
4. Test password comparison (mock bcrypt)
5. Test edge cases (null, empty, very long)

### Phase 2: JWT Tests
1. Create `src/utils/jwt.test.ts`
2. Test JWT generation with user payload
3. Test JWT verification success case
4. Test JWT expiration handling
5. Test invalid signature rejection
6. Test refresh token generation
7. Test refresh token validation

### Phase 3: Authorization Tests
1. Create `src/utils/authorization.test.ts`
2. Test permission checking logic
3. Test role-based access control
4. Test household membership validation
5. Test household ownership checking

### Phase 4: Validation Tests
1. Create `src/utils/validation.test.ts`
2. Test email validation
3. Test phone number validation
4. Test required field validation
5. Test enum value validation
6. Test date validation

### Phase 5: Error Handling Tests
1. Create `src/utils/errors.test.ts`
2. Test error formatting
3. Test error status code mapping
4. Test error message sanitization
5. Test stack trace handling

## Progress Log
- [2025-12-15 16:30] Task created by Orchestrator Agent

## Testing Strategy
- Each utility function has dedicated test suite
- Mock external dependencies (bcrypt, JWT library)
- Test happy path and error cases
- Verify error messages are user-friendly
- Ensure no side effects between tests

## Related PRs
[To be added during implementation]

## Lessons Learned
[To be filled after completion]
