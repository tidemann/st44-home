# E2E Testing Guide

## Overview

This project uses [Playwright](https://playwright.dev/) for end-to-end (E2E) testing. E2E tests validate critical user flows by simulating real user interactions in a browser environment.

## Table of Contents

- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Page Object Pattern](#page-object-pattern)
- [Test Helpers](#test-helpers)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Getting Started

### Prerequisites

- Node.js 22+
- npm 10+
- PostgreSQL 17 (via Docker)
- Backend and frontend applications

### Installation

Playwright browsers are automatically installed when you run `npm ci` in the frontend directory. If you need to reinstall them:

```bash
cd apps/frontend
npx playwright install chromium
```

### Test Environment Setup

E2E tests require the full application stack:

1. **Start PostgreSQL database**:
   ```bash
   cd infra
   docker compose up -d db
   ```

2. **Initialize database** (first time only):
   ```bash
   cd apps/backend
   npm run db:init
   ```

3. **Start backend server**:
   ```bash
   cd apps/backend
   npm start
   ```
   Backend will be available at `http://localhost:3000`

4. **Start frontend (for local testing)**:
   ```bash
   cd apps/frontend
   npm start
   ```
   Frontend will be available at `http://localhost:4200`

## Running Tests

### Local Development

Run all E2E tests:
```bash
cd apps/frontend
npm run test:e2e
```

Run tests in UI mode (interactive debugging):
```bash
npx playwright test --ui
```

Run tests in headed mode (see browser):
```bash
npx playwright test --headed
```

Run specific test file:
```bash
npx playwright test e2e/auth/login.spec.ts
```

Run tests matching a pattern:
```bash
npx playwright test --grep "registration"
```

### CI Environment

E2E tests run automatically on PRs via the optional E2E workflow:

- **Manual trigger**: [Actions > E2E Tests](https://github.com/tidemann/st44-home/actions/workflows/e2e.yml)
- **Scheduled**: Daily at 2 AM UTC
- **On-demand**: Via GitHub Actions UI

Tests in CI use:
- 4 parallel workers for faster execution
- Direct backend connection (`http://localhost:3000`)
- PostgreSQL service container
- Chromium browser only

## Writing Tests

### Test Structure

Tests are organized by feature area:

```
apps/frontend/e2e/
├── auth/                  # Authentication tests
│   ├── login.spec.ts
│   └── registration.spec.ts
├── infrastructure/        # System tests
│   └── database.spec.ts
├── helpers/              # Test utilities
│   ├── auth-helpers.ts
│   └── test-helpers.ts
└── pages/                # Page objects
    ├── base.page.ts
    ├── login.page.ts
    └── register.page.ts
```

### Basic Test Example

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

test.describe('Login Flow', () => {
  test('should login with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login('user@example.com', 'Password123!');
    
    await expect(page).toHaveURL('/');
    expect(await loginPage.isLoggedIn()).toBe(true);
  });
});
```

### Using Test Hooks

```typescript
import { test } from '@playwright/test';
import { createTestUser, cleanupTestUser } from '../helpers/test-helpers';

test.describe('User Management', () => {
  let testUser: { email: string; password: string };

  test.beforeAll(async () => {
    // Setup: Create test user
    testUser = await createTestUser();
  });

  test.afterAll(async () => {
    // Teardown: Clean up test data
    await cleanupTestUser(testUser.email);
  });

  test('should update user profile', async ({ page }) => {
    // Test implementation
  });
});
```

## Page Object Pattern

We use the Page Object Model (POM) to organize test code:

### Benefits

- **Maintainability**: UI changes only require updating page objects
- **Reusability**: Common actions can be reused across tests
- **Readability**: Tests read like user stories
- **Type Safety**: TypeScript provides autocomplete and type checking

### BasePage Class

All page objects extend `BasePage` which provides common functionality:

```typescript
import { BasePage } from './base.page';
import { Page } from '@playwright/test';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Page-specific methods...
}
```

### Example: LoginPage

```typescript
export class LoginPage extends BasePage {
  // Locators
  private emailInput = this.page.locator('input[type="email"]');
  private passwordInput = this.page.locator('input[type="password"]');
  private submitButton = this.page.locator('button[type="submit"]');
  private errorMessage = this.page.locator('.error-message');

  // Actions
  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForLoad();
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.waitForNavigation();
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  async isLoggedIn(): Promise<boolean> {
    return await this.isVisible(this.page.locator('[data-testid="user-menu"]'));
  }
}
```

### Creating a New Page Object

1. Create a new file in `apps/frontend/e2e/pages/`
2. Extend `BasePage`
3. Define locators as private properties
4. Create action methods for user interactions
5. Create query methods to check page state

**Template:**

```typescript
import { BasePage } from './base.page';
import { Page } from '@playwright/test';

export class MyPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  private myButton = this.page.locator('button[data-testid="my-button"]');

  // Actions
  async goto(): Promise<void> {
    await this.page.goto('/my-page');
    await this.waitForLoad();
  }

  async clickMyButton(): Promise<void> {
    await this.myButton.click();
  }

  // Queries
  async isButtonVisible(): Promise<boolean> {
    return await this.isVisible(this.myButton);
  }
}
```

## Test Helpers

### Authentication Helpers

Located in `apps/frontend/e2e/helpers/auth-helpers.ts`:

```typescript
import { createTestUser, loginUser } from './auth-helpers';

