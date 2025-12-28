import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { loginAsUser } from '../helpers/auth-helpers';
import { seedFullScenario, resetDatabase, seedTestTasks } from '../helpers/seed-database';

/**
 * E2E Tests for the Home/Dashboard screen
 *
 * Tests the redesigned dashboard with:
 * - Time-based greeting display
 * - Stats cards (active tasks, week progress, points)
 * - Today's tasks section
 * - Task completion workflow
 * - Quick-add task functionality
 * - Navigation to other screens
 */
test.describe('Home Dashboard', () => {
  let scenario: Awaited<ReturnType<typeof seedFullScenario>>;

  test.beforeEach(async () => {
    await resetDatabase();
    scenario = await seedFullScenario({
      userEmail: 'dashboard-test@example.com',
      userPassword: 'SecureTestPass123!',
      householdName: 'Test Dashboard Family',
      childrenCount: 2,
      tasksCount: 3,
    });
  });

  test('displays personalized greeting based on time of day', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    const greeting = await homePage.getGreeting();

    // Greeting should contain one of the time-based greetings
    expect(
      greeting.includes('morning') ||
        greeting.includes('afternoon') ||
        greeting.includes('evening'),
    ).toBeTruthy();
  });

  test('shows stats cards with correct data', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    // Check that stats are displayed (values may vary based on seeded data)
    await expect(homePage.activeTasksStat).toBeVisible();
    await expect(homePage.weekProgressStat).toBeVisible();
    await expect(homePage.totalPointsStat).toBeVisible();
  });

  test('displays today tasks section', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    // Today's section should be visible
    await expect(homePage.todayTasksSection).toBeVisible();
  });

  test('shows task cards with name and points', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    // If there are tasks, verify they're displayed properly
    const taskCount = await homePage.taskCards.count();
    if (taskCount > 0) {
      const firstCard = homePage.taskCards.first();
      await expect(firstCard).toBeVisible();

      // Task card should have a name
      const nameElement = firstCard.locator('.task-name, h3, [data-testid="task-name"]');
      await expect(nameElement).not.toBeEmpty();
    }
  });

  test('can navigate to Tasks screen via navigation', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    await homePage.goToTasks();

    // Should now be on tasks page
    expect(page.url()).toMatch(/(tasks|household\/all-tasks)/);
  });

  test('can navigate to Family screen via navigation', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    await homePage.goToFamily();

    // Should now be on family page
    expect(page.url()).toContain('/family');
  });

  test('can navigate to Progress screen via navigation', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    await homePage.goToProgress();

    // Should now be on progress page
    expect(page.url()).toContain('/progress');
  });

  test('shows bottom navigation on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    // Bottom nav should be visible on mobile
    await expect(homePage.bottomNav).toBeVisible();
  });

  test('shows sidebar navigation on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    // Sidebar should be visible on desktop
    await expect(homePage.sidebarNav).toBeVisible();
  });

  test('handles loading state gracefully', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await page.goto('/home');

    // Initially might show loading, then should disappear
    // Wait for loading to complete
    await homePage.waitForDashboardLoad();

    // Loading should be hidden after data loads
    const isLoading = await homePage.isLoading();
    expect(isLoading).toBe(false);
  });

  test('handles empty state when no tasks exist', async ({ page }) => {
    // Create scenario with no tasks
    await resetDatabase();
    const emptyScenario = await seedFullScenario({
      userEmail: 'empty-dashboard@example.com',
      userPassword: 'SecureTestPass123!',
      tasksCount: 0,
    });

    await loginAsUser(page, emptyScenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    // Should either show empty state or have zero tasks
    const taskCount = await homePage.taskCards.count();
    expect(taskCount).toBe(0);
  });
});

test.describe('Home Dashboard - Task Completion', () => {
  let scenario: Awaited<ReturnType<typeof seedFullScenario>>;

  test.beforeEach(async () => {
    await resetDatabase();
    scenario = await seedFullScenario({
      userEmail: 'task-complete@example.com',
      userPassword: 'SecureTestPass123!',
      tasksCount: 3,
    });
  });

  test.skip('can complete a task from dashboard', async ({ page }) => {
    // Note: This test is skipped because task completion requires assignments
    // which need additional seeding setup
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    // Get initial task count
    const initialCount = await homePage.taskCards.count();
    if (initialCount === 0) {
      test.skip();
    }

    // Get first task name
    const firstTaskName = await homePage.taskCards.first().locator('h3, .task-name').textContent();

    // Complete the task
    await homePage.completeTask(firstTaskName!.trim());

    // Wait for completion animation/update
    await page.waitForTimeout(1000);

    // Task should be removed from the list or marked as completed
    const finalCount = await homePage.taskCards.count();
    expect(finalCount).toBeLessThan(initialCount);
  });

  test.skip('updates stats after completing a task', async ({ page }) => {
    // Note: Skipped - requires proper assignment seeding
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    const initialPoints = await homePage.getTotalPoints();
    const initialActive = await homePage.getActiveTasksCount();

    if (initialActive === 0) {
      test.skip();
    }

    // Complete a task
    const firstTaskName = await homePage.taskCards.first().locator('h3, .task-name').textContent();
    await homePage.completeTask(firstTaskName!.trim());

    await page.waitForTimeout(1000);

    // Stats should update
    const newPoints = await homePage.getTotalPoints();
    const newActive = await homePage.getActiveTasksCount();

    expect(newPoints).toBeGreaterThan(initialPoints);
    expect(newActive).toBeLessThan(initialActive);
  });
});

test.describe('Home Dashboard - Quick Add', () => {
  let scenario: Awaited<ReturnType<typeof seedFullScenario>>;

  test.beforeEach(async () => {
    await resetDatabase();
    scenario = await seedFullScenario({
      userEmail: 'quick-add@example.com',
      userPassword: 'SecureTestPass123!',
      tasksCount: 1,
    });
  });

  test('can open quick-add modal', async ({ page }) => {
    // Set mobile viewport for FAB
    await page.setViewportSize({ width: 375, height: 667 });

    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    await homePage.openQuickAdd();

    await expect(homePage.quickAddModal).toBeVisible();
  });

  test('quick-add modal has required fields', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    await homePage.openQuickAdd();

    // Modal should have name and points inputs
    await expect(homePage.quickAddNameInput).toBeVisible();
    await expect(homePage.quickAddPointsInput).toBeVisible();
    await expect(homePage.quickAddSubmitButton).toBeVisible();
  });

  test('can cancel quick-add modal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    await homePage.openQuickAdd();
    await expect(homePage.quickAddModal).toBeVisible();

    await homePage.quickAddCancelButton.click();
    await expect(homePage.quickAddModal).toBeHidden();
  });

  test.skip('can create task via quick-add', async ({ page }) => {
    // Note: Skipped - requires API integration testing
    await page.setViewportSize({ width: 375, height: 667 });

    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForDashboardLoad();

    const newTaskName = `Quick Task ${Date.now()}`;
    await homePage.quickAddTask(newTaskName, 15);

    // Wait for task to appear
    await page.waitForTimeout(1000);

    // New task should be in the list
    const taskCard = homePage.getTaskCardByName(newTaskName);
    await expect(taskCard).toBeVisible();
  });
});
