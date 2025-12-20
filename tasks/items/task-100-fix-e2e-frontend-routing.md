# Task-100: Fix E2E Frontend Registration Page Routing

**Status**: Not Started  
**Created**: 2025-12-20  
**Epic**: epic-006-testing-quality-assurance  
**Feature**: feature-006-e2e-testing-infrastructure  
**Priority**: P0 (Blocking CI)  
**Effort**: 2-3 hours  

## Problem Statement

All 13 task template management e2e tests fail with identical errors:
- **Error**: `locator.click: Test timeout of 30000ms exceeded`
- **Location**: `apps/frontend/e2e/helpers/auth-helpers.ts:36` (registerUser function)
- **Pattern**: Tests timeout waiting for register/sign up button to appear
- **Root Cause**: Frontend registration page not loading during e2e tests in CI

**Failed Tests**:
```
[chromium] › e2e/features/task-templates.spec.ts:59:7  › should display empty task list
[chromium] › e2e/features/task-templates.spec.ts:67:7  › should create a daily task
[chromium] › e2e/features/task-templates.spec.ts:95:7  › should create a repeating task
[chromium] › e2e/features/task-templates.spec.ts:129:7 › should create a weekly rotation
[chromium] › e2e/features/task-templates.spec.ts:166:7 › should validate required fields
[chromium] › e2e/features/task-templates.spec.ts:182:7 › should validate title length
[chromium] › e2e/features/task-templates.spec.ts:194:7 › should validate repeating task
[chromium] › e2e/features/task-templates.spec.ts:215:7 › should validate weekly rotation
[chromium] › e2e/features/task-templates.spec.ts:245:7 › should edit an existing task
[chromium] › e2e/features/task-templates.spec.ts:280:7 › should delete a task
[chromium] › e2e/features/task-templates.spec.ts:309:7 › should filter tasks by status
[chromium] › e2e/features/task-templates.spec.ts:344:7 › should sort tasks by title
[chromium] › e2e/features/task-templates.spec.ts:380:7 › should prevent other household members
```

**Success**: 42 auth and infrastructure tests pass (frontend loads for those)

## Investigation Findings

1. **GitHub Actions Workflow** (`.github/workflows/e2e.yml`):
   - Starts backend: `npm start` (port 3000)
   - Starts frontend: `npm start --proxy-config proxy.conf.json` (port 4200)
   - Health check: `curl -f http://localhost:4200` (basic connectivity only)
   - Issue: Health check doesn't verify routing works

2. **Frontend Start Script**:
   - `npm start` = `ng serve --proxy-config proxy.conf.json`
   - Uses Angular proxy config for `/api` requests to backend
   - Frontend port 4200, backend port 3000

3. **Registration Route**:
   - Path: `/register`
   - Lazy loaded: `import('./auth/register.component')`
   - Component exists: `apps/frontend/src/app/auth/register.component.ts`

4. **Test Helper**:
   ```typescript
   // apps/frontend/e2e/helpers/auth-helpers.ts:27-39
   export async function registerUser(page: Page, email: string, password: string) {
     await page.goto('/register');  // Navigate to registration
     await page.getByLabel(/email/i).fill(email);
     await page.getByLabel(/^password$/i).fill(password);
     await page.getByLabel(/confirm password/i).fill(password);
     await page.getByRole('button', { name: /register|sign up/i }).click(); // FAILS HERE
     await page.waitForURL((url) => !url.pathname.includes('/register'), { timeout: 5000 });
   }
   ```

5. **Possible Causes**:
   - Angular dev server not fully ready despite curl success
   - Lazy-loaded route not initializing
   - Playwright navigation timing issue
   - Missing wait for Angular to bootstrap
   - Base href or routing configuration problem in CI

## Acceptance Criteria

- [ ] All 13 task template management tests pass in CI
- [ ] Frontend registration page loads reliably in e2e tests
- [ ] Health check verifies routing works, not just server responds
- [ ] Tests can navigate to `/register` and interact with form
- [ ] No intermittent failures due to timing issues

## Technical Approach

### Phase 1: Improve Health Check (Workflow)
1. **Update `.github/workflows/e2e.yml`**:
   - Replace basic curl check with route verification:
   ```bash
   - name: Wait for frontend to be ready
     run: |
       for i in {1..30}; do
         # Check both root and a route page
         if curl -f http://localhost:4200 > /dev/null 2>&1 && \
            curl -f http://localhost:4200/register > /dev/null 2>&1; then
           echo "Frontend is ready and routing works"
           exit 0
         fi
         echo "Waiting for frontend routing... attempt $i/30"
         sleep 2
       done
       echo "Frontend routing failed to initialize"
       exit 1
   ```

