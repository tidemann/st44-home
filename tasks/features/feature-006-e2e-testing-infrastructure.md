# Feature: E2E Testing Infrastructure

## Metadata
- **ID**: feature-006
- **Epic**: epic-006 - Testing & Quality Assurance Infrastructure
- **Status**: partially-complete (8/9 tasks complete - OAuth E2E tests deferred)
- **Priority**: critical
- **Created**: 2025-12-14
- **Completed**: 2025-12-19 (8/9 tasks)
- **Estimated Duration**: 5-6 days

## Description
Implement comprehensive end-to-end testing infrastructure using Playwright to test critical user journeys from browser to database. This feature ensures that core functionality like user registration, authentication, and multi-tenant operations work correctly in a production-like environment before deployment.

**Critical Focus**: Registration flow must NEVER fail in production again. E2E tests will catch database schema issues, API failures, and integration problems before code reaches production.

## User Stories

- **As a developer**, **I want automated E2E tests**, **so that I can verify my changes work end-to-end before merging**
- **As a DevOps engineer**, **I want tests to run in CI**, **so that broken code cannot be deployed to production**
- **As a product owner**, **I want critical user flows tested**, **so that users have a reliable experience**
- **As a QA engineer**, **I want test results to be actionable**, **so that I can quickly identify and fix failures**
- **As a developer**, **I want tests to run locally**, **so that I can debug issues before pushing**

## Requirements

### Functional Requirements

#### Test Infrastructure
- **Playwright setup**: Install and configure Playwright for Angular application
- **Test database**: Isolated PostgreSQL database for E2E tests with migrations
- **Test fixtures**: Reusable test data (users, households, tasks)
- **Page objects**: Maintainable page object pattern for UI interactions
- **Test utilities**: Shared helpers for authentication, navigation, assertions

#### Critical User Flows to Test

**Priority 1 (Must Have - These Prevented Production Bug)**:
1. **User Registration Flow**
   - Navigate to registration page
   - Fill valid registration form
   - Submit and verify account created
   - Verify user record in database
   - Verify JWT token received
   - Verify redirect to dashboard/home
   - Test validation (weak password, duplicate email, invalid email)
   
2. **User Login Flow**
   - Navigate to login page
   - Enter valid credentials
   - Submit and verify authentication
   - Verify JWT token stored
   - Verify redirect to intended page
   - Test "remember me" functionality
   - Test invalid credentials handling

3. **Database Schema Validation**
   - Verify all critical tables exist (users, households, etc.)
   - Verify migrations applied successfully
   - Test health check endpoints return expected structure
   - Validate schema version matches codebase

4. **Google OAuth Flow** (if feature-001 task-010 merged)
   - Click "Sign in with Google"
   - Mock Google OAuth response
   - Verify account creation or login
   - Verify JWT token received

**Priority 2 (Should Have - MVP Features)**:
5. **Household Creation & Management**
   - Create new household
   - Verify household record created
   - Verify user is admin of household
   
6. **User Invitation Flow**
   - Invite user to household
   - Accept invitation
   - Verify household_members record

7. **Token Refresh Flow**
   - Login with valid credentials
   - Wait for token near expiration
   - Make authenticated request
   - Verify token auto-refreshed

### Non-Functional Requirements

**Performance**:
- E2E test suite completes in < 5 minutes
- Individual test runs in < 30 seconds
- Parallel test execution supported
- Browser instances reused when possible

**Reliability**:
- < 1% test flakiness rate
- Automatic retry on network failures (max 2 retries)
- Tests are deterministic (no random test data)
- Tests clean up after themselves

**Maintainability**:
- Page object pattern for UI interactions
- Shared test utilities reduce duplication
- Clear test naming convention
- Comprehensive error messages on failure

**Compatibility**:
- Works on Windows, macOS, Linux
- Runs in CI (GitHub Actions)
- Runs locally in headless and headed mode
- Tests Chrome and Firefox (minimum)

**Security**:
- Test credentials not hardcoded (use env vars)
- Test database isolated from production
- Sensitive data masked in test reports

