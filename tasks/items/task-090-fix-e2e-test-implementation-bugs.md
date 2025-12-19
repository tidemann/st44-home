# Task: Fix Remaining E2E Test Implementation Bugs

## Metadata
- **ID**: task-090
- **Feature**: feature-006 - E2E Testing Infrastructure
- **Epic**: epic-006 - Testing & Quality Assurance
- **Status**: in-progress
- **Priority**: high
- **Created**: 2025-12-19
- **Assigned Agent**: testing | orchestrator
- **Estimated Duration**: 4-6 hours
- **Progress**: 26/42 tests passing (62%), down from 19 failures to 16 failures

## Description
Fix the remaining 19 failing E2E tests (45% failure rate) that are caused by test implementation bugs, not infrastructure issues. The local E2E testing environment is now fully functional with Docker Compose, and all infrastructure problems (ports, environment variables, database connections) have been resolved. The tests are running consistently, but the test code itself has bugs that need to be fixed to match the actual application behavior.

Current status: 23 passing (55%), 19 failing (45%)

The failing tests fall into four categories:
1. **localStorage vs sessionStorage mismatches** (5 tests) - Tests checking wrong storage location based on rememberMe setting
2. **Form validation tests** (8 tests) - Tests trying to interact with correctly-disabled buttons
3. **Registration auto-login expectations** (3 tests) - Tests expecting tokens after registration when app correctly doesn't auto-login
4. **Miscellaneous test bugs** (3 tests) - Timing issues, wrong URL expectations, incorrect assertions

## Requirements
- **Requirement 1**: Fix all localStorage/sessionStorage assertions to match actual token storage behavior
- **Requirement 2**: Update form validation tests to verify disabled state instead of attempting to click disabled buttons
- **Requirement 3**: Fix registration flow tests to match actual behavior (redirect to login, no auto-login)
- **Requirement 4**: Fix miscellaneous test bugs including timing issues and incorrect assertions
- **Requirement 5**: Maintain test quality and coverage while fixing bugs
- **Requirement 6**: Ensure tests are resilient and accurately reflect application behavior

## Acceptance Criteria
- [ ] All 5 localStorage/sessionStorage tests pass with correct storage location checks
  - login.spec.ts lines 162, 233, 182, 276 fixed
  - Tests either add rememberMe=true parameter or check sessionStorage when rememberMe=false
- [ ] All 8 form validation tests pass by verifying disabled state
  - login.spec.ts lines 197, 211, 225 fixed to verify button disabled state
  - registration.spec.ts lines 78, 116, 148, 233 fixed to verify button disabled state
- [ ] All 3 registration auto-login tests pass with corrected expectations
  - registration.spec.ts lines 165, 200 fixed to remove token assertions or update app behavior
  - registration.spec.ts line 185 fixed to correctly expect /login redirect
- [ ] All 3 miscellaneous test bugs fixed
  - login.spec.ts line 120 (password visibility toggle timing) fixed
  - login.spec.ts line 146 (return URL format) fixed
  - registration.spec.ts line 97 (duplicate email error message) fixed
- [ ] Full test suite passes: 42/42 tests (100%)
- [ ] No false positives - tests accurately verify application behavior
- [ ] Tests run consistently without flakiness
- [ ] Test code follows Playwright best practices
- [ ] Code formatted with prettier before commit

## Dependencies
- ✅ task-088 - E2E test database initialization (completed - infrastructure is working)
- Local E2E environment with Docker Compose (fully functional)
- Test database seeds properly loaded
- Backend and frontend services running correctly

## Technical Notes

### localStorage vs sessionStorage (5 tests)
**Root Cause**: Tests check `localStorage` for tokens when `rememberMe=false`, but tokens are correctly stored in `sessionStorage` in this case.

