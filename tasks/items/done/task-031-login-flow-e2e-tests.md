# Task: Login Flow E2E Tests

## Metadata
- **ID**: task-031
- **Feature**: feature-006
- **Epic**: epic-006
- **Status**: completed
- **Priority**: high
- **Created**: 2025-12-14
- **Assigned Agent**: testing + frontend
- **Estimated Duration**: 4-6 hours

## Description
Implement E2E tests for user login flow including authentication, token storage, and session management.

## Requirements
- LoginPage page object
- Test successful login
- Test invalid credentials
- Test remember me functionality
- Test password visibility toggle
- Test return URL redirect

## Acceptance Criteria
- [x] `e2e/pages/login.page.ts` created (completed in task-029)
- [x] Test: successful login
- [x] Test: invalid credentials error
- [x] Test: remember me (localStorage)
- [x] Test: without remember me (sessionStorage)
- [x] Test: show/hide password
- [x] Test: return URL redirect
- [x] Test: JWT token stored correctly
- [x] Test: empty field validation
- [x] Test: navigation to registration
- [x] Test: special characters in email
- [x] Test: password case sensitivity
- [x] Test: rapid login attempts handling

## Dependencies
- task-029 (test utilities)
- task-030 (registration tests as reference)

## Progress Log
- [2025-12-14] Task created
- [2025-12-14 13:15] Status set to in-progress; branch feature/task-031-login-e2e-tests created
- [2025-12-14 13:20] Created comprehensive login.spec.ts with 16 test cases
- [2025-12-14 13:20] Tests cover: success, validation, token storage, session management, edge cases
- [2025-12-14 13:25] PR #47 opened; CI checks passed (frontend + backend SUCCESS)
- [2025-12-14 13:27] Merged PR #47 with squash; branch deleted; status completed