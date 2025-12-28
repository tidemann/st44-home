import { test, expect } from '@playwright/test';
import { TasksPage, TaskFilter } from '../pages/tasks.page';
import { loginAsUser } from '../helpers/auth-helpers';
import { seedFullScenario, resetDatabase } from '../helpers/seed-database';

/**
 * E2E Tests for the Tasks screen
 *
 * Tests the redesigned tasks management with:
 * - Filter tabs (All, My Tasks, By Person, Completed)
 * - Task listing and display
 * - Task completion from tasks screen
 * - Task editing and updates
 * - URL query params for filter persistence
 */
test.describe('Tasks Screen - Filters', () => {
  let scenario: Awaited<ReturnType<typeof seedFullScenario>>;

  test.beforeEach(async () => {
    await resetDatabase();
    scenario = await seedFullScenario({
      userEmail: 'tasks-test@example.com',
      userPassword: 'SecureTestPass123!',
      householdName: 'Test Tasks Family',
      childrenCount: 2,
      tasksCount: 5,
    });
  });

  test('displays filter tabs', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await tasksPage.waitForTasksLoad();

    // All filter tabs should be visible
    await expect(tasksPage.filterAll).toBeVisible();
    await expect(tasksPage.filterMine).toBeVisible();
    await expect(tasksPage.filterByPerson).toBeVisible();
    await expect(tasksPage.filterCompleted).toBeVisible();
  });

  test('defaults to All filter', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await tasksPage.waitForTasksLoad();

    // All filter should be active by default
    const activeFilter = await tasksPage.getActiveFilter();
    expect(activeFilter).toBe('all');
  });

  test('can switch to My Tasks filter', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await tasksPage.waitForTasksLoad();

    await tasksPage.selectFilter('mine');

    // Should show empty state or filtered tasks (no tasks assigned to current user by default)
    // URL should update with filter param
    expect(page.url()).toContain('filter=mine');
  });

  test('can switch to Completed filter', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await tasksPage.waitForTasksLoad();

    await tasksPage.selectFilter('completed');

    // URL should update with filter param
    expect(page.url()).toContain('filter=completed');

    // Should show empty state (no completed tasks yet)
    const taskCount = await tasksPage.getTaskCount();
    expect(taskCount).toBe(0);
  });

  test('persists filter in URL query params', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await tasksPage.waitForTasksLoad();

    // Switch to completed filter
    await tasksPage.selectFilter('completed');

    // Reload the page
    await page.reload();
    await tasksPage.waitForTasksLoad();

    // Filter should be restored from URL
    const activeFilter = await tasksPage.getActiveFilter();
    expect(activeFilter).toBe('completed');
  });

  test('All filter shows all active tasks', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await tasksPage.waitForTasksLoad();

    await tasksPage.selectFilter('all');

    // Should show all seeded tasks (5)
    const taskCount = await tasksPage.getTaskCount();
    expect(taskCount).toBe(5);
  });

  test('shows empty state message when no tasks match filter', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await tasksPage.waitForTasksLoad();

    // Switch to completed filter (should be empty)
    await tasksPage.selectFilter('completed');

    // Empty state should be shown
    const isEmpty = await tasksPage.isEmptyStateVisible();
    expect(isEmpty).toBe(true);

    const message = await tasksPage.getEmptyStateMessage();
    expect(message).toContain('No');
  });
});

test.describe('Tasks Screen - Task Display', () => {
  let scenario: Awaited<ReturnType<typeof seedFullScenario>>;

  test.beforeEach(async () => {
    await resetDatabase();
    scenario = await seedFullScenario({
      userEmail: 'task-display@example.com',
      userPassword: 'SecureTestPass123!',
      tasksCount: 3,
    });
  });

  test('displays task cards with name', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await tasksPage.waitForTasksLoad();

    // Should have task cards
    const taskCount = await tasksPage.getTaskCount();
    expect(taskCount).toBeGreaterThan(0);

    // First task should be visible
    const firstCard = tasksPage.taskCards.first();
    await expect(firstCard).toBeVisible();
  });

  test('can get list of visible task names', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await tasksPage.waitForTasksLoad();

    const taskNames = await tasksPage.getVisibleTaskNames();

    // Should have task names from seeded data
    expect(taskNames.length).toBeGreaterThan(0);
    expect(taskNames.some((name) => name.includes('Clean') || name.includes('Homework'))).toBe(
      true,
    );
  });

  test('can check if specific task is visible', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await tasksPage.waitForTasksLoad();

    // Check for one of the seeded tasks
    const isCleanRoomVisible = await tasksPage.isTaskVisible('Clean Room');
    expect(isCleanRoomVisible).toBe(true);
  });
});

