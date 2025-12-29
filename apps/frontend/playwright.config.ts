import { defineConfig, devices } from '@playwright/test';

// Environment variables for local E2E testing
// Detect if running inside Docker (claude-code-sandbox) vs host machine
// host.docker.internal is needed when running from inside a Docker container
const isInsideDocker =
  process.env.RUNNING_IN_DOCKER === 'true' || require('fs').existsSync('/.dockerenv');
const dockerHost = isInsideDocker ? 'host.docker.internal' : 'localhost';

// These defaults work when running via npm scripts (which set explicit values)
// or when running playwright directly (uses these defaults for docker environment)
const frontendPort = process.env.FRONTEND_PORT || '4202'; // Local docker: 4202, CI: 4200
// For frontend, use localhost since both Playwright and e2e-server are in the same container
const frontendHost = process.env.FRONTEND_HOST || 'localhost';
const baseURL = `http://${frontendHost}:${frontendPort}`;

// Set environment defaults for test helpers if not already set
if (!process.env.BACKEND_PORT) {
  process.env.BACKEND_PORT = '3001'; // Local docker: 3001, CI: 3000
}
if (!process.env.BACKEND_HOST) {
  process.env.BACKEND_HOST = dockerHost;
}
if (!process.env.DB_PORT) {
  process.env.DB_PORT = '5433'; // Local docker: 5433, CI: 55432
}
if (!process.env.DB_HOST) {
  process.env.DB_HOST = dockerHost;
}
if (!process.env.DB_NAME) {
  process.env.DB_NAME = 'st44_test_local'; // Local docker: st44_test_local, CI: st44_test
}
if (!process.env.USE_DOCKER_COMPOSE) {
  process.env.USE_DOCKER_COMPOSE = 'true';
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // CRITICAL: Disabled for E2E tests that share database state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run tests serially to avoid database conflicts with resetTestDatabase()
  reporter: process.env.CI ? [['list'], ['html']] : 'html',
  timeout: 30000,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Don't start webServer if using docker-compose (local E2E) or CI
  webServer:
    process.env.CI || process.env.USE_DOCKER_COMPOSE
      ? undefined
      : {
          command: 'npm run start',
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120000,
        },
});
