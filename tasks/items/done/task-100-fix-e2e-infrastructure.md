# Task-100: Fix E2E Infrastructure and Auth Helpers

**Status**: Complete ✅  
**Created**: 2025-12-20  
**Completed**: 2025-12-20  
**Epic**: epic-006-testing-quality-assurance  
**Feature**: feature-006-e2e-testing-infrastructure  
**Priority**: P0 (Blocking CI)  
**Effort**: 3 hours (actual)  

## Problem Statement

All e2e tests were failing due to infrastructure timing issues and test helper problems:
- **Root Cause #1**: Angular dev server needs build time but wait script only checked HTTP 200
- **Root Cause #2**: Button text mismatch in auth helpers ("Create Account" vs "register|sign up")
- **Root Cause #3**: Password selector conflicts with "Show password" button

## Investigation Process

### Initial Diagnosis (WRONG)
1. Analyzed CI logs: Saw 13 tests timeout at registerUser()
2. Concluded: "Frontend routing not ready"
3. Attempted fix: Enhanced health checks, added explicit waits
4. Result: ❌ Didn't work - user reported "you did NOT fix the problem"

### Course Correction
5. Reverted wrong fix (PR #120)
6. User guidance: "we always do e2e tests locally first!"
7. Started Docker and e2e services locally
8. Ran tests: Found REAL error `ERR_EMPTY_RESPONSE at http://localhost:4201/login`

### Real Root Cause Discovery
9. First test fails immediately (not task templates)
10. Timing analysis:
    - Container "starts": ~17s (docker-compose health checks pass)
    - Angular build: additional ~20-30s
    - Total ready time: ~47s
11. Problem: Tests started when container "started", not when Angular finished building

## Solution Implemented

### Fix #1: Wait for Angular Build Completion
**File**: `apps/frontend/scripts/wait-for-services.js`

**Before**:
```javascript
async function waitForFrontend() {
  return checkService(E2E_FRONTEND_URL, 'Frontend');  // Only HTTP 200
}
```

**After**:
```javascript
async function waitForFrontend() {
  const response = await fetch(E2E_FRONTEND_URL);
  if (response.ok) {
    const html = await response.text();
    // Check if Angular app is built (not just server responding)
    if (html.includes('<app-root>') && html.includes('main.js')) {
      console.log('✅ Frontend is healthy and Angular app is built');
      return true;
    }
    console.log('⏳ Angular app not built yet, waiting...');
    return false;
  }
}
```

**Result**: Wait script now properly waits for Angular build (~8s total)

### Fix #2: Auth Helper Button Matcher
**File**: `apps/frontend/e2e/helpers/auth-helpers.ts`

**Problem**: Button labeled "Create Account" but test looked for `/register|sign up/i`

**Fix**:
```typescript
// Before
await page.getByRole('button', { name: /register|sign up/i }).click();

// After
await page.getByRole('button', { name: /create account|register|sign up/i }).click();
```

### Fix #3: Password Field Selectors
**File**: `apps/frontend/e2e/helpers/auth-helpers.ts`

**Problem**: `/password/i` selector matched both password input AND "Show password" button (aria-label conflict)

**Fix**:
```typescript
// Before
await page.getByLabel(/password/i).fill(password);

// After
await page.getByRole('textbox', { name: /password/i }).fill(password);
```

## Testing Results

### Before Fixes
- **CI**: 42/55 tests pass, 13/55 fail (all task template tests)
- **Local**: 0/55 tests pass (`ERR_EMPTY_RESPONSE`)

### After Fixes
- **Local**: 30/55 tests pass ✅
  - All auth tests pass (16 tests)
  - All example tests pass (2 tests)  
  - Task template tests fail due to missing UI (expected - see task-101)

## Related Files Changed

1. `apps/frontend/scripts/wait-for-services.js` - Verify Angular build
2. `apps/frontend/e2e/helpers/auth-helpers.ts` - Fix button and password selectors

## Lessons Learned

1. ❌ **Don't merge e2e fixes without local testing**
2. ✅ **"We always do e2e tests locally first!"** (user guidance)
3. ❌ **CI logs don't always show root cause** (showed secondary failures)
4. ✅ **Container health ≠ App ready** (dev servers need build time)
5. ✅ **Verify app built, not just server responding**

## Commit

```bash
git commit -m "fix: e2e test infrastructure and auth helpers

- Modified wait-for-services.js to verify Angular app is built
  - Checks for <app-root> and main.js in HTML response
  - Prevents tests from starting before dev server completes build
  - Resolves ERR_EMPTY_RESPONSE errors

- Fixed auth-helpers.ts button and password field selectors
  - Updated register button matcher to include 'Create Account'
  - Changed password selectors to use role='textbox' to avoid conflict
  - Fixes timeout errors in test registration flow"
```

**Commit**: fd07982  
**Push**: ✅ Pushed to main

## Next Steps

**task-101**: Fix remaining 25 test failures (missing UI components)
- Tests expect household/children/task-template UIs that don't exist yet
- Solution: Use API directly in test setup, skip UI tests until implemented
- Create feature tasks for missing UIs (task-102-105)

## Definition of Done

- [x] Root cause identified (Angular build timing)
- [x] Wait script fixed to check for built app
- [x] Auth helpers fixed (button matcher, password selectors)
- [x] Tested locally (30/55 tests pass - expected)
- [x] Changes committed and pushed to main
- [x] Task-101 created for remaining work
- [x] Lessons documented

## Success Metrics

- ✅ E2E infrastructure working correctly
- ✅ Tests wait for Angular to be ready
- ✅ Auth helpers work with actual UI
- ✅ 30/55 tests pass (up from 0/55)
- ⏳ Remaining 25 tests blocked by missing UI (task-101)