**Locations**:
- [login.spec.ts](apps/frontend/e2e/auth/login.spec.ts#L162) - Login with email (rememberMe false)
- [login.spec.ts](apps/frontend/e2e/auth/login.spec.ts#L233) - Login with username (rememberMe false)
- [login.spec.ts](apps/frontend/e2e/auth/login.spec.ts#L182) - Remember me checkbox unchecked
- [login.spec.ts](apps/frontend/e2e/auth/login.spec.ts#L276) - Another rememberMe false case

**Fix Options**:
1. Add `rememberMe: true` to login form data in tests
2. Update test assertions to check `sessionStorage` when `rememberMe=false`
3. Update Page Object Model to handle both storage types based on rememberMe setting

**Recommended**: Use option 3 for most flexible, maintainable solution.

### Form Validation Tests (8 tests)
**Root Cause**: Tests attempt to click submit buttons that are correctly disabled when form is invalid. Playwright fails because it cannot click disabled elements.

**Locations**:
- [login.spec.ts](apps/frontend/e2e/auth/login.spec.ts#L197) - Empty email validation
- [login.spec.ts](apps/frontend/e2e/auth/login.spec.ts#L211) - Empty password validation
- [login.spec.ts](apps/frontend/e2e/auth/login.spec.ts#L225) - Both fields empty validation
- [registration.spec.ts](apps/frontend/e2e/auth/registration.spec.ts#L78) - Empty firstname validation
- [registration.spec.ts](apps/frontend/e2e/auth/registration.spec.ts#L116) - Empty lastname validation
- [registration.spec.ts](apps/frontend/e2e/auth/registration.spec.ts#L148) - Empty email validation
- [registration.spec.ts](apps/frontend/e2e/auth/registration.spec.ts#L233) - Passwords don't match validation

**Fix**: Change tests from attempting button click to verifying button is disabled:
```typescript
// Before:
await page.click('button[type="submit"]'); // Fails - button is disabled
await expect(page.locator('.error-message')).toBeVisible();

// After:
await expect(page.locator('button[type="submit"]')).toBeDisabled();
await expect(page.locator('.error-message')).toBeVisible();
```

### Registration Auto-Login Tests (3 tests)
**Root Cause**: Tests expect authentication tokens in storage after registration, but application correctly redirects to `/login` without auto-login (security best practice).

**Locations**:
- [registration.spec.ts](apps/frontend/e2e/auth/registration.spec.ts#L165) - Expects tokens after successful registration
- [registration.spec.ts](apps/frontend/e2e/auth/registration.spec.ts#L200) - Another token expectation after registration
- [registration.spec.ts](apps/frontend/e2e/auth/registration.spec.ts#L185) - Expects NOT to be on /login (but should be)

**Fix Options**:
1. Remove token assertions and verify redirect to `/login` instead
2. Update application to auto-login after registration (not recommended for security)

**Recommended**: Option 1 - Update tests to match current secure behavior.

### Miscellaneous Test Bugs (3 tests)
1. **login.spec.ts line 120**: Password visibility toggle test has timing issue
   - **Issue**: Test clicks toggle too quickly before state updates
   - **Fix**: Add `await page.waitForTimeout()` or wait for input type change
   
2. **login.spec.ts line 146**: Return URL redirect test expects wrong URL format
   - **Issue**: Test expects encoded URL format, app uses different format
   - **Fix**: Update URL expectation to match actual redirect behavior
   
3. **registration.spec.ts line 97**: Duplicate email test showing success instead of error
   - **Issue**: Test sees success message when it should see error
   - **Fix**: Investigate backend response and frontend error handling, ensure proper error display

## Affected Areas
- [x] Frontend (Angular) - E2E test files only, no app code changes needed
- [ ] Backend (Fastify/Node.js) - Only if registration.spec.ts line 97 requires backend fix
- [ ] Database (PostgreSQL)
- [ ] Infrastructure (Docker/Nginx)
- [ ] CI/CD
- [x] Documentation - Update E2E test documentation with learnings

## Implementation Plan
[To be filled by Orchestrator Agent]

### Research Phase
- [ ] Review all 19 failing tests in detail
- [ ] Verify application behavior is correct for each case
- [ ] Identify root cause for registration.spec.ts line 97 (duplicate email error)
- [ ] Review Playwright best practices for disabled element testing
- [ ] Review token storage implementation in app code

### Implementation Steps
1. **Fix localStorage/sessionStorage tests** (5 tests)
   - Update Page Object Model to support both storage types
   - Add helper method to check tokens in correct storage based on rememberMe
   - Update affected test assertions to use new helper
   
2. **Fix form validation tests** (8 tests)
   - Replace button click attempts with disabled state verification
   - Ensure error messages still properly verified
   - Update test descriptions to reflect actual test behavior
   
3. **Fix registration auto-login tests** (3 tests)
   - Remove token storage assertions after registration
   - Update to verify redirect to /login page
   - Add separate login flow if test needs authenticated state
   
4. **Fix miscellaneous bugs** (3 tests)
   - Add proper wait for password toggle state change
   - Update return URL expectation to match actual format
   - Debug and fix duplicate email error handling (may require backend investigation)

### Testing Strategy
- Run full test suite after each category of fixes
- Verify 100% pass rate (42/42 tests)
- Run tests multiple times to ensure no flakiness
- Verify tests on both Windows and Docker environments
- Document any timing-sensitive tests that need special handling

## Agent Assignments
[To be filled by Orchestrator Agent]

## Progress Log
- [2025-12-19 17:00] Task created by Planner Agent
- [2025-12-19 17:00] Local E2E environment fully functional, ready for test fixes
- [2025-12-19 17:00] 23/42 tests passing (55%), 19 tests need fixes (45%)

## Testing Results
[To be filled during testing phase]

**Pre-Fix Baseline**:
- Total tests: 42
- Passing: 23 (55%)
- Failing: 19 (45%)
- Infrastructure: ✅ Working correctly
- Test implementation: ❌ Needs fixes

**Target**:
- Total tests: 42
- Passing: 42 (100%)
- Failing: 0 (0%)
- No flakiness or false positives

## Review Notes
[To be filled during review phase]

## Related PRs
- TBD - Will be created after implementation

## Lessons Learned
[To be filled after completion]

**Known Learnings from Infrastructure Work**:
1. E2E tests must accurately reflect actual application behavior
2. Tests should verify correct application behavior, not expected (incorrect) behavior
3. Disabled buttons should be verified as disabled, not clicked
4. Token storage location depends on rememberMe setting
5. Security best practices (no auto-login) should be respected in tests
6. Test failures can reveal both bugs AND incorrect test assumptions