## Acceptance Criteria

### Infrastructure Setup
- [ ] Playwright installed and configured in `apps/frontend`
- [ ] Test database Docker container configured for E2E tests
- [ ] Database migrations run automatically before tests
- [ ] Test fixtures created for common scenarios (users, households)
- [ ] Page object classes created for auth flows
- [ ] Test utilities created (login helper, database reset, etc.)
- [ ] Local test run command works: `npm run test:e2e`
- [ ] Headless and headed modes both work

### Registration Flow Tests
- [ ] Test: Successful registration with valid data
- [ ] Test: Registration form validation (weak password)
- [ ] Test: Registration form validation (duplicate email)
- [ ] Test: Registration form validation (invalid email format)
- [ ] Test: User record created in database
- [ ] Test: JWT token returned and stored
- [ ] Test: User redirected to appropriate page after registration
- [ ] Test: Password is hashed (not plaintext in DB)

### Login Flow Tests
- [ ] Test: Successful login with valid credentials
- [ ] Test: Login failure with invalid credentials
- [ ] Test: "Remember me" stores token in localStorage
- [ ] Test: Without "remember me" stores token in sessionStorage
- [ ] Test: Show/hide password toggle works
- [ ] Test: Return URL redirects to intended page after login
- [ ] Test: JWT token stored correctly

### Database Validation Tests
- [ ] Test: All critical tables exist (users, schema_migrations)
- [ ] Test: Health check endpoint returns 200
- [ ] Test: Database health check shows "healthy" status
- [ ] Test: Migrations list matches expected migrations
- [ ] Test: Schema validation catches missing tables

### Google OAuth Tests (if implemented)
- [ ] Test: "Sign in with Google" button works
- [ ] Test: Mock OAuth flow creates new user
- [ ] Test: Mock OAuth flow logs in existing user
- [ ] Test: JWT token returned from OAuth flow

### CI/CD Integration
- [ ] Tests run in GitHub Actions workflow
- [ ] Test failures block PR merge
- [ ] Test results visible in PR checks
- [ ] Test artifacts (screenshots, videos) uploaded on failure
- [ ] CI completes E2E tests in < 5 minutes

### Quality & Reliability
- [ ] All tests pass consistently (100% pass rate over 10 runs)
- [ ] Test flakiness < 1%
- [ ] Test failures provide actionable error messages
- [ ] Tests clean up database state between runs
- [ ] Tests can run in parallel without conflicts

### Documentation
- [ ] E2E testing guide created (`docs/E2E_TESTING.md`)
- [ ] README updated with test instructions
- [ ] Troubleshooting guide for common test failures
- [ ] Page object pattern documented
- [ ] CI/CD integration documented

## Tasks

