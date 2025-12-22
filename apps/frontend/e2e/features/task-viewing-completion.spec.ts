import { test, expect, Page } from '@playwright/test';
import { loginAsParent, loginAsChild } from '../helpers/auth-helpers';
import { resetDatabase, seedTestData } from '../helpers/seed-database';

// Test data
const TEST_PARENT = {
  email: 'parent-task-view@test.com',
  password: 'Test1234!',
  name: 'Parent Task View',
};

const TEST_CHILDREN = [
  { name: 'Emma', age: 10 },
  { name: 'Noah', age: 8 },
];

const TEST_TASKS = [
  {
    title: 'Feed the dog',
    description: 'Give food and water to Buddy',
    rule_type: 'daily',
  },
  {
    title: 'Take out trash',
    description: 'Take trash bins to curb',
    rule_type: 'repeating',
    days_of_week: [1, 3, 5], // Mon, Wed, Fri
  },
  {
    title: 'Clean room',
    description: 'Vacuum and tidy bedroom',
    rule_type: 'weekly_rotation',
  },
];

test.describe('Task Viewing and Completion - Child Perspective', () => {
  let householdId: string;
  let childId: string;
  let assignmentId: string;

  test.beforeEach(async ({ page }) => {
    // Reset database and seed with test data
    await resetDatabase();
    const testData = await seedTestData({
      parent: TEST_PARENT,
      children: TEST_CHILDREN,
      tasks: TEST_TASKS,
    });

    householdId = testData.householdId;
    childId = testData.children[0].id; // Emma
    assignmentId = testData.assignments[0].id;

    // Login as Emma (child)
    await loginAsChild(page, TEST_PARENT.email, TEST_PARENT.password, childId);
  });

  test("should display today's tasks for child", async ({ page }) => {
    // Navigate to child dashboard
    await page.goto('/dashboard');

    // Should see today's date in header
    const todayHeader = page.locator('h2', { hasText: /Today's Tasks/ });
    await expect(todayHeader).toBeVisible();

    // Should see at least one task
    const taskCards = page.locator('[data-testid="task-card"]');
    await expect(taskCards).toHaveCount(1); // Daily task for today

    // Task should show title and description
    await expect(page.locator('[data-testid="task-title"]').first()).toContainText('Feed the dog');
    await expect(page.locator('[data-testid="task-description"]').first()).toContainText(
      'Give food and water',
    );
  });

  test('should mark task as complete', async ({ page }) => {
    await page.goto('/dashboard');

    // Click complete button
    const completeButton = page.locator('[data-testid="complete-button"]').first();
    await completeButton.click();

    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Task completed!');

    // Task should show completed status
    const taskCard = page.locator('[data-testid="task-card"]').first();
    await expect(taskCard).toHaveClass(/completed/);

    // Complete button should be disabled or hidden
    await expect(completeButton).toBeDisabled();
  });

  test('should show visual indicators for task status', async ({ page }) => {
    await page.goto('/dashboard');

    // Pending task should have pending indicator
    const pendingTask = page.locator('[data-testid="task-card"][data-status="pending"]').first();
    await expect(pendingTask).toBeVisible();
    await expect(pendingTask.locator('[data-testid="status-badge"]')).toContainText('Pending');

    // Complete the task
    await page.locator('[data-testid="complete-button"]').first().click();

    // Wait for completion animation
    await page.waitForTimeout(500);

    // Task should now have completed indicator
    const completedTask = page
      .locator('[data-testid="task-card"][data-status="completed"]')
      .first();
    await expect(completedTask).toBeVisible();
    await expect(completedTask.locator('[data-testid="status-badge"]')).toContainText('Completed');
  });

  test('should handle task completion error', async ({ page }) => {
    // Intercept API call to simulate error
    await page.route('**/api/assignments/*/complete', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/dashboard');

    // Try to complete task
    await page.locator('[data-testid="complete-button"]').first().click();

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Failed to complete task',
    );

    // Task should remain in pending state
    const taskCard = page.locator('[data-testid="task-card"]').first();
    await expect(taskCard).toHaveAttribute('data-status', 'pending');
  });

  test('should filter tasks by status', async ({ page }) => {
    // Complete first task
    await page.goto('/dashboard');
    await page.locator('[data-testid="complete-button"]').first().click();
    await page.waitForTimeout(500);

    // Click "Pending" filter
    await page.locator('[data-testid="filter-pending"]').click();
    await expect(page.locator('[data-testid="task-card"][data-status="pending"]')).toHaveCount(0);

    // Click "Completed" filter
    await page.locator('[data-testid="filter-completed"]').click();
    await expect(page.locator('[data-testid="task-card"][data-status="completed"]')).toHaveCount(1);

    // Click "All" filter
    await page.locator('[data-testid="filter-all"]').click();
    await expect(page.locator('[data-testid="task-card"]')).toHaveCount(1);
  });

  test('should show empty state when no tasks', async ({ page }) => {
    // Navigate to future date with no tasks
    await page.goto('/dashboard?date=2099-12-31');

    // Should show empty state
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-state"]')).toContainText(
      'No tasks for this day',
    );
  });
});

test.describe('Task Viewing and Completion - Parent Perspective', () => {
  let householdId: string;
  let childIds: string[];
  let taskIds: string[];

  test.beforeEach(async ({ page }) => {
    // Reset database and seed with test data
    await resetDatabase();
    const testData = await seedTestData({
      parent: TEST_PARENT,
      children: TEST_CHILDREN,
      tasks: TEST_TASKS,
    });

    householdId = testData.householdId;
    childIds = testData.children.map((c) => c.id);
    taskIds = testData.tasks.map((t) => t.id);

    // Login as parent
    await loginAsParent(page, TEST_PARENT.email, TEST_PARENT.password);
  });

  test('should display all household tasks', async ({ page }) => {
    await page.goto('/tasks');

    // Should see all tasks for all children
    const taskCards = page.locator('[data-testid="task-card"]');
    await expect(taskCards.count()).toBeGreaterThan(0);

    // Should see child names on task cards
    await expect(page.locator('[data-testid="child-name"]').first()).toBeVisible();
  });

  test('should filter tasks by child', async ({ page }) => {
    await page.goto('/tasks');

    // Get initial task count
    const initialCount = await page.locator('[data-testid="task-card"]').count();

    // Filter by Emma
    await page.locator('[data-testid="filter-child"]').selectOption(childIds[0]);

    // Should show fewer tasks
    const filteredCount = await page.locator('[data-testid="task-card"]').count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // All visible tasks should be for Emma
    const childNames = page.locator('[data-testid="child-name"]');
    const count = await childNames.count();
    for (let i = 0; i < count; i++) {
      await expect(childNames.nth(i)).toContainText('Emma');
    }
  });

  test('should filter tasks by status', async ({ page }) => {
    // Complete one task first
    await page.goto('/tasks');
    await page.locator('[data-testid="complete-button"]').first().click();
    await page.waitForTimeout(500);

    // Filter by pending
    await page.locator('[data-testid="filter-status"]').selectOption('pending');
    const pendingTasks = page.locator('[data-testid="task-card"][data-status="pending"]');
    await expect(pendingTasks.count()).toBeGreaterThan(0);

    // Filter by completed
    await page.locator('[data-testid="filter-status"]').selectOption('completed');
    const completedTasks = page.locator('[data-testid="task-card"][data-status="completed"]');
    await expect(completedTasks.count()).toBeGreaterThan(0);
  });

  test('should filter tasks by date range', async ({ page }) => {
    await page.goto('/tasks');

    // Select date range (today only)
    const today = new Date().toISOString().split('T')[0];
    await page.locator('[data-testid="filter-date"]').fill(today);
    await page.locator('[data-testid="filter-days"]').fill('1');

    // Should show only today's tasks
    const taskDates = page.locator('[data-testid="task-date"]');
    const count = await taskDates.count();
    for (let i = 0; i < count; i++) {
      await expect(taskDates.nth(i)).toContainText(today);
    }
  });

  test('should reassign task to different child', async ({ page }) => {
    await page.goto('/tasks');

    // Click reassign button on first task
    await page.locator('[data-testid="reassign-button"]').first().click();

    // Should open reassign modal
    await expect(page.locator('[data-testid="reassign-modal"]')).toBeVisible();

    // Select Noah
    await page.locator('[data-testid="select-child"]').selectOption(childIds[1]);

    // Confirm reassignment
    await page.locator('[data-testid="confirm-reassign"]').click();

    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Task reassigned');

    // Task should now show Noah's name
    await expect(page.locator('[data-testid="task-card"]').first()).toContainText('Noah');
  });

  test('should handle reassignment error', async ({ page }) => {
    // Intercept API call to simulate error
    await page.route('**/api/assignments/*/reassign', (route) => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({ error: 'Invalid child ID' }),
      });
    });

    await page.goto('/tasks');

    // Try to reassign
    await page.locator('[data-testid="reassign-button"]').first().click();
    await page.locator('[data-testid="select-child"]').selectOption(childIds[1]);
    await page.locator('[data-testid="confirm-reassign"]').click();

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Failed to reassign task',
    );

    // Modal should remain open
    await expect(page.locator('[data-testid="reassign-modal"]')).toBeVisible();
  });

  test('should show task completion statistics', async ({ page }) => {
    await page.goto('/tasks');

    // Should show stats card
    const statsCard = page.locator('[data-testid="stats-card"]');
    await expect(statsCard).toBeVisible();

    // Should show total tasks
    await expect(statsCard.locator('[data-testid="total-tasks"]')).toBeVisible();

    // Should show pending count
    await expect(statsCard.locator('[data-testid="pending-count"]')).toBeVisible();

    // Should show completed count
    await expect(statsCard.locator('[data-testid="completed-count"]')).toBeVisible();

    // Should show completion percentage
    await expect(statsCard.locator('[data-testid="completion-percentage"]')).toBeVisible();
  });

  test('should complete task as parent', async ({ page }) => {
    await page.goto('/tasks');

    // Get initial pending count
    const initialPendingCount = await page
      .locator('[data-testid="task-card"][data-status="pending"]')
      .count();

    // Complete first task
    await page.locator('[data-testid="complete-button"]').first().click();
    await page.waitForTimeout(500);

    // Pending count should decrease
    const newPendingCount = await page
      .locator('[data-testid="task-card"][data-status="pending"]')
      .count();
    expect(newPendingCount).toBe(initialPendingCount - 1);

    // Stats should update
    await expect(page.locator('[data-testid="completed-count"]')).toContainText('1');
  });
});