### Phase 2: Improve Test Stability (Auth Helpers)
2. **Update `apps/frontend/e2e/helpers/auth-helpers.ts`**:
   - Add explicit waits before interaction:
   ```typescript
   export async function registerUser(page: Page, email: string, password: string) {
     // Navigate and wait for page to be fully loaded
     await page.goto('/register', { waitUntil: 'networkidle' });
     
     // Wait for form to be visible and interactive
     await page.waitForSelector('form', { state: 'visible', timeout: 10000 });
     
     // Fill in credentials
     await page.getByLabel(/email/i).fill(email);
     await page.getByLabel(/^password$/i).fill(password);
     await page.getByLabel(/confirm password/i).fill(password);
     
     // Wait for button to be enabled before clicking
     const submitButton = page.getByRole('button', { name: /register|sign up/i });
     await submitButton.waitFor({ state: 'visible', timeout: 10000 });
     await submitButton.click();
     
     // Wait for successful redirect
     await page.waitForURL((url) => !url.pathname.includes('/register'), { timeout: 5000 });
   }
   ```

### Phase 3: Add Frontend Health Endpoint (If Needed)
3. **Create health endpoint** (if curl checks insufficient):
   ```typescript
   // apps/frontend/src/app/app.component.ts or router
   // Add a simple /health route that returns 200 when app is ready
   ```

### Phase 4: Verify Local Reproduction
4. **Test locally with Docker Compose**:
   ```bash
   npm run test:e2e:start  # Start services
   npm run test:e2e        # Run tests
   npm run test:e2e:stop   # Cleanup
   ```

5. **Test with CI-like conditions**:
   ```bash
   # Start services manually like CI does
   cd apps/backend && npm start &
   cd apps/frontend && npm start &
   
   # Wait and run tests
   sleep 10
   cd apps/frontend && npm run test:e2e
   ```

## Testing Plan

### Unit Tests
- N/A (infrastructure fix)

### Integration Tests
1. **Verify health check improvements**:
   - Start services manually
   - Run improved health check script
   - Confirm it detects routing readiness

2. **Verify auth helper improvements**:
   - Run single failing test locally
   - Confirm explicit waits resolve timeout
   - Check other auth tests still pass (42 tests)

### E2E Tests
1. **Run full e2e suite in CI**:
   - Push changes to feature branch
   - Trigger e2e workflow
   - Confirm all 55 tests pass (42 + 13)

2. **Test stability**:
   - Run e2e workflow 3 times
   - Verify no intermittent failures
   - Check execution time (should remain ~20-25 minutes)

## Implementation Steps

1. Create feature branch: `git checkout -b fix/task-100-e2e-frontend-routing`
2. Implement Phase 1: Update workflow health check
3. Implement Phase 2: Improve auth helper waits
4. Test locally with manual service startup
5. Commit: `git commit -m "fix: improve e2e frontend routing reliability"`
6. Push and create PR: `gh pr create --base main`
7. Verify CI e2e tests pass
8. If still failing: Implement Phase 3 (health endpoint)
9. Merge when all 55 tests pass consistently

## Related Files

- `.github/workflows/e2e.yml` - CI workflow with health checks
- `apps/frontend/e2e/helpers/auth-helpers.ts` - Registration test helper
- `apps/frontend/e2e/features/task-templates.spec.ts` - Failing tests
- `apps/frontend/src/app/app.routes.ts` - Frontend routing config
- `apps/frontend/src/app/auth/register.component.ts` - Registration component
- `apps/frontend/playwright.config.ts` - Playwright configuration

## Dependencies

- **Blocks**: All task template management e2e tests
- **Blocked By**: None
- **Related**: task-088 (database initialization - fixed), task-090 (e2e bugs - in progress)

## Notes

- **Not related to task-094/095**: API changes didn't cause this (those are backend, these tests fail at registration)
- **Auth tests pass**: 42 auth tests succeed, so basic frontend serving works
- **Consistent failure**: All 13 tests fail identically (not flaky), suggests systematic issue
- **Database OK**: PostgreSQL logs show normal operation, unique constraint errors are from test resets (expected)
- **Timing issue**: Health check passes (curl succeeds) but routing not ready

## Success Metrics

- E2E test pass rate: 80% → 100% (42/55 → 55/55)
- CI workflow stability: 0 failures in 3 consecutive runs
- Test execution time: Remains under 25 minutes
- No new timeout errors in e2e tests

## Estimated Effort

- **Investigation**: 0.5 hours (completed)
- **Phase 1 Implementation**: 0.5 hours
- **Phase 2 Implementation**: 0.5 hours
- **Testing & Verification**: 1 hour
- **Phase 3 (if needed)**: 0.5 hours
- **Total**: 2-3 hours

## Definition of Done

- [ ] All 13 failing tests now pass in CI
- [ ] E2E workflow completes successfully
- [ ] Health check verifies routing is ready
- [ ] Auth helpers have explicit waits for stability
- [ ] Changes tested locally and in CI
- [ ] PR merged to main
- [ ] Documentation updated if health endpoint added
- [ ] Related tasks updated (task-090 marked complete if this fixes all issues)