// Create a test user
const user = await createTestUser('test@example.com', 'Password123!');

// Login programmatically (faster than UI login)
await loginUser(page, 'test@example.com', 'Password123!');
```

### Database Helpers

Located in `apps/frontend/e2e/helpers/test-helpers.ts`:

```typescript
import { cleanupTestUser, verifyUserExists } from './test-helpers';

// Verify user was created
const exists = await verifyUserExists('test@example.com');

// Clean up after test
await cleanupTestUser('test@example.com');
```

### Common Helpers

```typescript
// Wait for API response
await page.waitForResponse(resp => 
  resp.url().includes('/api/users') && resp.status() === 200
);

// Fill form with object
await fillForm(page, {
  email: 'test@example.com',
  password: 'Password123!',
  name: 'Test User'
});

// Take screenshot on failure
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== 'passed') {
    await page.screenshot({ 
      path: `test-results/${testInfo.title}-failure.png`,
      fullPage: true 
    });
  }
});
```

## CI/CD Integration

### GitHub Actions Workflow

E2E tests run in a separate optional workflow (`.github/workflows/e2e.yml`):

- **Triggers**: Manual (`workflow_dispatch`) and daily schedule
- **Environment**: Ubuntu latest with PostgreSQL 17 service
- **Execution**: 4 parallel workers with Chromium only
- **Artifacts**: Test reports and traces uploaded on failure

### Why Separate from Main CI?

- E2E tests can be slow (5-10 minutes)
- Allows PR merges without waiting for E2E completion
- Can be run on-demand or scheduled
- Reduces CI pipeline execution time

### Running E2E Tests Manually

1. Go to [Actions tab](https://github.com/tidemann/st44-home/actions/workflows/e2e.yml)
2. Click "Run workflow"
3. Select branch (usually `main`)
4. Click "Run workflow" button

### Test Artifacts

If tests fail, check the uploaded artifacts:

- **playwright-report**: HTML report with test results, screenshots, traces
- **playwright-traces**: Detailed trace files for debugging

Download artifacts from the workflow run page.

## Troubleshooting

### Common Issues

#### Tests Timeout

**Symptom**: Tests fail with "Timeout 30000ms exceeded"

**Solutions**:
1. Increase timeout in `playwright.config.ts`:
   ```typescript
   timeout: 60000, // 60 seconds
   ```
2. Check backend is running and accessible
3. Check database is initialized
4. Verify network connectivity

#### Database Connection Errors

**Symptom**: Tests fail with "connect ECONNREFUSED" or "relation does not exist"

**Solutions**:
1. Ensure PostgreSQL is running:
   ```bash
   docker ps | grep postgres
   ```
2. Initialize database:
   ```bash
   cd apps/backend
   npm run db:init
   ```
3. Check backend logs for database errors

#### Browser Not Found

**Symptom**: "Executable doesn't exist at..."

**Solutions**:
1. Reinstall Playwright browsers:
   ```bash
   cd apps/frontend
   npx playwright install chromium
   ```
2. Clear npm cache and reinstall:
   ```bash
   npm cache clean --force
   npm ci
   ```

#### Test Flakiness

**Symptom**: Tests pass sometimes, fail other times

**Solutions**:
1. Add explicit waits:
   ```typescript
   await page.waitForLoadState('networkidle');
   ```
2. Use `waitForSelector` instead of `querySelector`:
   ```typescript
   await page.waitForSelector('button[type="submit"]');
   ```
3. Avoid fixed timeouts (`setTimeout`), use Playwright's auto-waiting
4. Check for race conditions in test setup/teardown

#### CI Tests Pass Locally But Fail in CI

**Solutions**:
1. Check environment differences (ports, URLs)
2. Run tests with CI config locally:
   ```bash
   CI=true npm run test:e2e
   ```
3. Check service container health in CI logs
4. Verify backend started successfully in CI

### Debugging Tests

#### UI Mode (Recommended)

Run tests in interactive mode with time travel debugging:

```bash
npx playwright test --ui
```

Features:
- Step through tests
- Inspect DOM at each step
- View network requests
- See console logs
- Pick locators visually

#### Headed Mode

See the browser while tests run:

```bash
npx playwright test --headed --workers=1
```

#### Debug Mode

Run single test with Playwright Inspector:

```bash
npx playwright test e2e/auth/login.spec.ts --debug
```

#### Screenshots and Videos

Playwright automatically captures:
- Screenshots on failure (enabled by default)
- Videos on failure (enabled by default)
- Traces on first retry

Check `test-results/` directory for artifacts.

#### Verbose Logging

See detailed test execution logs:

```bash
DEBUG=pw:api npx playwright test
```

### Getting Help

1. Check [Playwright Documentation](https://playwright.dev/docs/intro)
2. Review test error messages and stack traces
3. Check CI logs for E2E workflow runs
4. Search [Playwright GitHub Issues](https://github.com/microsoft/playwright/issues)

## Best Practices

### Test Organization

✅ **DO:**
- Group related tests in `describe` blocks
- Use descriptive test names that explain what is being tested
- Keep tests independent (no shared state between tests)
- Use page objects for UI interactions
- Clean up test data in `afterEach`/`afterAll` hooks

❌ **DON'T:**
- Rely on test execution order
- Share state between tests
- Use fixed waits (`setTimeout`)
- Put locators directly in tests (use page objects)
- Leave test data in database

### Locator Strategies

**Priority order:**

1. **data-testid attributes** (most stable):
   ```typescript
   await page.locator('[data-testid="submit-button"]').click();
   ```

2. **Role and accessible name** (semantic):
   ```typescript
   await page.getByRole('button', { name: 'Submit' }).click();
   ```

3. **Label text** (for form inputs):
   ```typescript
   await page.getByLabel('Email').fill('test@example.com');
   ```

4. **CSS selectors** (last resort):
   ```typescript
   await page.locator('button.submit-btn').click();
   ```

### Waiting Strategies

Playwright has built-in auto-waiting. Avoid manual waits:

✅ **DO:**
```typescript
// Playwright waits automatically
await page.click('button');
await expect(page.locator('.message')).toBeVisible();
```

❌ **DON'T:**
```typescript
// Avoid fixed timeouts
await page.click('button');
await page.waitForTimeout(3000);
const message = await page.locator('.message');
```

### Test Data Management

✅ **DO:**
- Generate unique test data (timestamps, UUIDs)
- Clean up after tests
- Use test helpers for common operations
- Isolate test users/data per test

❌ **DON'T:**
- Hardcode test data that could conflict
- Reuse test data across tests
- Leave orphaned data in database
- Depend on specific database state

### Assertions

Use Playwright's expect API for better error messages:

✅ **DO:**
```typescript
await expect(page).toHaveURL('/dashboard');
await expect(page.locator('.error')).toBeVisible();
await expect(page.locator('.success')).toHaveText('Success!');
```

❌ **DON'T:**
```typescript
expect(page.url()).toBe('/dashboard');
expect(await page.locator('.error').isVisible()).toBe(true);
```

### Performance

- Use parallel execution (configured in `playwright.config.ts`)
- Avoid unnecessary UI interactions (use API for setup)
- Reuse authentication state across tests
- Keep tests focused on critical user flows

### Accessibility

Test accessibility alongside functionality:

```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test('login page should be accessible', async ({ page }) => {
  await page.goto('/login');
  await injectAxe(page);
  await checkA11y(page);
});
```

## Configuration

### Playwright Config

Located in `apps/frontend/playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './e2e',                    // Test directory
  fullyParallel: true,                 // Run tests in parallel
  retries: 0,                          // No retries (fail fast)
  workers: process.env.CI ? 4 : undefined,  // 4 workers in CI
  timeout: 30000,                      // 30 second timeout
  use: {
    baseURL: 'http://localhost:4200',  // Base URL for tests
    trace: 'on-first-retry',           // Capture trace on retry
    screenshot: 'only-on-failure',     // Screenshot on failure
    video: 'retain-on-failure',        // Video on failure
  },
  projects: [
    { name: 'chromium' },              // Test in Chromium only
  ],
});
```

### Environment Variables

- `CI=true`: Enables CI-specific configuration
- `DEBUG=pw:api`: Enables Playwright debug logging
- `HEADLESS=false`: Run browsers in headed mode

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)

## Contributing

When adding new E2E tests:

1. Follow the page object pattern
2. Use descriptive test names
3. Add proper setup/teardown
4. Include comments for complex logic
5. Test both happy path and error cases
6. Ensure tests pass locally before pushing
7. Update this documentation if needed

---

**Last Updated**: 2025-12-14
