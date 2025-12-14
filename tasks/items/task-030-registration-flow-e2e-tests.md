# Task: Registration Flow E2E Tests

## Metadata
- **ID**: task-030
- **Feature**: feature-006
- **Epic**: epic-006
- **Status**: pending
- **Priority**: critical
- **Created**: 2025-12-14
- **Assigned Agent**: testing + frontend
- **Estimated Duration**: 6-8 hours

## Description
**CRITICAL**: Implement comprehensive E2E tests for user registration flow. This would have caught the production bug where the users table didn't exist.

## Requirements
- RegisterPage page object
- Test successful registration
- Test form validation errors
- Test database record creation
- Test JWT token storage
- Test post-registration redirect

## Acceptance Criteria
- [ ] `e2e/pages/register.page.ts` created
- [ ] Test: successful registration
- [ ] Test: weak password validation
- [ ] Test: duplicate email error
- [ ] Test: invalid email format
- [ ] Test: user record in database
- [ ] Test: JWT token stored
- [ ] Test: redirect to home/dashboard
- [ ] Test: password hashed in DB

## Dependencies
- task-029 (test utilities must exist)

## Progress Log
- [2025-12-14] Task created