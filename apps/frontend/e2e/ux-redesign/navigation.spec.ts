import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { loginAsUser } from '../helpers/auth-helpers';
import { seedFullScenario, resetDatabase } from '../helpers/seed-database';

/**
 * E2E Tests for Navigation
 *
 * Tests navigation between screens:
 * - Bottom nav on mobile
 * - Sidebar nav on desktop
 * - URL routing
 * - Active state highlighting
 */
test.describe('Navigation - Mobile (Bottom Nav)', () => {
  let scenario: Awaited<ReturnType<typeof seedFullScenario>>;

  test.beforeEach(async ({ page }) => {
    await resetDatabase();
    scenario = await seedFullScenario({
      userEmail: 'nav-mobile@example.com',
      userPassword: 'SecureTestPass123!',
    });

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('bottom nav is visible on mobile', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    await expect(homePage.bottomNav).toBeVisible();
  });

  test('has all navigation items', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    await expect(homePage.navHomeButton).toBeVisible();
    await expect(homePage.navTasksButton).toBeVisible();
    await expect(homePage.navFamilyButton).toBeVisible();
    await expect(homePage.navProgressButton).toBeVisible();
  });

  test('navigates to tasks screen', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    await homePage.goToTasks();

    expect(page.url()).toMatch(/(tasks|household\/all-tasks)/);
  });

  test('navigates to family screen', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    await homePage.goToFamily();

    expect(page.url()).toContain('/family');
  });

  test('navigates to progress screen', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    await homePage.goToProgress();

    expect(page.url()).toContain('/progress');
  });

  test('can navigate back to home', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    // Navigate away
    await homePage.goToTasks();
    expect(page.url()).not.toContain('/home');

    // Navigate back home
    await homePage.navHomeButton.click();
    await page.waitForURL(/\/home/);

    expect(page.url()).toContain('/home');
  });
});

test.describe('Navigation - Desktop (Sidebar Nav)', () => {
  let scenario: Awaited<ReturnType<typeof seedFullScenario>>;

  test.beforeEach(async ({ page }) => {
    await resetDatabase();
    scenario = await seedFullScenario({
      userEmail: 'nav-desktop@example.com',
      userPassword: 'SecureTestPass123!',
    });

    // Set desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('sidebar nav is visible on desktop', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    await expect(homePage.sidebarNav).toBeVisible();
  });

  test('navigates to tasks screen from sidebar', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    await homePage.goToTasks();

    expect(page.url()).toMatch(/(tasks|household\/all-tasks)/);
  });

  test('navigates to family screen from sidebar', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    await homePage.goToFamily();

    expect(page.url()).toContain('/family');
  });

  test('navigates to progress screen from sidebar', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    await homePage.goToProgress();

    expect(page.url()).toContain('/progress');
  });
});

test.describe('Navigation - Responsive Transition', () => {
  let scenario: Awaited<ReturnType<typeof seedFullScenario>>;

  test.beforeEach(async () => {
    await resetDatabase();
    scenario = await seedFullScenario({
      userEmail: 'nav-responsive@example.com',
      userPassword: 'SecureTestPass123!',
    });
  });

  test('shows bottom nav on mobile, hides sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    await expect(homePage.bottomNav).toBeVisible();

    // Sidebar should be hidden on mobile
    const sidebarVisible = await homePage.sidebarNav.isVisible();
    expect(sidebarVisible).toBe(false);
  });

  test('shows sidebar on desktop, hides bottom nav', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    await expect(homePage.sidebarNav).toBeVisible();

    // Bottom nav should be hidden on desktop
    const bottomNavVisible = await homePage.bottomNav.isVisible();
    expect(bottomNavVisible).toBe(false);
  });

  test('navigation works across viewport changes', async ({ page }) => {
    // Start on mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    // Navigate using mobile nav
    await homePage.goToTasks();
    expect(page.url()).toMatch(/(tasks|household\/all-tasks)/);

    // Switch to desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500); // Wait for layout change

    // Navigate using sidebar
    await homePage.navHomeButton.click();
    await page.waitForURL(/\/home/);

    expect(page.url()).toContain('/home');
  });
});

test.describe('Navigation - Direct URL Access', () => {
  let scenario: Awaited<ReturnType<typeof seedFullScenario>>;

  test.beforeEach(async () => {
    await resetDatabase();
    scenario = await seedFullScenario({
      userEmail: 'nav-direct@example.com',
      userPassword: 'SecureTestPass123!',
    });
  });

  test('can access home directly via URL', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    await page.goto('/home');

    expect(page.url()).toContain('/home');
  });

  test('can access tasks directly via URL', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    await page.goto('/household/all-tasks');

    expect(page.url()).toContain('/household/all-tasks');
  });

  test('can access family directly via URL', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    await page.goto('/family');

    expect(page.url()).toContain('/family');
  });

  test('can access progress directly via URL', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    await page.goto('/progress');

    expect(page.url()).toContain('/progress');
  });

  test('redirects unauthenticated users to login', async ({ page }) => {
    // Try to access protected route without logging in
    await page.goto('/home');

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });
});
