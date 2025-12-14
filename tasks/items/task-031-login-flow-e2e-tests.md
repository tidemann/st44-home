# Task: Login Flow E2E Tests

## Metadata
- **ID**: task-031
- **Feature**: feature-006
- **Epic**: epic-006
- **Status**: pending
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
- [ ] `e2e/pages/login.page.ts` created
- [ ] Test: successful login
- [ ] Test: invalid credentials error
- [ ] Test: remember me (localStorage)
- [ ] Test: without remember me (sessionStorage)
- [ ] Test: show/hide password
- [ ] Test: return URL redirect
- [ ] Test: JWT token stored correctly

## Dependencies
- task-029 (test utilities)
- task-030 (registration tests as reference)

## Progress Log
- [2025-12-14] Task created