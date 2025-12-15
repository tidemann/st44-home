# Local E2E Testing Guide

Complete guide for running end-to-end tests locally during development. This guide covers setup, execution, debugging, and best practices for the Playwright E2E test suite.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Running Tests](#running-tests)
- [Debugging Tests](#debugging-tests)
- [Database Management](#database-management)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [FAQ](#faq)

---

## Prerequisites

Before running E2E tests locally, ensure you have:

### Required Software
- **Docker Desktop** - For running PostgreSQL test database
  - Windows/Mac: [Download Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Verify: `docker --version` (should be 20.0+)
- **Node.js** - Version 18 or higher
  - Verify: `node --version`
  - Verify: `npm --version`

### Required Ports (Must Be Available)
- **5433** - PostgreSQL test database
- **3001** - Backend API server (test)
- **4201** - Frontend dev server (test)

Check if ports are free:
```bash
# Windows PowerShell
netstat -ano | findstr ":5433"
netstat -ano | findstr ":3001"
netstat -ano | findstr ":4201"

# If any port is in use, stop the process or configure different ports in .env.e2e-local
```

### Recommended Tools
- **VS Code** with [Playwright extension](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)
  - Enables test discovery, inline test running, and debugging
- **Playwright Inspector** - Included with Playwright, helps debug selectors

---

## Quick Start

### First-Time Setup

1. **Navigate to frontend directory:**
   ```bash
   cd apps/frontend
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

3. **Start E2E test environment:**
   ```bash
   npm run test:e2e:start
   ```
   This command:
   - Starts Docker Compose with PostgreSQL test database
   - Starts backend API server on port 3001
   - Starts frontend dev server on port 4201
   - Waits for all services to become healthy

4. **Run tests:**
   ```bash
   npm run test:e2e
   ```

5. **Stop environment when done:**
   ```bash
   npm run test:e2e:stop
   ```

### Automated Full Cycle

For a complete automated run (start → test → stop):

```bash
npm run test:e2e:local
```

This is the **recommended** command for CI-like execution locally.

---

## Running Tests

### Available NPM Scripts

All commands run from `apps/frontend/` directory:

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run test:e2e:local` | **Full automated run** - starts services, runs tests, stops services | **Most common** - complete test execution |
| `npm run test:e2e:watch` | **Watch mode** - starts services and opens Playwright UI | **Development** - iterating on tests |
| `npm run test:e2e:debug` | **Debug mode** - runs tests in headed mode with Playwright inspector | **Debugging** - troubleshooting failing tests |
| `npm run test:e2e:ui` | **UI mode** - opens interactive Playwright UI for test exploration | **Exploration** - understanding test behavior |
| `npm run test:e2e:start` | **Start services only** - doesn't run tests | **Manual control** - when running tests separately |
| `npm run test:e2e:stop` | **Stop services** - shuts down Docker Compose | **Cleanup** - after manual test runs |
| `npm run test:e2e:restart` | **Restart services** - stops and starts fresh | **Reset** - when services are in bad state |
| `npm run test:e2e:logs` | **View logs** - shows all service logs | **Debugging** - checking backend/DB output |
| `npm run test:e2e:reset` | **Reset database** - cleans all test data | **Fresh state** - before test runs |

### Common Workflows

#### Development Workflow (Iterating on Tests)

```bash
# 1. Start services once
npm run test:e2e:start

# 2. Run tests repeatedly as you edit
npm run test:e2e

# 3. Or use watch mode for auto-rerun
npm run test:e2e:watch

# 4. Stop when done
npm run test:e2e:stop
```

#### Quick Test Run (CI-like)

```bash
# One command - complete cycle
npm run test:e2e:local
```

#### Debugging Failing Test

```bash
# Option 1: VS Code debugger (recommended)
# - Open test file
# - Set breakpoint
# - Press F5 or use "Debug Current E2E Test" launch config

# Option 2: Playwright inspector
npm run test:e2e:debug

# Option 3: Headed mode to watch browser
npx playwright test --headed --project=chromium
```

### Running Specific Tests

#### Run Single Test File

```bash
npx playwright test e2e/auth/registration.spec.ts
```

#### Run Single Test Case

```bash
npx playwright test -g "user can register with valid credentials"
```

#### Run Tests in Specific Browser

```bash
# Chromium (default)
npx playwright test --project=chromium

# All browsers (if configured)
npx playwright test --project=chromium --project=firefox --project=webkit
```

#### Run Tests with UI

```bash
npx playwright test --ui
```

---

## Debugging Tests

### VS Code Debugger (Recommended)

Visual Studio Code provides the best debugging experience with breakpoints and variable inspection.

**Setup (Already Done):**
- Debug configurations exist in `.vscode/launch.json`
- Playwright extension recommended (but not required)

**Debugging Workflow:**

1. **Open test file** in VS Code (e.g., `e2e/auth/registration.spec.ts`)

2. **Set breakpoint** by clicking in the gutter (left of line numbers)

3. **Choose debug configuration:**
   - Press `F5` or open Run and Debug view (`Ctrl+Shift+D` / `Cmd+Shift+D`)
   - Select from dropdown:
     - **"Debug E2E Tests"** - Run all tests with debugger (auto-starts services)
     - **"Debug Current E2E Test"** - Debug currently open test file
     - **"Debug E2E with Inspector"** - Opens Playwright UI for selector debugging
     - **"Debug E2E (Services Already Running)"** - Skip service startup (faster)

4. **Use debug controls:**
   - `F5` - Continue
   - `F10` - Step over
   - `F11` - Step into
   - `Shift+F11` - Step out
   - `F9` - Toggle breakpoint

5. **Inspect variables:**
   - Hover over variables to see values
   - Use Debug Console to evaluate expressions
   - View Call Stack and Variables panels

**Example Debug Session:**

```typescript
test('user can register', async ({ page }) => {
  const email = generateTestEmail();
  const password = 'Test123!';
  
  await page.goto('/register');
  await page.fill('[data-testid="email-input"]', email); // <- Set breakpoint here
  
  // Execution pauses at breakpoint
  // Inspect: email value, page state, DOM
  // Step through to see each action
  
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="submit-button"]');
  
  await expect(page).toHaveURL('/households');
});
```

### Playwright Inspector

For debugging selectors and page interactions:

```bash
npm run test:e2e:debug
```

**Playwright Inspector Features:**
- **Step through test** - Execute test line by line
- **Pick locator** - Click elements to generate selectors
- **Record actions** - Generate test code from browser interactions
- **View screenshots** - See page state at each step
- **Console logs** - See console output and network requests

**Using Inspector:**

1. Inspector window opens automatically in debug mode
2. Click "Step over" to execute one line at a time
3. Click "Pick locator" to select elements on page
4. View highlighted elements in browser
5. Copy generated selectors to test code

### Console Logging

Add debug output to tests:

```typescript
test('debug example', async ({ page }) => {
  console.log('Starting test');
  
  await page.goto('/register');
  
  // Log page title
  console.log('Page title:', await page.title());
  
  // Log element text
  const heading = await page.locator('h1').textContent();
  console.log('Heading:', heading);
  
  // Log network responses
  page.on('response', response => {
    console.log('Response:', response.url(), response.status());
  });
});
```

### Screenshots and Videos

Playwright captures screenshots and videos on test failure:

- **Screenshots**: `apps/frontend/test-results/<test-name>/screenshot.png`
- **Videos**: `apps/frontend/test-results/<test-name>/video.webm` (if enabled)
- **Traces**: `apps/frontend/test-results/<test-name>/trace.zip` (if enabled)

View trace files:
```bash
npx playwright show-trace test-results/<test-name>/trace.zip
```

---

## Database Management

### Seeding Test Data

Use the seeding utilities in `apps/frontend/e2e/helpers/seed-database.ts` to create test data programmatically.

#### Basic Example

```typescript
import { seedTestUser, seedTestHousehold } from './helpers/seed-database';

test('user can view household', async ({ page }) => {
  // Seed test data
  const user = await seedTestUser({
    email: 'test@example.com',
    password: 'Test123!'
  });
  
  const household = await seedTestHousehold({
    name: 'Test Family',
    ownerId: user.userId
  });
  
  // Now test with known data
  await page.goto('/login');
  await page.fill('[data-testid="email"]', user.email);
  await page.fill('[data-testid="password"]', 'Test123!');
  await page.click('[data-testid="submit"]');
  
  // Assert household visible
  await expect(page.locator('text=Test Family')).toBeVisible();
});
```

#### Full Scenario

Create complete test environment with user, household, children, and tasks:

```typescript
import { seedFullScenario } from './helpers/seed-database';

test('parent can assign tasks', async ({ page }) => {
  // Create complete environment
  const scenario = await seedFullScenario({
    userEmail: 'parent@test.com',
    userPassword: 'Parent123!',
    householdName: 'Smith Family',
    childrenCount: 2,
    tasksCount: 3
  });
  
  // scenario contains:
  // - scenario.user { userId, email }
  // - scenario.household { householdId, name }
  // - scenario.children [{ childId, name }, ...]
  // - scenario.tasks { taskIds: [...] }
  
  // Login and test
  await page.goto('/login');
  // ...
});
```

#### Minimal Scenario

For tests that only need user + household:

```typescript
import { seedMinimalScenario } from './helpers/seed-database';

test('user can update household settings', async ({ page }) => {
  const { user, household } = await seedMinimalScenario();
  
  // Test household settings page
  // ...
});
```

#### Available Seeding Functions

- `seedTestUser(data)` - Create single user
- `seedTestHousehold(data)` - Create household with owner
- `addHouseholdMember(data)` - Add member to household
- `seedTestChild(data)` - Create single child
- `seedTestTasks(data)` - Create multiple tasks
- `resetDatabase()` - Clean all test data
- `seedFullScenario(config)` - Complete test environment
- `seedMinimalScenario()` - User + household only

See `apps/frontend/e2e/helpers/seed-database.ts` for full API documentation.

### Resetting Database

Reset database to clean state (truncates all tables):

```bash
npm run test:e2e:reset
```

Or in test code:

```typescript
import { resetDatabase } from './helpers/seed-database';

test.beforeEach(async () => {
  await resetDatabase(); // Clean state before each test
});
```

### Manual SQL Queries

Access test database directly:

```bash
# Connect to PostgreSQL
docker exec -it st44-postgres-test psql -U postgres -d st44_test

# Example queries
SELECT * FROM users;
SELECT * FROM households;
SELECT * FROM children;

# Exit
\q
```

Run SQL file:

```bash
docker exec -i st44-postgres-test psql -U postgres -d st44_test < docker/postgres/test-seeds/01-users.sql
```

### Loading SQL Seed Files

For manual testing with realistic data:

```powershell
# Load all seed files
Get-ChildItem docker/postgres/test-seeds/*.sql | Sort-Object Name | ForEach-Object {
  Get-Content $_.FullName | docker exec -i st44-postgres-test psql -U postgres -d st44_test
}
```

This creates sample users, households, children, and tasks. See `docker/postgres/test-seeds/README.md` for details.

---

## Troubleshooting

### Port Already in Use

**Symptom:** `Error: bind: address already in use`

**Solution:**

```bash
# Find process using port (Windows)
netstat -ano | findstr :5433

# Kill process
taskkill /PID <process_id> /F

# Or use different port
# Edit .env.e2e-local and change DB_PORT=5434
```

### Services Won't Start

**Symptom:** Timeout waiting for services to become healthy

**Solution:**

1. **Check Docker is running:**
   ```bash
   docker ps
   ```

2. **View service logs:**
   ```bash
   npm run test:e2e:logs
   ```

3. **Check backend health manually:**
   ```bash
   curl http://localhost:3001/health
   ```

4. **Restart services:**
   ```bash
   npm run test:e2e:restart
   ```

5. **Verify ports are free** (see "Port Already in Use" above)

### Database Connection Errors

**Symptom:** `Error: connect ECONNREFUSED` or `password authentication failed`

**Solutions:**

1. **Verify database container is running:**
   ```bash
   docker ps | findstr postgres-test
   ```

2. **Check connection manually:**
   ```bash
   docker exec -it st44-postgres-test psql -U postgres -d st44_test
   ```

3. **Verify environment variables:**
   ```bash
   # Check .env.e2e-local contains:
   DB_HOST=localhost
   DB_PORT=5433
   DB_NAME=st44_test
   DB_USER=postgres
   DB_PASSWORD=postgres
   ```

4. **Reset database:**
   ```bash
   npm run test:e2e:reset
   ```

### Tests Failing Locally but Passing in CI

**Common Causes:**

1. **Port conflicts** - Different ports in CI vs local
   - Solution: Use environment variables, check `.env.e2e-local`

2. **Timing differences** - Tests pass in slow CI, fail in fast local
   - Solution: Use proper wait strategies (see Best Practices)

3. **Database state** - Tests depend on execution order
   - Solution: Make tests independent, seed own data

4. **Environment variables** - Different config
   - Solution: Match CI environment variables locally

### Tests Timing Out

**Symptom:** Tests fail with `Timeout 30000ms exceeded`

**Solutions:**

1. **Increase test timeout:**
   ```typescript
   test('slow operation', async ({ page }) => {
     test.setTimeout(60000); // 60 seconds
     // ...
   });
   ```

2. **Use proper wait strategies:**
   ```typescript
   // Wait for page to be fully loaded
   await page.waitForLoadState('networkidle');
   
   // Wait for specific element
   await page.waitForSelector('[data-testid="result"]');
   
   // Wait for API call
   await page.waitForResponse(response => 
     response.url().includes('/api/households')
   );
   ```

3. **Check backend logs:**
   ```bash
   npm run test:e2e:logs
   ```

### Slow Test Execution

**Symptoms:** Tests take > 5 minutes to run

**Solutions:**

1. **Run fewer browsers:**
   ```bash
   # Only Chromium
   npx playwright test --project=chromium
   ```

2. **Run tests in parallel:**
   ```typescript
   // playwright.config.ts
   export default {
     workers: 4, // Run 4 tests in parallel
   };
   ```

3. **Optimize database seeding:**
   - Seed only required data
   - Use `seedMinimalScenario()` instead of `seedFullScenario()`

4. **Skip slow tests during development:**
   ```typescript
   test.skip('slow test', async ({ page }) => {
     // ...
   });
   ```

### Playwright Extension Not Working

**Symptom:** Tests don't appear in VS Code Test Explorer

**Solutions:**

1. **Install Playwright extension:**
   - Open Extensions (Ctrl+Shift+X)
   - Search "Playwright"
   - Install "Playwright Test for VSCode"

2. **Reload VS Code:**
   - Press Ctrl+Shift+P
   - Type "Reload Window"

3. **Check workspace is opened at root:**
   - VS Code should be opened at `home/` directory
   - Not at `apps/frontend/`

---

## Best Practices

### Test Independence

Each test should be self-contained and not depend on other tests.

**❌ Bad - Depends on Previous Test:**

```typescript
test('create household', async ({ page }) => {
  // Creates household
});

test('view household', async ({ page }) => {
  // Assumes household exists from previous test
  // WILL FAIL if run alone
});
```

**✅ Good - Self-Contained:**

```typescript
test('create household', async ({ page }) => {
  const user = await seedTestUser({ ... });
  // Test creates own data
});

test('view household', async ({ page }) => {
  const user = await seedTestUser({ ... });
  const household = await seedTestHousehold({ ... });
  // Test seeds own data - can run independently
});
```

### Cleanup After Tests

Reset database before each test for clean state:

```typescript
import { resetDatabase } from './helpers/seed-database';

test.beforeEach(async () => {
  await resetDatabase(); // Fresh start for every test
});

test('first test', async ({ page }) => {
  // Runs with clean database
});

test('second test', async ({ page }) => {
  // Also runs with clean database
});
```

### Wait Strategies

Use proper wait strategies instead of fixed timeouts.

**❌ Bad - Fixed Timeouts:**

```typescript
await page.click('[data-testid="submit"]');
await page.waitForTimeout(2000); // Arbitrary wait
await expect(page.locator('[data-testid="success"]')).toBeVisible();
```

**✅ Good - Wait for Specific Conditions:**

```typescript
await page.click('[data-testid="submit"]');

// Wait for navigation
await page.waitForLoadState('networkidle');

// Or wait for specific element
await page.waitForSelector('[data-testid="success"]');

// Or wait for API response
await page.waitForResponse(response => 
  response.url().includes('/api/households')
);

await expect(page.locator('[data-testid="success"]')).toBeVisible();
```

### Selector Best Practices

Use stable, explicit selectors that won't break with UI changes.

**Selector Priority (Best to Worst):**

1. **data-testid** - Explicit test identifiers
2. **role + name** - Semantic accessibility selectors
3. **placeholder/label** - Form input selectors
4. **text content** - User-visible text
5. **CSS classes** - Avoid (breaks with styling changes)

**Examples:**

```typescript
// ✅ Best - Explicit test ID
await page.click('[data-testid="create-household-button"]');

// ✅ Good - Accessible role selector
await page.click('role=button[name="Create Household"]');

// ✅ Good - Form label
await page.fill('input[placeholder="Email"]', 'test@example.com');

// ✅ OK - User-visible text
await page.click('text=Create Household');

// ❌ Bad - CSS classes (fragile)
await page.click('.btn.btn-primary.mt-4');

// ❌ Bad - nth-child (fragile)
await page.click('button:nth-child(2)');
```

### Authentication Patterns

Reuse authentication state to avoid repeated logins.

**Option 1: Seed and Login in beforeEach**

```typescript
let user;

test.beforeEach(async ({ page }) => {
  await resetDatabase();
  user = await seedTestUser({
    email: 'test@example.com',
    password: 'Test123!'
  });
  
  // Login
  await page.goto('/login');
  await page.fill('[data-testid="email"]', user.email);
  await page.fill('[data-testid="password"]', 'Test123!');
  await page.click('[data-testid="submit"]');
  await page.waitForURL('/households');
});

test('can create household', async ({ page }) => {
  // Already logged in
  await page.click('[data-testid="create-household"]');
});
```

**Option 2: Storage State (Advanced)**

```typescript
// auth.setup.ts - Run once
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'Test123!');
  await page.click('[data-testid="submit"]');
  
  // Save authentication state
  await page.context().storageState({ path: 'auth.json' });
});

// playwright.config.ts
export default {
  use: {
    storageState: 'auth.json', // Reuse auth for all tests
  },
};
```

### Error Messages

Add descriptive error messages to assertions:

```typescript
// ❌ Bad - No context
await expect(page.locator('[data-testid="household"]')).toBeVisible();

// ✅ Good - Clear error message
await expect(page.locator('[data-testid="household"]'))
  .toBeVisible({ message: 'Household should be visible after creation' });
```

### Page Object Pattern

Organize selectors and actions in page objects:

```typescript
// pages/household-create.page.ts
export class HouseholdCreatePage {
  constructor(private page: Page) {}
  
  async goto() {
    await this.page.goto('/households/create');
  }
  
  async fillName(name: string) {
    await this.page.fill('[data-testid="household-name"]', name);
  }
  
  async submit() {
    await this.page.click('[data-testid="submit"]');
  }
  
  async create(name: string) {
    await this.fillName(name);
    await this.submit();
  }
}

// In test
test('create household', async ({ page }) => {
  const createPage = new HouseholdCreatePage(page);
  await createPage.goto();
  await createPage.create('My Family');
  
  await expect(page).toHaveURL('/households');
});
```

---

## FAQ

### How do I run a single test?

```bash
npx playwright test e2e/auth/registration.spec.ts
```

Or run specific test case:

```bash
npx playwright test -g "user can register"
```

### How do I skip tests?

```typescript
// Skip single test
test.skip('not ready yet', async ({ page }) => {
  // ...
});

// Skip conditionally
test('windows only', async ({ page }) => {
  test.skip(process.platform !== 'win32', 'Windows only');
  // ...
});

// Skip entire file
test.skip();
```

### How do I run tests in headed mode?

```bash
npx playwright test --headed
```

Or use debug configuration in VS Code.

### How do I run tests in different browsers?

```bash
# Chromium (default)
npx playwright test --project=chromium

# Firefox
npx playwright test --project=firefox

# WebKit (Safari)
npx playwright test --project=webkit

# All browsers
npx playwright test
```

### How do I update snapshots?

```bash
npx playwright test --update-snapshots
```

### How do I see test reports?

```bash
npx playwright show-report
```

Opens HTML report in browser.

### How do I run tests without starting services?

If services are already running:

```bash
npx playwright test
```

Skip the `test:e2e:start` step.

### How do I check service health?

```bash
# Backend
curl http://localhost:3001/health

# Database
docker exec -it st44-postgres-test psql -U postgres -d st44_test -c "SELECT 1"

# View all logs
npm run test:e2e:logs
```

### Can I use the Playwright UI?

Yes! It's great for exploration:

```bash
npm run test:e2e:ui
```

Or:

```bash
npx playwright test --ui
```

### Where are test artifacts stored?

- **Screenshots**: `test-results/<test-name>/screenshot.png`
- **Videos**: `test-results/<test-name>/video.webm`
- **Traces**: `test-results/<test-name>/trace.zip`
- **Reports**: `playwright-report/`

### How do I clean up old test artifacts?

```bash
# Remove test results
rm -rf test-results

# Remove reports
rm -rf playwright-report
```

---

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [E2E Testing Guide (main docs)](../docs/E2E_TESTING.md)
- [Database Schema](../docker/postgres/SCHEMA.md)
- [Test Seed Files](../docker/postgres/test-seeds/README.md)

---

## Need Help?

If you encounter issues not covered in this guide:

1. Check service logs: `npm run test:e2e:logs`
2. Verify health: `curl http://localhost:3001/health`
3. Reset environment: `npm run test:e2e:restart`
4. Check troubleshooting section above
5. Ask the team in #engineering channel

---

**Last Updated**: December 2025  
**Maintained by**: Engineering Team