- [x] [task-027](../items/done/task-027-install-configure-playwright.md): Install and configure Playwright (4-6 hours) **COMPLETED** [PR #41]
- [x] [task-028](../items/done/task-028-setup-test-database.md): Set up test database and migration runner (4-6 hours) **COMPLETED** [PR #43]
- [x] [task-029](../items/done/task-029-create-test-fixtures-utilities.md): Create test fixtures and utilities (4-6 hours) **COMPLETED** [PR #45]
- [x] [task-030](../items/done/task-030-registration-flow-e2e-tests.md): Registration flow E2E tests ⚠️ **CRITICAL** (6-8 hours) **COMPLETED** [PR #46]
- [x] [task-031](../items/done/task-031-login-flow-e2e-tests.md): Login flow E2E tests (4-6 hours) **COMPLETED** [PR #47]
- [x] [task-032](../items/done/task-032-database-validation-tests.md): Database validation E2E tests (3-4 hours) **COMPLETED** [PR #48]
- [ ] [task-033](../items/task-033-google-oauth-e2e-tests.md): Google OAuth E2E tests (optional) (4-5 hours) **DEFERRED** (optional for MVP)
- [x] [task-034](../items/done/task-034-integrate-e2e-tests-ci-cd.md): Integrate E2E tests into CI/CD ⚠️ **CRITICAL** (4-6 hours) **COMPLETED** [PR #70]
- [x] [task-035](../items/done/task-035-e2e-testing-documentation.md): E2E testing documentation (2-3 hours) **COMPLETED**

**Total Estimated Time**: 35-46 hours (5-6 days)  
**Actual Time**: ~30 hours (4 days)  
**Progress**: 8/9 tasks complete (89%) - 1 optional task deferred  
**Critical Path**: task-027 → task-028 → task-029 → task-030 → task-034 ✅ **COMPLETE**

## Dependencies

**Blocking This Feature**:
- **feature-005**: Production database deployment (must be merged first)
- **feature-001**: User authentication (must be implemented and working)

**This Feature Blocks**:
- None (testing runs in parallel with feature development)

**Nice to Have**:
- Google OAuth implementation (task-010) for OAuth E2E tests
- Multi-tenant schema (feature-002) for household tests

## Technical Notes

### Playwright Configuration

**File**: `apps/frontend/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Test Database Setup

**Docker Compose**: `apps/frontend/docker-compose.e2e.yml`

```yaml
services:
  test-db:
    image: postgres:17
    environment:
      POSTGRES_DB: st44_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: testpassword
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
```

**Before Tests**: Run migrations against test DB
```bash
DB_HOST=localhost DB_PORT=5433 DB_NAME=st44_test DB_PASSWORD=testpassword ./docker/postgres/run-migrations.sh
```

### Page Object Pattern

**File**: `apps/frontend/e2e/pages/register.page.ts`

```typescript
import { Page, Locator } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password', { exact: true });
    this.confirmPasswordInput = page.getByLabel('Confirm Password');
    this.submitButton = page.getByRole('button', { name: 'Create Account' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/auth/register');
  }

  async register(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.submitButton.click();
  }
}
```

### Test Utilities

**File**: `apps/frontend/e2e/helpers/test-helpers.ts`

```typescript
import { Pool } from 'pg';

export async function resetTestDatabase() {
  const pool = new Pool({
    host: 'localhost',
    port: 5433,
    database: 'st44_test',
    user: 'postgres',
    password: 'testpassword',
  });

  await pool.query('TRUNCATE users, households, household_members CASCADE');
  await pool.end();
}

export async function createTestUser(email: string, password: string) {
  const response = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
}

export function generateTestEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}
```

### Example E2E Test

**File**: `apps/frontend/e2e/auth/registration.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { RegisterPage } from '../pages/register.page';
import { resetTestDatabase, generateTestEmail } from '../helpers/test-helpers';

test.describe('User Registration', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    await resetTestDatabase();
    registerPage = new RegisterPage(page);
    await registerPage.goto();
  });

  test('should register new user with valid credentials', async ({ page }) => {
    const email = generateTestEmail();
    const password = 'SecurePass123!';

    await registerPage.register(email, password);

    // Verify redirected to home/dashboard
    await expect(page).toHaveURL(/\/(home|dashboard)/);
    
    // Verify JWT token stored
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();
    
    // Verify user created in database
    const response = await fetch('http://localhost:3000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const user = await response.json();
    expect(user.email).toBe(email);
  });

  test('should show error for weak password', async () => {
    const email = generateTestEmail();
    const password = 'weak';

    await registerPage.emailInput.fill(email);
    await registerPage.passwordInput.fill(password);
    await registerPage.confirmPasswordInput.fill(password);

    // Should show validation error without submitting
    await expect(registerPage.page.getByText(/password must be at least 8 characters/i)).toBeVisible();
  });

  test('should show error for duplicate email', async () => {
    const email = generateTestEmail();
    const password = 'SecurePass123!';

    // Register first user
    await registerPage.register(email, password);
    
    // Try to register again with same email
    await registerPage.goto();
    await registerPage.register(email, password);

    // Should show error
    await expect(registerPage.errorMessage).toContainText(/email already exists/i);
  });
});
```

### CI/CD Integration

**File**: `.github/workflows/e2e-tests.yml` (new) or add to existing `deploy.yml`

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    services:
      test-db:
        image: postgres:17
        env:
          POSTGRES_DB: st44_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: testpassword
        ports:
          - 5433:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci
          cd apps/frontend && npm ci
          cd ../backend && npm ci
      
      - name: Run database migrations
        env:
          DB_HOST: localhost
          DB_PORT: 5433
          DB_NAME: st44_test
          DB_USER: postgres
          DB_PASSWORD: testpassword
        run: ./docker/postgres/run-migrations.sh
      
      - name: Start backend server
        run: |
          cd apps/backend
          npm start &
          npx wait-on http://localhost:3000/health
        env:
          DB_HOST: localhost
          DB_PORT: 5433
          DB_NAME: st44_test
          DB_USER: postgres
          DB_PASSWORD: testpassword
      
      - name: Install Playwright browsers
        run: cd apps/frontend && npx playwright install --with-deps chromium firefox
      
      - name: Run E2E tests
        run: cd apps/frontend && npm run test:e2e
      
      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: apps/frontend/playwright-report/
          retention-days: 7
```

## UI/UX Considerations

**Test Stability**:
- Use accessible selectors (getByRole, getByLabel) instead of CSS selectors
- Wait for network idle state before assertions
- Use proper wait strategies (page.waitForURL, waitForLoadState)

**Test Reports**:
- HTML reports with screenshots on failure
- Video recording on test failure
- Trace viewer for debugging
- Clear failure messages

**Developer Experience**:
- Fast test execution (< 5 min total)
- Easy to run locally: `npm run test:e2e`
- Debug mode: `npm run test:e2e:debug`
- Visual debugging with Playwright Inspector

## Implementation Plan
[To be filled by Orchestrator Agent after task breakdown]

### Phase 1: Infrastructure (2 days)
- Task-027: Install Playwright and configure
- Task-028: Set up test database with Docker Compose
- Task-029: Create test fixtures and utilities

### Phase 2: Critical Tests (2 days)
- Task-030: Registration flow tests (PRIORITY 1)
- Task-031: Login flow tests (PRIORITY 1)
- Task-032: Database validation tests (PRIORITY 1)

### Phase 3: OAuth & Advanced (1 day)
- Task-033: Google OAuth E2E tests (if feature exists)

### Phase 4: CI/CD Integration (1 day)
- Task-034: GitHub Actions integration
- Task-035: Documentation and troubleshooting guide

## Progress Log
- [2025-12-14 22:45] Feature created by Planner Agent
- [2025-12-14] **Orchestrator task breakdown complete**: Created 9 tasks (027-035)
- [2025-12-14] Status changed to ready-for-implementation
- [2025-12-14] Estimated 35-46 hours total (5-6 days)
- [Pending] Implementation start

## Testing Strategy

### Test Levels
- **E2E Tests**: Full user journeys (browser → API → database)
- **Integration Tests**: API + database interactions (already exists in task-009)
- **Unit Tests**: Component and service logic (already exists)

### Test Data Management
- **Fresh database** for each test run
- **Truncate tables** between individual tests (faster than full reset)
- **Generated test data** (no hardcoded IDs, use factories)
- **Isolated test users** (unique email per test)

### Debugging Failed Tests
- Screenshot on failure (automatic)
- Video recording on failure (automatic)
- Trace viewer for step-by-step replay
- Console logs captured
- Network requests logged

## Related PRs
[To be filled during implementation]

## Demo/Screenshots
[To be added when feature is complete]

## Lessons Learned
[To be filled after completion]

---

## Appendix: Production Incident Context

**What This Feature Prevents**:
The production bug (relation "users" does not exist) would have been caught by:
1. Registration E2E test attempting to create account
2. Test would fail with same 500 error
3. PR check would fail, blocking merge
4. Issue fixed before reaching production

**Coverage Guarantees**:
With this feature implemented, the following are guaranteed:
- User registration works end-to-end (form → API → database)
- Database schema is complete and valid
- Authentication flows work as expected
- Critical tables exist before deployment
- Migrations are applied successfully

**Never Again**: This class of production bug will never recur once E2E tests are in place.
