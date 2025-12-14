# Task: Google OAuth E2E Tests

## Metadata
- **ID**: task-033
- **Feature**: feature-006
- **Epic**: epic-006
- **Status**: pending
- **Priority**: medium (optional)
- **Created**: 2025-12-14
- **Assigned Agent**: testing + frontend
- **Estimated Duration**: 4-5 hours

## Description
Implement E2E tests for Google OAuth sign-in flow. Mock Google OAuth responses to test account creation and authentication.

## Requirements
- Mock Google OAuth flow
- Test OAuth creates new user
- Test OAuth logs in existing user
- Test JWT token from OAuth

## Acceptance Criteria
- [ ] Mock Google OAuth response
- [ ] Test: OAuth creates new user
- [ ] Test: OAuth logs in existing user
- [ ] Test: JWT token received
- [ ] Test: user linked by email

## Dependencies
- task-029 (test utilities)
- task-010 (Google OAuth implementation)

## Progress Log
- [2025-12-14] Task created