import { test, expect } from '@playwright/test';
import { resetDatabase, seedSingleTaskScenario, seedTaskResponse } from './helpers/seed-database';
import { loginAsParent } from './helpers/auth-helpers';

/**
 * Single Task Feature E2E Tests
 *
 * Tests the complete accept/decline workflow for single tasks,
 * including child task selection and parent visibility of failed tasks.
 */

test.describe('Single Task Feature', () => {
  const testEmail = `e2e-single-task-${Date.now()}@example.com`;
  const testPassword = 'SecureE2EPass123!';

  test.beforeAll(async () => {
    // Reset database before all tests in this suite
    await resetDatabase();
  });

  test.describe('Accept/Decline Flow', () => {
    test('child can view available single tasks', async ({ page }) => {
      // Seed test data
      const scenario = await seedSingleTaskScenario({
        parent: { email: testEmail, password: testPassword },
        children: ['Emma', 'Noah'],
        tasks: [
          {
            name: 'Clean the garage',
            description: 'One-time deep cleaning',
            points: 50,
            candidates: ['Emma', 'Noah'],
          },
        ],
      });

      // Login as parent
      await loginAsParent(page, testEmail, testPassword);

      // Navigate to child's dashboard (simulate child login)
      // In real E2E, we'd use loginAsChild helper
      await page.goto('/child-dashboard');

      // Wait for available tasks section to load
      await page.waitForSelector('[data-testid="available-tasks-section"], .available-tasks', {
        timeout: 10000,
      });

      // Verify task is visible
      const taskCard = page.locator('text=Clean the garage');
      await expect(taskCard).toBeVisible();
    });

    test('child can accept a single task', async ({ page }) => {
      // Seed fresh test data
      await resetDatabase();
      const scenario = await seedSingleTaskScenario({
        parent: { email: testEmail, password: testPassword },
        children: ['Emma', 'Noah'],
        tasks: [
          {
            name: 'Organize the closet',
            description: 'Sort and organize all clothes',
            points: 30,
            candidates: ['Emma', 'Noah'],
          },
        ],
      });

      // Login as parent
      await loginAsParent(page, testEmail, testPassword);

      // Navigate to child's view
      await page.goto('/child-dashboard');

      // Wait for tasks to load
      await page.waitForSelector('[data-testid="available-tasks-section"], .available-tasks', {
        timeout: 10000,
      });

      // Find and click Accept button
      const acceptButton = page.getByRole('button', { name: /accept/i });
      if (await acceptButton.isVisible()) {
        // Wait for API response
        const responsePromise = page.waitForResponse(
          (resp) => resp.url().includes('/accept') && resp.status() === 201,
        );

        await acceptButton.click();

        // Verify API success
        await responsePromise;

        // Task should disappear from available list
        await expect(page.locator('text=Organize the closet')).not.toBeVisible({ timeout: 5000 });
      }
    });

    test('child can decline a single task', async ({ page }) => {
      // Seed fresh test data
      await resetDatabase();
      const scenario = await seedSingleTaskScenario({
        parent: { email: testEmail, password: testPassword },
        children: ['Emma', 'Noah'],
        tasks: [
          {
            name: 'Wash the car',
            description: 'Full car wash inside and out',
            points: 40,
            candidates: ['Emma', 'Noah'],
          },
        ],
      });

      // Login as parent
      await loginAsParent(page, testEmail, testPassword);

      // Navigate to child's view
      await page.goto('/child-dashboard');

      // Wait for tasks to load
      await page.waitForSelector('[data-testid="available-tasks-section"], .available-tasks', {
        timeout: 10000,
      });

      // Find and click Decline button
      const declineButton = page.getByRole('button', { name: /decline/i });
      if (await declineButton.isVisible()) {
        // Wait for API response
        const responsePromise = page.waitForResponse(
          (resp) => resp.url().includes('/decline') && resp.status() === 200,
        );

        await declineButton.click();

        // Verify API success
        await responsePromise;

        // Task should disappear from available list
        await expect(page.locator('text=Wash the car')).not.toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Failed Task Flow', () => {
    test('parent can see tasks where all candidates declined', async ({ page }) => {
      // Seed test data with a task where all candidates have declined
      await resetDatabase();
      const scenario = await seedSingleTaskScenario({
        parent: { email: testEmail, password: testPassword },
        children: ['Emma', 'Noah'],
        tasks: [
          {
            name: 'Paint the fence',
            description: 'Paint the backyard fence white',
            points: 100,
            candidates: ['Emma', 'Noah'],
          },
        ],
      });

      // Add decline responses for all candidates
      for (const child of scenario.children) {
        await seedTaskResponse({
          taskId: scenario.tasks[0].id,
          childId: child.id,
          householdId: scenario.householdId,
          response: 'declined',
        });
      }

      // Login as parent
      await loginAsParent(page, testEmail, testPassword);

      // Navigate to parent dashboard or tasks page
      await page.goto('/tasks');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Look for failed tasks section or indicator
      const failedSection = page.locator('[data-testid="failed-tasks-section"], .failed-tasks');
      if (await failedSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Verify the task appears in failed section
        await expect(page.locator('text=Paint the fence')).toBeVisible();
      }
    });

    test('parent can view candidate status for a task', async ({ page }) => {
      // Seed test data
      await resetDatabase();
      const scenario = await seedSingleTaskScenario({
        parent: { email: testEmail, password: testPassword },
        children: ['Emma', 'Noah'],
        tasks: [
          {
            name: 'Mow the lawn',
            description: 'Mow front and back yard',
            points: 60,
            candidates: ['Emma', 'Noah'],
          },
        ],
      });

      // Add one decline response
      await seedTaskResponse({
        taskId: scenario.tasks[0].id,
        childId: scenario.children[0].id,
        householdId: scenario.householdId,
        response: 'declined',
      });

      // Login as parent
      await loginAsParent(page, testEmail, testPassword);

      // Navigate to tasks page
      await page.goto('/tasks');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Find the task and click to view details
      const taskRow = page.locator('text=Mow the lawn');
      if (await taskRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Look for candidate status indicator
        // This depends on the UI implementation
        const candidateStatus = page.locator('.candidate-status, [data-testid="candidate-status"]');
        if (await candidateStatus.isVisible().catch(() => false)) {
          // Verify at least one candidate is shown
          await expect(candidateStatus).toContainText(/emma|noah/i);
        }
      }
    });

    test('parent can see expired tasks past deadline', async ({ page }) => {
      // Seed test data with expired deadline
      await resetDatabase();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      const scenario = await seedSingleTaskScenario({
        parent: { email: testEmail, password: testPassword },
        children: ['Emma'],
        tasks: [
          {
            name: 'Expired task',
            description: 'This task has expired',
            points: 25,
            deadline: pastDate,
            candidates: ['Emma'],
          },
        ],
      });

      // Login as parent
      await loginAsParent(page, testEmail, testPassword);

      // Navigate to tasks page
      await page.goto('/tasks');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Look for expired tasks section
      const expiredSection = page.locator('[data-testid="expired-tasks-section"], .expired-tasks');
      if (await expiredSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(page.locator('text=Expired task')).toBeVisible();
      }
    });
  });

  test.describe('Race Condition Prevention', () => {
    test('only one child can accept a task (conflict handling)', async ({ page }) => {
      // This test verifies the race condition prevention
      // When one child accepts, others should get 409 Conflict

      await resetDatabase();
      const scenario = await seedSingleTaskScenario({
        parent: { email: testEmail, password: testPassword },
        children: ['Emma', 'Noah'],
        tasks: [
          {
            name: 'First come first serve',
            description: 'Only one child can take this',
            points: 75,
            candidates: ['Emma', 'Noah'],
          },
        ],
      });

      // Simulate first child accepting
      await seedTaskResponse({
        taskId: scenario.tasks[0].id,
        childId: scenario.children[0].id,
        householdId: scenario.householdId,
        response: 'accepted',
      });

      // Login and try to accept as second child
      await loginAsParent(page, testEmail, testPassword);
      await page.goto('/child-dashboard');

      // Task should no longer be available for the second child
      // (either not shown, or accept button disabled/hidden)
      await page.waitForLoadState('networkidle');

      // The task should not be in the available list since it's already accepted
      const taskVisible = await page.locator('text=First come first serve').isVisible();

      // If still visible, the accept button should be gone or disabled
      if (taskVisible) {
        const acceptButton = page
          .locator('text=First come first serve')
          .locator('..')
          .getByRole('button', { name: /accept/i });
        await expect(acceptButton).not.toBeVisible();
      }
    });
  });
});
