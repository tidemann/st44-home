import { defineConfig, devices } from '@playwright/test';

const frontendPort = process.env.FRONTEND_PORT || '4200';
const frontendHost = process.env.FRONTEND_HOST || 'localhost';
const baseURL = `http://${frontendHost}:${frontendPort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
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
