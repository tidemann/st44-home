# End-to-End Testing Guide

Complete guide for Playwright e2e testing in the ST44 Home application. This guide covers setup, execution, debugging, and best practices for all testing modes (CI, local Docker, and dev mode).

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Testing Modes](#testing-modes)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing New Tests](#writing-new-tests)
- [Debugging](#debugging)
- [Environment Configuration](#environment-configuration)
- [CI/CD Integration](#cicd-integration)
- [Service Management](#service-management)
- [Troubleshooting](#troubleshooting)
- [Reference](#reference)

---

## Overview

This project uses [Playwright](https://playwright.dev/) for end-to-end (E2E) testing. E2E tests validate critical user flows by simulating real user interactions in a browser environment.

### Key Capabilities

- **Playwright-based testing** - Modern, reliable browser automation
- **Page Object Model** - Maintainable test architecture
- **11 test spec files** - Auth, features, infrastructure, UX
- **7 page objects** - Login, register, home, family, tasks, progress
- **4 test helpers** - Auth, API, database, utilities
- **Multiple execution modes** - CI, local Docker, dev mode
- **Interactive debugging** - UI mode, Inspector, VS Code

### Quick Links

- **E2E Skill**: Run `/e2e` for interactive test execution
- **E2E Agent**: `.claude/agents/e2e-agent.md` for comprehensive e2e support
- **Playwright Docs**: https://playwright.dev/docs/intro
- **CI Workflow**: `.github/workflows/e2e.yml`

---

## Quick Start

### Prerequisites

- **Docker Desktop** - For running PostgreSQL test database
  - Windows/Mac: [Download Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Verify: `docker --version` (should be 20.0+)
- **Node.js 22+** - Verify: `node --version`
- **Free ports**: 5433 (DB), 3001 (Backend), 4201 (Frontend)

Check if ports are available:

```powershell
# Windows PowerShell
netstat -ano | findstr ":5433"
netstat -ano | findstr ":3001"
netstat -ano | findstr ":4201"

# If any port is in use, kill the process or change ports in .env.e2e-local
```

### First-Time Setup

1. **Navigate to frontend directory**:

   ```bash
   cd apps/frontend
   ```

2. **Install dependencies** (if not already done):

   ```bash
   npm install
   ```

3. **Install Playwright browsers**:
   ```bash
   npx playwright install chromium
   ```

### Fastest Path - Complete Automated Run

```bash
cd apps/frontend
npm run test:e2e:full
```

This command:

- Starts Docker Compose services (PostgreSQL, backend, frontend)
- Waits for all services to become healthy
- Runs all e2e tests
- Stops services when complete

**Result**: All tests run in ~2-5 minutes

### Using the E2E Skill

For interactive test execution:

```
/e2e
```

The skill provides:

- Guided test execution
- Service auto-management
- Mode selection (headed, debug, UI)
- Troubleshooting assistance

---

## Testing Modes

### Port Configuration Reference

Different environments use different ports to avoid conflicts:

| Environment  | Frontend | Backend | Database | DB Name         | Docker Compose File          |
| ------------ | -------- | ------- | -------- | --------------- | ---------------------------- |
| Local Docker | 4201     | 3001    | 5433     | st44_test_local | docker-compose.e2e-local.yml |
| GitHub CI    | 4200     | 3000    | 55432    | st44_test       | N/A (service container)      |
| Production   | 8080     | 3000    | 5432     | st44            | docker-compose.yml           |

### 1. Local Docker Mode (Recommended)

**Used for**: Complete integration testing, CI-like runs

**Environment**:

- Full stack in Docker containers
- Isolated from development environment
- Auto-managed services
- Consistent environment every time

**Ports**:

- Frontend: `4201` (maps to container 4200)
- Backend: `3001` (maps to container 3000)
- Database: `5433` (maps to container 5432)
- Database Name: `st44_test_local`

**Docker Compose**: `docker-compose.e2e-local.yml`

**Commands**:

```bash
npm run test:e2e:full     # Start → test → stop (complete cycle)
npm run test:e2e:local    # Run tests only (services must be running)
npm run test:e2e:ui       # Interactive UI mode
npm run test:e2e:headed   # Watch browser execute tests
npm run test:e2e:debug    # Debug with Playwright Inspector
```

**Best for**: Full test suite runs, verifying all tests, final validation before push

### 2. GitHub Actions CI Mode

**Used for**: Automated testing in CI/CD pipeline

**Environment**:

- Ubuntu runner with PostgreSQL service
- Built frontend and backend (not containers)
- 4 parallel workers (currently disabled for DB consistency)
- Chromium browser only

**Ports**:

- Frontend: `4200` (direct, no container)
- Backend: `3000` (direct, no container)
- Database: `55432` (GitHub service container)
- Database Name: `st44_test`

**Workflow**: `.github/workflows/e2e.yml`

**Triggers**:

- Manual: [Actions > E2E Tests](https://github.com/tidemann/st44-home/actions/workflows/e2e.yml)
- Scheduled: Daily at 2 AM UTC

**Artifacts**: Test reports and traces uploaded on failure (7-day retention)

**Environment Variables**:

```yaml
FRONTEND_PORT: 4200
FRONTEND_HOST: localhost
BACKEND_PORT: 3000
BACKEND_HOST: localhost
DB_HOST: localhost
DB_PORT: 55432
DB_NAME: st44_test
USE_DOCKER_COMPOSE: false
CI: true
```

### 3. Dev Mode

**Used for**: Rapid test development, debugging specific tests

**Environment**:

- Manual start of frontend/backend dev servers
- Database in container (or use dev database)
- Uses existing running services
- Faster iteration, no service startup time

**Ports**:

- Frontend: `4200` (dev server)
- Backend: `3000` (dev server)
- Database: `5433` or `5432` (container or dev DB)

**Setup**:

```bash
# Terminal 1: Start database
cd infra
docker compose up -d db

# Terminal 2: Start backend
cd apps/backend
npm start

# Terminal 3: Start frontend
cd apps/frontend
npm start

# Terminal 4: Run tests
cd apps/frontend
npm run test:e2e:local
```

**Best for**: Rapid iteration, debugging specific tests, test development

**Note**: Use environment variables to point to local ports if needed:

```bash
FRONTEND_PORT=4200 BACKEND_PORT=3000 DB_PORT=5432 npm run test:e2e:local
```

---

## Running Tests

### Complete Workflows

#### Full Automated Cycle (Most Common)

```bash
npm run test:e2e:full
```

**What it does**:

1. Starts Docker Compose services
2. Waits for health checks
3. Runs all tests
4. Stops services

**Use when**: Running full test suite, CI-like validation

#### Interactive Development (Iterating on Tests)

```bash
# 1. Start services once
npm run test:e2e:start

# 2. Run tests repeatedly as you edit
npm run test:e2e:local

# 3. Or use UI mode for auto-rerun
npm run test:e2e:ui

# 4. Stop when done
npm run test:e2e:stop
```

**Use when**: Developing new tests, fixing failing tests

#### Quick Test Run

```bash
# Assumes services already running
npx playwright test
```

**Use when**: Services already up, just need to run tests

### Execution Modes

#### Headless Mode (Default)

```bash
npm run test:e2e:local
```

**Features**:

- No browser window
- Fastest execution
- Same as CI

**Use when**: Final validation, full test suite runs

#### Headed Mode (Watch Browser)

```bash
npm run test:e2e:headed
```

**Features**:

- Browser window visible
- See actions in real-time
- Observe page state changes
- Useful for visual debugging

**Use when**: Understanding test behavior, visual debugging

#### Debug Mode (Inspector)

```bash
npm run test:e2e:debug
```

**Features**:

- Playwright Inspector opens
- Step-by-step execution
- Pick locator tool
- Pause and inspect at any point
- Console logs visible

**Use when**: Debugging selector issues, understanding test flow

#### UI Mode (Interactive, Best for Exploration)

```bash
npm run test:e2e:ui
```

**Features**:

- Visual test explorer
- Click to run tests
- Step through execution
- Pick locators visually
- View DOM and network
- Time travel debugging
- Hot reload

**Use when**: Exploring tests, understanding behavior, developing tests

### Selective Test Execution

#### Run Specific Test File

```bash
npx playwright test e2e/auth/login.spec.ts
```

#### Run Test Suite by Folder

```bash
npx playwright test e2e/auth/
```

Runs all tests in auth directory (login, registration)

#### Run Tests Matching Pattern

```bash
npx playwright test --grep "registration"
```

Runs all tests with "registration" in the name

#### Run Single Test Case

```bash
npx playwright test -g "user can register with valid credentials"
```

#### Run Tests in Specific Project

```bash
# Chromium (default)
npx playwright test --project=chromium

# All configured browsers
npx playwright test
```

### Additional Flags

```bash
# Run with retries
npx playwright test --retries=2

# Run with specific workers
npx playwright test --workers=1

# Update snapshots
npx playwright test --update-snapshots

# Run only failed tests from last run
npx playwright test --last-failed
```

---

## Test Structure

### Directory Organization

```
apps/frontend/e2e/
├── auth/                       # Authentication tests (30 tests)
│   ├── login.spec.ts          # Login flow (13 tests)
│   └── registration.spec.ts   # Registration flow (17 tests)
├── features/                   # Feature-specific tests
│   ├── task-templates.spec.ts
│   ├── task-viewing-completion.spec.ts
│   ├── task-form-button.spec.ts
│   └── manual-assignment.spec.ts
├── infrastructure/             # System tests
│   └── database.spec.ts
├── ux-redesign/               # UX-specific tests
│   ├── dashboard.spec.ts
│   ├── family.spec.ts
│   ├── navigation.spec.ts
│   ├── progress.spec.ts
│   └── tasks.spec.ts
├── pages/                      # Page Objects (POM)
│   ├── base.page.ts           # Base class for all pages
│   ├── login.page.ts          # Login page object
│   ├── register.page.ts       # Registration page object
│   ├── home.page.ts           # Home/Dashboard page object
│   ├── family.page.ts         # Family page object
│   ├── tasks.page.ts          # Tasks page object
│   └── progress.page.ts       # Progress page object
├── helpers/                    # Test utilities
│   ├── auth-helpers.ts        # Login, logout, authentication
│   ├── api-helpers.ts         # API requests, database queries
│   ├── seed-database.ts       # Database seeding utilities
│   └── test-helpers.ts        # Common test utilities
└── example.spec.ts            # Basic example test
```

### Test Coverage

- **Total Test Specs**: 11 files
- **Total Page Objects**: 7 (including base)
- **Total Test Helpers**: 4
- **Total Tests**: 30+ across all files

### Page Object Model (POM)

All page objects extend `BasePage` which provides common functionality:

**BasePage** provides:

- `goto()` - Navigate to page
- `waitForLoad()` - Wait for page load complete
- `waitForNavigation()` - Wait for URL change
- `getTitle()` - Get page title
- `screenshot()` - Take screenshot
- `isVisible()` - Check element visibility

**Example Page Object Structure**:

```typescript
import { BasePage } from './base.page';
import { Page } from '@playwright/test';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators (private, prefer data-testid)
  private emailInput = this.page.locator('[data-testid="email"]');
  private passwordInput = this.page.locator('[data-testid="password"]');
  private submitButton = this.page.locator('[data-testid="submit"]');
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

  // Queries
  async getErrorMessage(): Promise<string> {
    return (await this.errorMessage.textContent()) || '';
  }

  async isLoggedIn(): Promise<boolean> {
    return await this.isVisible(this.page.locator('[data-testid="user-menu"]'));
  }
}
```

---

## Writing New Tests

### Step-by-Step Guide

1. **Determine test location** based on feature area:
   - `auth/` - Authentication flows
   - `features/` - Feature-specific tests
   - `infrastructure/` - System/infrastructure tests
   - `ux-redesign/` - UX-specific tests

2. **Create or update page object** (if needed):
   - Create new file in `pages/`
   - Extend `BasePage`
   - Define locators (prefer `data-testid`)
   - Create action methods
   - Create query methods

3. **Write test spec**:
   - Create `.spec.ts` file
   - Import page objects and helpers
   - Use `test.describe()` to group related tests
   - Follow AAA (Arrange-Act-Assert) pattern
   - Reset database before each test

### Basic Test Template

```typescript
import { test, expect } from '@playwright/test';
import { MyPage } from '../pages/my.page';
import { resetDatabase, seedTestData } from '../helpers/seed-database';

test.describe('My Feature', () => {
  test.beforeEach(async () => {
    // Arrange: Clean state
    await resetDatabase();
  });

  test('should complete user flow successfully', async ({ page }) => {
    // Arrange: Set up test data
    const testData = await seedTestData({
      user: { email: 'test@example.com', password: 'Test123!' },
    });

    const myPage = new MyPage(page);

    // Act: Perform user actions
    await myPage.goto();
    await myPage.performAction();

    // Assert: Verify expected outcomes
    await expect(page).toHaveURL('/success');
    await expect(myPage.successElement).toBeVisible();
  });

  test('should handle error case', async ({ page }) => {
    // Arrange
    const myPage = new MyPage(page);

    // Act
    await myPage.goto();
    await myPage.triggerError();

    // Assert
    const errorMsg = await myPage.getErrorMessage();
    expect(errorMsg).toContain('Expected error');
  });
});
```

### Database Seeding

Use `seed-database.ts` helpers to create test data:

#### Full Scenario (User, Household, Children, Tasks)

```typescript
import { seedTestData } from '../helpers/seed-database';

const scenario = await seedTestData({
  parent: {
    email: 'parent@test.com',
    password: 'Parent123!',
  },
  children: [
    { name: 'Emma', age: 10 },
    { name: 'Lucas', age: 8 },
  ],
  tasks: [
    { title: 'Clean room', ruleType: 'daily' },
    { title: 'Do homework', ruleType: 'weekly' },
  ],
});

// Access seeded data
const userId = scenario.user.userId;
const householdId = scenario.household.id;
const childIds = scenario.children.map((c) => c.id);
const taskIds = scenario.tasks.taskIds;
```

#### Minimal Scenario (User + Household Only)

```typescript
const { user, household } = await seedTestData({
  user: { email: 'test@example.com', password: 'Test123!' },
});
```

#### Individual Helpers

```typescript
import {
  seedTestUser,
  seedTestHousehold,
  seedTestChild,
  seedTestTasks,
  resetDatabase,
} from '../helpers/seed-database';

// Create single user
const user = await seedTestUser({
  email: 'test@example.com',
  password: 'Test123!',
});

// Create household
const household = await seedTestHousehold({
  name: 'My Family',
  ownerId: user.userId,
});

// Create child
const child = await seedTestChild({
  name: 'Emma',
  age: 10,
  householdId: household.id,
});

// Reset database
await resetDatabase();
```

### Authentication in Tests

```typescript
import { loginAsUser, loginAsParent, loginAsChild } from '../helpers/auth-helpers';

test.beforeEach(async ({ page }) => {
  await resetDatabase();
  const user = await seedTestUser({
    email: 'test@example.com',
    password: 'Test123!',
  });

  // Login via helper (faster than UI)
  await loginAsUser(page, user.email, 'Test123!');

  // Now authenticated and on dashboard
});
```

### Best Practices for Writing Tests

#### ✅ DO:

- Use page objects for all UI interactions
- Reset database before each test (`resetDatabase()`)
- Generate unique test data (timestamps, UUIDs)
- Use explicit waits (`waitForSelector`, `waitForLoadState`)
- Prefer `data-testid` selectors
- Write independent tests (no shared state)
- Test both happy path and error cases
- Use descriptive test names
- Follow AAA (Arrange-Act-Assert) pattern

#### ❌ DON'T:

- Use fixed timeouts (`waitForTimeout(5000)`)
- Put locators directly in tests
- Share state between tests
- Rely on test execution order
- Use fragile CSS class selectors
- Leave test data in database
- Skip error case testing
- Write dependent tests
- Hardcode environment-specific values

### Locator Strategies (Priority Order)

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

4. **Text content** (user-visible):

   ```typescript
   await page.locator('text=Submit').click();
   ```

5. **CSS selectors** (last resort):
   ```typescript
   await page.locator('button.submit-btn').click();
   ```

---

## Debugging

### Playwright UI Mode (Recommended)

**Best for**: Exploration, understanding test behavior, developing tests

```bash
npm run test:e2e:ui
```

**Features**:

- Visual test explorer - See all tests in tree view
- Click to run - Execute individual tests or suites
- Step through - Pause and step through test execution
- Pick locators - Click elements to generate selectors
- View DOM - Inspect page state at any point
- Network panel - See all network requests
- Time travel - Scrub through test execution
- Hot reload - Tests update as you edit

**Workflow**:

1. Run `npm run test:e2e:ui`
2. UI opens in browser
3. Click test to run
4. Use controls to step through
5. Click "Pick Locator" to select elements
6. View screenshots and DOM state
7. Edit tests and see changes live

### Playwright Inspector

**Best for**: Debugging selector issues, understanding test flow

```bash
npm run test:e2e:debug
```

**Features**:

- Step-by-step execution
- Pause at any point
- Generate selectors with "Pick Locator"
- View console logs
- Inspect page DOM
- See network requests

**Workflow**:

1. Run `npm run test:e2e:debug`
2. Inspector window opens
3. Click "Step over" to execute line-by-line
4. Click "Pick locator" to select elements
5. Copy generated selectors to test
6. Resume execution or step through

### VS Code Debugging

**Best for**: Breakpoint debugging, variable inspection

**.vscode/launch.json** provides debug configurations:

- **"Debug E2E Tests"** - Run all tests with debugger (auto-starts services)
- **"Debug Current E2E Test"** - Debug currently open test file
- **"Debug E2E with Inspector"** - Opens Playwright UI for selector debugging
- **"Debug E2E (Services Already Running)"** - Skip service startup (faster)

**Usage**:

1. Open test file in VS Code
2. Set breakpoint by clicking in gutter
3. Press `F5` or select debug configuration
4. Use debug controls:
   - `F5` - Continue
   - `F10` - Step over
   - `F11` - Step into
   - `Shift+F11` - Step out
5. Inspect variables in Debug panel
6. Use Debug Console for expressions

### Screenshots, Videos, and Traces

Playwright automatically captures artifacts on failure:

**Location**: `apps/frontend/test-results/<test-name>/`

**Artifacts**:

- `screenshot.png` - Screenshot at failure point
- `video.webm` - Video recording (if enabled)
- `trace.zip` - Complete trace file with DOM, network, console

**View trace file**:

```bash
npx playwright show-trace test-results/<test-name>/trace.zip
```

**Trace viewer features**:

- Timeline of actions
- DOM snapshots at each step
- Network requests
- Console logs
- Screenshots
- Source code

### Console Logging

Add debug output to tests:

```typescript
test('debug example', async ({ page }) => {
  console.log('Test starting');

  await page.goto('/login');
  console.log('Page title:', await page.title());

  const heading = await page.locator('h1').textContent();
  console.log('Heading:', heading);

  // Monitor network
  page.on('response', (response) => {
    console.log(`${response.status()} ${response.url()}`);
  });

  // Monitor console
  page.on('console', (msg) => {
    console.log('Browser console:', msg.text());
  });
});
```

### Common Debugging Patterns

#### Check if Element Exists

```typescript
const count = await page.locator('[data-testid="submit"]').count();
console.log('Element count:', count);

if (count === 0) {
  console.log('Element not found, taking screenshot');
  await page.screenshot({ path: 'debug.png' });
}
```

#### Wait for Element with Logging

```typescript
console.log('Waiting for submit button...');
await page.waitForSelector('[data-testid="submit"]', { timeout: 10000 }).catch(async () => {
  console.log('Submit button not found after 10s');
  await page.screenshot({ path: 'timeout.png' });
  throw new Error('Submit button timeout');
});
console.log('Submit button found');
```

#### Debug Network Issues

```typescript
const responsePromise = page.waitForResponse((resp) => resp.url().includes('/api/users'));

await page.click('[data-testid="load-users"]');

const response = await responsePromise;
console.log('API response:', response.status());
const data = await response.json();
console.log('API data:', data);
```

---

## Environment Configuration

### Port Mapping

See [Testing Modes](#testing-modes) for complete port reference table.

**Key principle**: Use environment variables, never hardcode ports

### Playwright Configuration

**File**: `apps/frontend/playwright.config.ts`

**Key settings**:

```typescript
export default defineConfig({
  testDir: './e2e', // Test directory
  fullyParallel: false, // Disabled for DB consistency
  workers: 1, // Serial execution
  timeout: 30000, // 30 second timeout
  retries: process.env.CI ? 2 : 0, // Retry in CI only
  use: {
    baseURL: `http://${frontendHost}:${frontendPort}`,
    trace: 'on-first-retry', // Capture trace on retry
    screenshot: 'only-on-failure', // Screenshot on failure
    video: 'retain-on-failure', // Video on failure
  },
  projects: [
    { name: 'chromium' }, // Test in Chromium only
  ],
});
```

**Environment detection**:

```typescript
const isInsideDocker =
  process.env.RUNNING_IN_DOCKER === 'true' || require('fs').existsSync('/.dockerenv');
const dockerHost = isInsideDocker ? 'host.docker.internal' : 'localhost';
```

**Port defaults**:

```typescript
const frontendPort = process.env.FRONTEND_PORT || '4202';
const backendPort = process.env.BACKEND_PORT || '3001';
const dbPort = process.env.DB_PORT || '5433';
```

### Environment Variables

**Local Docker** (`.env.e2e-local`):

```bash
DB_HOST=localhost
DB_PORT=5433
DB_NAME=st44_test_local
DB_USER=postgres
DB_PASSWORD=postgres
BACKEND_PORT=3001
FRONTEND_PORT=4201
USE_DOCKER_COMPOSE=true
```

**CI** (set in `.github/workflows/e2e.yml`):

```bash
FRONTEND_PORT=4200
FRONTEND_HOST=localhost
BACKEND_PORT=3000
BACKEND_HOST=localhost
DB_HOST=localhost
DB_PORT=55432
DB_NAME=st44_test
DB_USER=postgres
DB_PASSWORD=postgres
USE_DOCKER_COMPOSE=false
CI=true
```

### Docker Compose Configuration

**File**: `docker-compose.e2e-local.yml`

**Services**:

1. **postgres-test** (PostgreSQL 17 Alpine)
   - Container: `st44-postgres-test-local`
   - Port: `5433:5432`
   - Database: `st44_test_local`
   - Health check: `pg_isready`

2. **backend-test**
   - Built from `apps/backend/Dockerfile`
   - Container: `st44-backend-test-local`
   - Port: `3001:3000`
   - Environment: `NODE_ENV=test`, `JWT_SECRET=test-secret-key-local`
   - Depends on: postgres-test (healthy)
   - Health check: `wget` to `/health` endpoint

3. **frontend-test**
   - Image: `node:24-alpine`
   - Container: `st44-frontend-test-local`
   - Port: `4201:4200`
   - Command: `npm start --host 0.0.0.0 --port 4200`
   - Proxy: `proxy.conf.e2e-local.json`
   - Depends on: backend-test (healthy)

**Network**: `e2e-test-network` (bridge)
**Volumes**: `postgres_test_data`, `frontend_node_modules`

### Service Health Checks

**Script**: `apps/frontend/scripts/wait-for-services.js`

**What it does**:

- Polls backend `/health` endpoint
- Polls frontend to check for `app-root` and `main.js`
- Uses exponential backoff (1s → 1.5s → 2.25s → max 5s)
- Timeout: 60 seconds default

**Usage**:

```bash
npm run test:e2e:wait
```

**Environment variables**:

- `E2E_BACKEND_URL` - Backend URL (default: `http://localhost:3001`)
- `E2E_FRONTEND_URL` - Frontend URL (default: `http://localhost:4201`)
- `E2E_TIMEOUT` - Timeout in ms (default: 60000)
- `E2E_POLL_INTERVAL` - Initial poll interval (default: 1000)

---

## CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/e2e.yml`

**Triggers**:

- Manual: `workflow_dispatch`
- Scheduled: Daily at 2 AM UTC (`cron: '0 2 * * *'`)

**Environment**: `ubuntu-latest`, 30-minute timeout

**PostgreSQL Service**:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    ports:
      - 55432:5432
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: st44
    options: --health-cmd pg_isready
```

**Workflow Steps**:

1. Checkout code
2. Setup Node.js 22 with npm cache
3. Install dependencies (`npm ci`)
4. Build types package (`npm run build:types`)
5. Install Playwright browsers (chromium with deps)
6. Build frontend (`ng build`)
7. Build backend (`npm run build:backend`)
8. Initialize database:
   ```bash
   psql -h localhost -p 55432 -U postgres -d postgres -c "CREATE DATABASE st44_test;"
   psql -h localhost -p 55432 -U postgres -d st44_test -f docker/postgres/init.sql
   ```
9. Start backend server (port 3000, background)
10. Wait for backend health check (`/health` endpoint)
11. Start frontend server (port 4200, using `serve`)
12. Wait for frontend readiness
13. Run E2E tests with environment variables:
    ```yaml
    CI: true
    FRONTEND_PORT: 4200
    FRONTEND_HOST: localhost
    BACKEND_PORT: 3000
    BACKEND_HOST: localhost
    DB_HOST: localhost
    DB_PORT: 55432
    DB_NAME: st44_test
    DB_USER: postgres
    DB_PASSWORD: postgres
    USE_DOCKER_COMPOSE: false
    ```
14. Upload test results on failure (7-day retention)
15. Upload test traces on failure (7-day retention)
16. Stop servers (always runs)

### Running E2E Tests Manually in CI

1. Go to [Actions tab](https://github.com/tidemann/st44-home/actions/workflows/e2e.yml)
2. Click "Run workflow"
3. Select branch (usually `main`)
4. Click "Run workflow" button

### Test Artifacts

If tests fail, download artifacts from workflow run:

- **playwright-report**: HTML report with screenshots and results
- **playwright-traces**: Detailed trace files for debugging

**Viewing artifacts**:

1. Navigate to workflow run
2. Scroll to "Artifacts" section
3. Download zip file
4. Extract and view:
   ```bash
   npx playwright show-report    # For reports
   npx playwright show-trace <trace-file>  # For traces
   ```

### Why E2E Tests Are Separate from Main CI

- E2E tests can be slow (5-10 minutes)
- Allows PR merges without waiting for E2E completion
- Can be run on-demand or scheduled
- Reduces main CI pipeline execution time
- Optional quality gate vs. blocking requirement

### Debugging CI Failures

1. **Check workflow logs**:
   - Navigate to failed workflow run
   - Review step logs for errors
   - Check service startup logs

2. **Download artifacts**:
   - Download playwright-report
   - Download playwright-traces
   - View locally with Playwright tools

3. **Run in CI mode locally**:

   ```bash
   CI=true npm run test:e2e
   ```

4. **Check environment differences**:
   - Port configurations
   - Database initialization
   - Service health checks
   - Network connectivity

5. **Common CI-specific issues**:
   - Database not initialized properly
   - Service health checks failing
   - Port conflicts
   - Timing differences (slower in CI)

---

## Service Management

### Starting Services

```bash
npm run test:e2e:start
```

**What it does**:

- Runs `docker compose -f ../../docker-compose.e2e-local.yml up -d`
- Starts PostgreSQL, backend, and frontend containers
- Runs in detached mode (background)

**Wait time**: ~30-60 seconds for all services to become healthy

### Stopping Services

```bash
npm run test:e2e:stop
```

**What it does**:

- Runs `docker compose -f ../../docker-compose.e2e-local.yml down`
- Stops and removes all containers
- Preserves database volume (data persists)

### Restarting Services

```bash
npm run test:e2e:restart
```

**What it does**:

- Equivalent to `npm run test:e2e:stop && npm run test:e2e:start`
- Complete restart of all services

**Use when**: Services in bad state, need fresh environment

### Viewing Service Logs

```bash
npm run test:e2e:logs
```

**What it does**:

- Runs `docker compose -f ../../docker-compose.e2e-local.yml logs -f`
- Shows real-time logs from all services
- Press Ctrl+C to exit

**Use when**: Debugging service issues, checking API errors, database issues

### Resetting Database

```bash
npm run test:e2e:reset
```

**What it does**:

- Runs `docker compose exec -T postgres-test psql -U postgres -d st44_test_local -f /docker-entrypoint-initdb.d/init.sql`
- Re-runs database initialization script
- Truncates all tables with CASCADE
- Resets sequences

**Use when**: Need clean database state, test data corruption

### Manual Service Health Checks

**Backend health**:

```bash
curl http://localhost:3001/health
```

Expected response: `{"status":"ok"}`

**Database connection**:

```bash
docker exec -it st44-postgres-test-local psql -U postgres -d st44_test_local
```

Then run SQL:

```sql
SELECT 1;
\l  -- List databases
\dt -- List tables
\q  -- Quit
```

**Frontend**:

```bash
curl http://localhost:4201
```

Expected response: HTML with `<app-root>` and `main.js`

### Waiting for Services

```bash
npm run test:e2e:wait
```

**What it does**:

- Runs `node scripts/wait-for-services.js`
- Polls backend `/health` endpoint
- Polls frontend for readiness
- Uses exponential backoff
- Timeout after 60 seconds

**Use when**: Starting services manually, ensuring readiness

---

## Troubleshooting

### Port Already in Use

**Symptom**: `Error: bind: address already in use`

**Solution**:

```powershell
# Find process using port (Windows)
netstat -ano | findstr :5433
netstat -ano | findstr :3001
netstat -ano | findstr :4201

# Kill process
taskkill /PID <process_id> /F

# Or change ports in .env.e2e-local
```

**Alternative**: Edit `docker-compose.e2e-local.yml` to use different ports

### Services Won't Start

**Symptom**: Timeout waiting for services to become healthy

**Solutions**:

1. **Check Docker is running**:

   ```bash
   docker ps
   ```

2. **View service logs**:

   ```bash
   npm run test:e2e:logs
   ```

3. **Check backend health manually**:

   ```bash
   curl http://localhost:3001/health
   ```

4. **Restart services**:

   ```bash
   npm run test:e2e:restart
   ```

5. **Verify ports are free** (see "Port Already in Use" above)

6. **Check Docker resources** (CPU, memory, disk space)

### Database Connection Errors

**Symptom**: `Error: connect ECONNREFUSED` or `password authentication failed`

**Solutions**:

1. **Verify database container is running**:

   ```bash
   docker ps | findstr postgres-test
   ```

2. **Check connection manually**:

   ```bash
   docker exec -it st44-postgres-test-local psql -U postgres -d st44_test_local
   ```

3. **Verify environment variables**:

   ```bash
   # Check .env.e2e-local contains:
   DB_HOST=localhost
   DB_PORT=5433
   DB_NAME=st44_test_local
   DB_USER=postgres
   DB_PASSWORD=postgres
   ```

4. **Reset database**:

   ```bash
   npm run test:e2e:reset
   ```

5. **Restart services**:
   ```bash
   npm run test:e2e:restart
   ```

### Tests Timeout

**Symptom**: Tests fail with `Timeout 30000ms exceeded`

**Solutions**:

1. **Increase test timeout**:

   ```typescript
   test('slow operation', async ({ page }) => {
     test.setTimeout(60000); // 60 seconds
     // ...
   });
   ```

2. **Use proper wait strategies**:

   ```typescript
   // Wait for page load
   await page.waitForLoadState('networkidle');

   // Wait for specific element
   await page.waitForSelector('[data-testid="result"]');

   // Wait for API call
   await page.waitForResponse((response) => response.url().includes('/api/households'));
   ```

3. **Check backend logs**:

   ```bash
   npm run test:e2e:logs
   ```

4. **Verify services are healthy**:
   ```bash
   curl http://localhost:3001/health
   ```

### Flaky Tests

**Symptom**: Tests pass sometimes, fail other times

**Solutions**:

1. **Replace fixed timeouts**:

   ```typescript
   // ❌ Bad
   await page.waitForTimeout(2000);

   // ✅ Good
   await page.waitForSelector('[data-testid="loaded"]');
   ```

2. **Add explicit waits**:

   ```typescript
   await page.waitForLoadState('networkidle');
   await page.waitForURL('/dashboard');
   ```

3. **Ensure test independence**:

   ```typescript
   test.beforeEach(async () => {
     await resetDatabase(); // Fresh state
   });
   ```

4. **Check for race conditions**:
   - Multiple API calls completing in different order
   - Database operations not completing before assertions
   - Network requests timing out

5. **Run test multiple times**:
   ```bash
   for i in {1..10}; do npx playwright test e2e/auth/login.spec.ts; done
   ```

### Selector Not Found

**Symptom**: `Error: locator.click: Timeout waiting for selector`

**Solutions**:

1. **Use Playwright UI to pick locator**:

   ```bash
   npm run test:e2e:ui
   ```

2. **Check element exists**:

   ```typescript
   const count = await page.locator('[data-testid="submit"]').count();
   console.log('Element count:', count);
   ```

3. **Use data-testid**:

   ```html
   <button data-testid="submit">Submit</button>
   ```

   ```typescript
   await page.click('[data-testid="submit"]');
   ```

4. **Wait for element**:

   ```typescript
   await page.waitForSelector('[data-testid="submit"]');
   await page.click('[data-testid="submit"]');
   ```

5. **Check DOM state**:
   - Take screenshot: `await page.screenshot({ path: 'debug.png' })`
   - Use Playwright Inspector to inspect DOM

### CI Tests Fail, Local Pass

**Common causes**:

- Port differences (use environment variables)
- Timing differences (add proper waits)
- Database state (ensure test independence)
- Environment variables (match CI config)

**Solutions**:

1. **Run in CI mode locally**:

   ```bash
   CI=true npm run test:e2e
   ```

2. **Match CI ports**:

   ```bash
   FRONTEND_PORT=4200 BACKEND_PORT=3000 DB_PORT=55432 npm run test:e2e
   ```

3. **Check CI logs** for specific errors

4. **Download CI artifacts** (traces, screenshots)

5. **Ensure tests are independent** (not relying on execution order)

### Slow Test Execution

**Symptoms**: Tests take > 5 minutes to run

**Solutions**:

1. **Run fewer browsers**:

   ```bash
   npx playwright test --project=chromium
   ```

2. **Optimize database seeding**:
   - Seed only required data
   - Use `seedMinimalScenario()` instead of `seedFullScenario()`

3. **Skip slow tests during development**:

   ```typescript
   test.skip('slow test', async ({ page }) => {
     // ...
   });
   ```

4. **Avoid unnecessary UI interactions**:
   - Use API for setup when possible
   - Login programmatically vs. UI login

### Browser Not Found

**Symptom**: "Executable doesn't exist at..."

**Solutions**:

1. **Reinstall Playwright browsers**:

   ```bash
   cd apps/frontend
   npx playwright install chromium
   ```

2. **Clear npm cache and reinstall**:

   ```bash
   npm cache clean --force
   npm ci
   ```

3. **Install with dependencies**:
   ```bash
   npx playwright install chromium --with-deps
   ```

### Playwright Extension Not Working (VS Code)

**Symptom**: Tests don't appear in VS Code Test Explorer

**Solutions**:

1. **Install Playwright extension**:
   - Open Extensions (Ctrl+Shift+X)
   - Search "Playwright"
   - Install "Playwright Test for VSCode"

2. **Reload VS Code**:
   - Press Ctrl+Shift+P
   - Type "Reload Window"

3. **Check workspace is opened at root**:
   - VS Code should be opened at `st44-home/` directory
   - Not at `apps/frontend/`

4. **Check Playwright config exists**:
   - Verify `apps/frontend/playwright.config.ts` exists
   - Verify `testDir` points to `./e2e`

---

## Reference

### Complete NPM Scripts

All commands run from `apps/frontend/` directory:

| Command                    | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| `npm run test:e2e`         | Run tests using environment variables (for CI)       |
| `npm run test:e2e:local`   | Run tests with local docker ports (3001, 4201, 5433) |
| `npm run test:e2e:full`    | **Complete workflow** - start → wait → test → stop   |
| `npm run test:e2e:headed`  | Run with browser visible                             |
| `npm run test:e2e:debug`   | Run in debug mode with Playwright Inspector          |
| `npm run test:e2e:ui`      | **Playwright UI mode** - interactive test explorer   |
| `npm run test:e2e:report`  | View HTML test report                                |
| `npm run test:e2e:start`   | Start Docker Compose services                        |
| `npm run test:e2e:stop`    | Stop Docker Compose services                         |
| `npm run test:e2e:restart` | Restart services                                     |
| `npm run test:e2e:wait`    | Wait for services to be ready                        |
| `npm run test:e2e:logs`    | View service logs                                    |
| `npm run test:e2e:reset`   | Reset test database                                  |

### VS Code Tasks

Available in `.vscode/tasks.json`:

- **Start E2E Services**
- **Stop E2E Services**
- **Restart E2E Services**
- **View E2E Service Logs**
- **Reset E2E Database**

### VS Code Launch Configurations

Available in `.vscode/launch.json`:

- **Debug E2E Tests** - Run all tests with debugger (auto-starts services)
- **Debug Current E2E Test** - Debug currently open test file
- **Debug E2E with Inspector** - Playwright UI for selector debugging
- **Debug E2E (Services Already Running)** - Skip service startup

### Test Helper Functions

**Auth Helpers** (`e2e/helpers/auth-helpers.ts`):

- `loginAsUser(page, email, password)` - Basic login
- `loginAsParent(page, email, password)` - Parent role login
- `loginAsChild(page, childName)` - Switch to child profile
- `registerUser(page, email, password)` - Registration flow
- `logout(page)` - Logout and clear tokens
- `isAuthenticated(page)` - Check auth status
- `getAccessToken(page)` - Get JWT token

**Database Helpers** (`e2e/helpers/seed-database.ts`):

- `seedTestUser(data)` - Create single user
- `seedTestHousehold(data)` - Create household with owner
- `seedTestChild(data)` - Create single child
- `seedTestTasks(data)` - Create multiple tasks
- `seedTestData(config)` - Complete scenario (user, household, children, tasks)
- `resetDatabase()` - Truncate all tables with CASCADE

**API Helpers** (`e2e/helpers/api-helpers.ts`):

- `apiRequest<T>(method, path, data)` - Authenticated API call
- `createAuthenticatedUser(email, password)` - Register + login via API
- `createApiHousehold(name, ownerId)` - Create household via API
- `createApiChild(data)` - Create child via API
- `createApiTask(data)` - Create task via API
- `createCompleteScenario(config)` - Full data setup via API
- `dbQuery<T>(sql, params)` - Direct database queries
- `verifyUserExists(email)` - Check user in DB
- `getUserIdByEmail(email)` - Get user ID from email

**Test Helpers** (`e2e/helpers/test-helpers.ts`):

- `generateTestEmail()` - Unique email with timestamp
- `generateTestPassword()` - Valid test password
- `waitFor(condition, options)` - Polling utility
- `resetTestDatabase()` - Truncate all tables

### File Locations

| Path                                         | Purpose                                      |
| -------------------------------------------- | -------------------------------------------- |
| `apps/frontend/e2e/`                         | All test spec files                          |
| `apps/frontend/e2e/pages/`                   | Page objects (POM)                           |
| `apps/frontend/e2e/helpers/`                 | Test utilities                               |
| `apps/frontend/playwright.config.ts`         | Playwright configuration                     |
| `docker-compose.e2e-local.yml`               | Local Docker services                        |
| `.env.e2e-local`                             | Local environment variables                  |
| `.github/workflows/e2e.yml`                  | CI workflow                                  |
| `apps/frontend/scripts/wait-for-services.js` | Health check script                          |
| `apps/frontend/proxy.conf.e2e-local.json`    | Proxy configuration for local testing        |
| `apps/frontend/test-results/`                | Test artifacts (screenshots, videos, traces) |
| `apps/frontend/playwright-report/`           | HTML test reports                            |
| `docker/postgres/test-seeds/`                | SQL seed files                               |

### Test Seed Data

**Location**: `docker/postgres/test-seeds/`

**Files**:

- `01-users.sql` - Sample users
- `02-households.sql` - Sample households
- `03-children.sql` - Sample children
- `04-tasks.sql` - Sample tasks

**Credentials**:

- Parent: `parent@test.com` / `SecureTestPass123!`
- Another user: `test@example.com` / `SecureTestPass123!`

**Loading seed files**:

```powershell
# Windows PowerShell
Get-ChildItem docker/postgres/test-seeds/*.sql | Sort-Object Name | ForEach-Object {
  Get-Content $_.FullName | docker exec -i st44-postgres-test-local psql -U postgres -d st44_test_local
}
```

### External Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)

### Getting Help

1. Check this documentation
2. Use Playwright UI mode for exploration (`npm run test:e2e:ui`)
3. Review test error messages and stack traces
4. Check service logs (`npm run test:e2e:logs`)
5. Use the E2E skill (`/e2e`) for interactive assistance
6. Consult the E2E agent (`.claude/agents/e2e-agent.md`)
7. Check [Playwright GitHub Issues](https://github.com/microsoft/playwright/issues)

---

**Last Updated**: 2026-01-01
**Maintained by**: Engineering Team
