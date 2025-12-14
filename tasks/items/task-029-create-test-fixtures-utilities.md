# Task: Create Test Fixtures and Utilities

## Metadata
- **ID**: task-029
- **Feature**: feature-006
- **Epic**: epic-006
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-14
- **Assigned Agent**: testing + frontend
- **Estimated Duration**: 4-6 hours

## Description
Create reusable test utilities, data factories, and helper functions for E2E tests. Implement page object base class and authentication helpers.

## Requirements
- Test data factories (users, households)
- Database reset utility
- Test email generator
- Authentication helpers
- Page object base class

## Acceptance Criteria
- [ ] `e2e/helpers/test-helpers.ts` created
- [ ] `resetTestDatabase()` function
- [ ] `createTestUser()` function
- [ ] `generateTestEmail()` function
- [ ] `e2e/helpers/auth-helpers.ts` created
- [ ] `loginAsUser()` helper
- [ ] Page object base class

## Dependencies
- task-028 (test database must be set up)

## Progress Log
- [2025-12-14] Task created