test.describe('Task Viewing - Real-Time Updates', () => {
  test('should update task list when filters change', async ({ page }) => {
    await resetDatabase();
    const testData = await seedTestData({
      parent: TEST_PARENT,
      children: TEST_CHILDREN,
      tasks: TEST_TASKS,
    });

    await loginAsParent(page, TEST_PARENT.email, TEST_PARENT.password);
    await page.goto('/tasks');

    // Initial load should show all tasks
    const initialCount = await page.locator('[data-testid="task-card"]').count();
    expect(initialCount).toBeGreaterThan(0);

    // Change filter to specific child
    await page.locator('[data-testid="filter-child"]').selectOption(testData.children[0].id);

    // Should trigger new API call and update list
    await page.waitForResponse((response) =>
      response.url().includes(`/api/households/${testData.householdId}/assignments`),
    );

    // Count should change (unless all tasks belong to first child)
    const filteredCount = await page.locator('[data-testid="task-card"]').count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('should reflect optimistic updates immediately', async ({ page }) => {
    await resetDatabase();
    const testData = await seedTestData({
      parent: TEST_PARENT,
      children: TEST_CHILDREN,
      tasks: TEST_TASKS,
    });

    await loginAsChild(page, TEST_PARENT.email, TEST_PARENT.password, testData.children[0].id);
    await page.goto('/dashboard');

    // Click complete button
    const taskCard = page.locator('[data-testid="task-card"]').first();
    const completeButton = taskCard.locator('[data-testid="complete-button"]');
    await completeButton.click();

    // UI should update IMMEDIATELY (optimistic update)
    await expect(taskCard).toHaveAttribute('data-status', 'completed', { timeout: 100 });

    // Wait for API call to confirm
    await page.waitForResponse(
      (response) =>
        response.url().includes('/api/assignments/') && response.url().includes('/complete'),
    );

    // UI should remain in completed state
    await expect(taskCard).toHaveAttribute('data-status', 'completed');
  });
});