test.describe('Tasks Screen - Task Actions', () => {
  let scenario: Awaited<ReturnType<typeof seedFullScenario>>;

  test.beforeEach(async () => {
    await resetDatabase();
    scenario = await seedFullScenario({
      userEmail: 'task-actions@example.com',
      userPassword: 'SecureTestPass123!',
      tasksCount: 3,
    });
  });

  test('can open task for editing', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await tasksPage.waitForTasksLoad();

    // Open first task for editing
    await tasksPage.openTaskForEdit('Clean Room');

    // Edit modal should appear
    await expect(tasksPage.editTaskModal).toBeVisible();
  });

  test('edit modal shows task details', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await tasksPage.waitForTasksLoad();

    await tasksPage.openTaskForEdit('Clean Room');

    // Modal should have name input with task name
    await expect(tasksPage.editTaskNameInput).toBeVisible();
    const nameValue = await tasksPage.editTaskNameInput.inputValue();
    expect(nameValue).toContain('Clean Room');
  });

  test('can close edit modal without saving', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await tasksPage.waitForTasksLoad();

    await tasksPage.openTaskForEdit('Clean Room');
    await expect(tasksPage.editTaskModal).toBeVisible();

    await tasksPage.closeEditModal();
    await expect(tasksPage.editTaskModal).toBeHidden();
  });

  test.skip('can update task name', async ({ page }) => {
    // Note: Skipped - requires full API integration
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await tasksPage.waitForTasksLoad();

    await tasksPage.openTaskForEdit('Clean Room');

    await tasksPage.updateTask({ name: 'Clean Room Updated' });

    // Updated task should be visible
    await expect(tasksPage.getTaskCardByName('Clean Room Updated')).toBeVisible();
  });

  test.skip('can delete task', async ({ page }) => {
    // Note: Skipped - requires full API integration
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await tasksPage.waitForTasksLoad();

    const initialCount = await tasksPage.getTaskCount();

    await tasksPage.deleteTask('Clean Room');

    // Task count should decrease
    const newCount = await tasksPage.getTaskCount();
    expect(newCount).toBe(initialCount - 1);

    // Deleted task should not be visible
    await expect(tasksPage.getTaskCardByName('Clean Room')).toBeHidden();
  });
});

test.describe('Tasks Screen - Responsive', () => {
  let scenario: Awaited<ReturnType<typeof seedFullScenario>>;

  test.beforeEach(async () => {
    await resetDatabase();
    scenario = await seedFullScenario({
      userEmail: 'responsive@example.com',
      userPassword: 'SecureTestPass123!',
      tasksCount: 3,
    });
  });

  test('displays correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await tasksPage.waitForTasksLoad();

    // Filter tabs should still be visible
    await expect(tasksPage.filterAll).toBeVisible();

    // Tasks should be visible
    const taskCount = await tasksPage.getTaskCount();
    expect(taskCount).toBeGreaterThan(0);
  });

  test('displays correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await tasksPage.waitForTasksLoad();

    // Filter tabs should be visible
    await expect(tasksPage.filterTabs).toBeVisible();

    // Tasks should be visible
    const taskCount = await tasksPage.getTaskCount();
    expect(taskCount).toBeGreaterThan(0);
  });

  test('displays correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await tasksPage.waitForTasksLoad();

    // All elements should be visible on desktop
    await expect(tasksPage.filterAll).toBeVisible();
    await expect(tasksPage.taskCards.first()).toBeVisible();
  });
});

test.describe('Tasks Screen - Loading States', () => {
  test('handles loading state', async ({ page }) => {
    await resetDatabase();
    const scenario = await seedFullScenario({
      userEmail: 'loading@example.com',
      userPassword: 'SecureTestPass123!',
    });

    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const tasksPage = new TasksPage(page);
    await page.goto('/household/all-tasks');

    // Wait for load to complete
    await tasksPage.waitForTasksLoad();

    // After loading, should not show error
    const hasError = await tasksPage.hasError();
    expect(hasError).toBe(false);
  });
});
