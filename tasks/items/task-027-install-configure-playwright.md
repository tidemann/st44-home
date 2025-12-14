# Task: Install and Configure Playwright

## Metadata
- **ID**: task-027
- **Feature**: feature-006 - E2E Testing Infrastructure
- **Epic**: epic-006 - Testing & Quality Assurance Infrastructure
- **Status**: in-progress
- **Priority**: high
- **Created**: 2025-12-14
- **Assigned Agent**: frontend + testing
- **Estimated Duration**: 4-6 hours

## Description
Install Playwright testing framework in the Angular frontend application and configure it for E2E testing. Set up proper TypeScript configuration, test directory structure, and base configuration for running tests locally and in CI.

## Requirements
- Install Playwright dependencies (`@playwright/test`)
- Install Playwright browsers (Chromium, Firefox)
- Create `playwright.config.ts` with proper settings
- Set up test directory structure (`apps/frontend/e2e/`)
- Configure scripts in `package.json` for running tests
- Create example "hello world" test to verify setup
- Support both headless and headed test modes
- Configure test reporter (HTML reports)
- Set up trace and screenshot capture

## Acceptance Criteria
- [ ] `@playwright/test` installed in `apps/frontend/package.json`
- [ ] Playwright browsers installed (Chromium, Firefox)
- [ ] `apps/frontend/playwright.config.ts` created with proper configuration
- [ ] Test directory created: `apps/frontend/e2e/`
- [ ] npm scripts added: `test:e2e`, `test:e2e:headed`, `test:e2e:debug`
- [ ] Example test file created and passing: `e2e/example.spec.ts`
- [ ] Tests can run headless: `npm run test:e2e`
- [ ] Tests can run headed: `npm run test:e2e:headed`
- [ ] HTML test report generated in `playwright-report/`
- [ ] Screenshots captured on test failure
- [ ] Trace files generated for debugging
- [ ] Configuration includes timeout settings (30s per test)
- [ ] Configuration includes retry logic (2 retries in CI)
- [ ] Base URL configured: `http://localhost:4200`
- [ ] Documentation added to README about running E2E tests

## Dependencies
- None (foundational setup)

## Technical Notes

### Installation Commands
```bash
cd apps/frontend
npm install --save-dev @playwright/test
npx playwright install chromium firefox
```

### Playwright Config (`apps/frontend/playwright.config.ts`)
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30000, // 30 seconds per test
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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
    timeout: 120000, // 2 minutes to start dev server
  },
});
```

### Directory Structure
```
apps/frontend/
├── e2e/
│   ├── example.spec.ts         # Hello world test
│   ├── pages/                  # Page objects (future)
│   └── helpers/                # Test utilities (future)
├── playwright.config.ts
└── playwright-report/          # Generated HTML reports
```

### Example Test (`e2e/example.spec.ts`)
```typescript
import { test, expect } from '@playwright/test';

test.describe('Example Test Suite', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    
    // Verify page loads
    await expect(page).toHaveTitle(/St44 Home/i);
    
    // Verify some content exists
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/');
    
    // Look for registration link (adjust based on actual UI)
    const registerLink = page.getByRole('link', { name: /register|sign up/i });
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/\/auth\/register/);
    }
  });
});
```

### Package.json Scripts
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report"
  }
}
```

### .gitignore Additions
```
# Playwright
/playwright-report/
/playwright/.cache/
/test-results/
```

## Affected Areas
- [x] Frontend (Angular application)
- [ ] Backend
- [ ] Database
- [ ] Infrastructure
- [ ] CI/CD (will be added in task-034)
- [x] Documentation

## Implementation Plan

### Phase 1: Installation (1 hour)
1. Navigate to `apps/frontend`
2. Install `@playwright/test` as dev dependency
3. Install Playwright browsers: `npx playwright install chromium firefox`
4. Verify installation: `npx playwright --version`

### Phase 2: Configuration (2 hours)
1. Create `playwright.config.ts` with configuration above
2. Create `e2e/` directory
3. Add test scripts to `package.json`
4. Update `.gitignore` with Playwright artifacts
5. Create example test file

### Phase 3: Testing & Verification (1-2 hours)
1. Run example test headless: `npm run test:e2e`
2. Verify HTML report generated
3. Run headed mode: `npm run test:e2e:headed`
4. Test debug mode: `npm run test:e2e:debug`
5. Verify screenshots captured on failure
6. Verify trace files work

### Phase 4: Documentation (30 min - 1 hour)
1. Update `apps/frontend/README.md` with E2E test instructions
2. Document how to run tests locally
3. Document troubleshooting steps
4. Add examples of common commands

## Progress Log
- [2025-12-14 03:05] Status set to in-progress; implementation plan confirmed
- [2025-12-14 03:05] Branch created: feature/task-027-playwright-setup

## Testing Strategy
- Verify example test passes
- Verify test can be run in different modes (headless, headed, debug)
- Verify failure scenarios capture screenshots
- Verify HTML report is generated and viewable

## Review Notes
[To be filled during review]

## Related PRs
[To be filled during implementation]

## Lessons Learned
[To be filled after completion]
