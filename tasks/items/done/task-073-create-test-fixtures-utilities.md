# Task: Create Test Fixtures and Utilities

## Metadata
- **ID**: task-029
- **Feature**: feature-006
- **Epic**: epic-006
- **Status**: completed
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
- [x] `e2e/helpers/test-helpers.ts` created
- [x] `resetTestDatabase()` function
- [x] `createTestUser()` function
- [x] `generateTestEmail()` function
- [x] `e2e/helpers/auth-helpers.ts` created
- [x] `loginAsUser()` helper
- [x] Page object base class (base.page.ts)
- [x] Register page object (register.page.ts)
- [x] Login page object (login.page.ts)
- [x] `pg` package installed for database operations

## Dependencies
- task-028 (test database must be set up)

## Implementation Plan

### Files Created
1. **e2e/helpers/test-helpers.ts** - Core test utilities
   - `resetTestDatabase()` - Truncates all tables for clean test state
   - `createTestUser()` - Creates user via API
   - `generateTestEmail()` - Unique email generator
   - `generateTestPassword()` - Secure password generator
   - `waitFor()` - Async condition waiter

2. **e2e/helpers/auth-helpers.ts** - Authentication helpers
   - `loginAsUser()` - Login via UI form
   - `registerUser()` - Register via UI form
   - `logout()` - Clear tokens and logout
   - `isAuthenticated()` - Check auth status
   - `getAccessToken()` - Get token from storage

3. **e2e/pages/base.page.ts** - Page object base class
   - Navigation helpers
   - Wait utilities
   - Screenshot capture
   - Common page operations

4. **e2e/pages/register.page.ts** - Registration page object
   - Input locators (email, password, confirmPassword)
   - `register()` method
   - Error message handling

5. **e2e/pages/login.page.ts** - Login page object
   - Input locators (email, password, rememberMe)
   - `login()` method
   - Error message handling

### Dependencies Added
- `pg` - PostgreSQL client for database operations

## Progress Log
- [2025-12-14] Task created
- [2025-12-14 12:40] Status set to in-progress; branch feature/task-029-test-fixtures-utilities created
- [2025-12-14 12:45] Created test-helpers.ts with DB and data utilities
- [2025-12-14 12:46] Created auth-helpers.ts with login/register helpers
- [2025-12-14 12:47] Created base.page.ts, register.page.ts, login.page.ts
- [2025-12-14 12:48] Installed pg package for database operations
- [2025-12-14 12:50] PR #45 opened; CI checks passed (frontend + backend)
- [2025-12-14 12:52] Merged PR #45 with squash; branch deleted; status completed