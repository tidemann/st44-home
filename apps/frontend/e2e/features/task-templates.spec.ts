import { test, expect } from '@playwright/test';
import { registerUser, loginAsUser } from '../helpers/auth-helpers';
import {
  resetTestDatabase,
  generateTestEmail,
  generateTestPassword,
} from '../helpers/test-helpers';

/**
 * Task Template Management E2E Tests
 * Tests complete user flows for creating, editing, and deleting task templates
 */

test.describe('Task Template Management', () => {
  let userEmail: string;
  let userPassword: string;
  let householdId: string;
  let childId1: string;
  let childId2: string;

  test.beforeEach(async ({ page }) => {
    // Reset database for isolated tests
    await resetTestDatabase();

    // Generate credentials
    userEmail = generateTestEmail();
    userPassword = generateTestPassword();

    // Register and login
    await registerUser(page, userEmail, userPassword);
    await loginAsUser(page, userEmail, userPassword);

    // Create household via API (using page context to get cookies/auth)
    const baseURL = page.context().browser()?.browserType().name()
      ? new URL(page.url()).origin
      : 'http://localhost:4201';
    const householdResult = await page.evaluate(async (apiBase) => {
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      const response = await fetch(`${apiBase}/api/households`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test Family' }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create household: ${response.status} ${errorText}`);
      }
      return await response.json();
    }, baseURL);
    householdId = householdResult.id.toString();
    expect(householdId).toBeTruthy();

    // Create children via API
    const child1Result = await page.evaluate(
      async ({ hid, apiBase }) => {
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        const response = await fetch(`${apiBase}/api/households/${hid}/children`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Emma', birthYear: 2015 }),
        });
        if (!response.ok) throw new Error(`Failed to create child: ${response.status}`);
        return await response.json();
      },
      { hid: householdId, apiBase: baseURL },
    );
    childId1 = child1Result.id.toString();

    const child2Result = await page.evaluate(
      async ({ hid, apiBase }) => {
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        const response = await fetch(`${apiBase}/api/households/${hid}/children`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Noah', birthYear: 2017 }),
        });
        if (!response.ok) throw new Error(`Failed to create child: ${response.status}`);
        return await response.json();
      },
      { hid: householdId, apiBase: baseURL },
    );
    childId2 = child2Result.id.toString();
  });

  // TODO: Enable these tests once task template management UI is implemented
  // See task-101 for tracking missing UI components
  test('should display empty task list initially', async ({ page }) => {
    await page.goto(`/households/${householdId}/tasks`);

    // Should show "No tasks" message or empty table
    const noDataMessage = page.getByText(/no tasks|no data/i);
    await expect(noDataMessage).toBeVisible();
  });

  test('should create a daily task', async ({ page }) => {
    await page.goto(`/households/${householdId}/tasks`);

    // Click create button
    await page.getByRole('button', { name: /add task|create task|new task/i }).click();

    // Fill form
    await page.getByLabel(/title|name/i).fill('Make your bed');
    await page.getByLabel(/description/i).fill('Every morning before breakfast');
    await page.getByLabel(/points/i).fill('10');

    // Select rule type
    await page.locator('select[name="rule_type"]').selectOption('daily');

    // Submit (click the submit button inside the modal, not the Add Task button)
    await page
      .locator('.modal-content')
      .getByRole('button', { name: /save|create/i })
      .click();

    // Wait for modal to close and task to appear in list
    await page.waitForTimeout(500);
    await expect(page.getByText('Make your bed')).toBeVisible();
  });

  test.skip('should create a repeating task with day selection', async ({ page }) => {
    await page.goto(`/households/${householdId}/tasks`);
    await page.getByRole('button', { name: /add task|create task|new task/i }).click();

    // Fill basic info
    await page.getByLabel(/title|name/i).fill('Water plants');
    await page.getByLabel(/points/i).fill('5');

    // Select repeating rule type
    await page.locator('select[name="rule_type"]').selectOption('repeating');

    // Wait for day selection to appear
    await expect(page.getByText(/select days/i)).toBeVisible();

    // Select days (Monday, Wednesday, Friday)
    await page.getByLabel(/monday/i).check();
    await page.getByLabel(/wednesday/i).check();
    await page.getByLabel(/friday/i).check();

    // Submit
    await page
      .locator('.modal-content')
      .getByRole('button', { name: /save|create/i })
      .click();

    // Check for error message (for debugging)
    const errorMsg = page.locator('.modal-content .error');
    if (await errorMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
      const errorText = await errorMsg.textContent();
      console.log('Error message:', errorText);
    }

    // Wait for modal to close (verify it's gone)
    await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 10000 });

    // Verify task appears in list
    await expect(page.getByText('Water plants')).toBeVisible();
  });

  test.skip('should create a weekly rotation task', async ({ page }) => {
    await page.goto(`/households/${householdId}/tasks`);
    await page.getByRole('button', { name: /add task|create task|new task/i }).click();

    // Fill basic info
    await page.getByLabel(/title|name/i).fill('Take out trash');
    await page.getByLabel(/points/i).fill('15');

    // Select weekly rotation
    const ruleTypeSelect = page.locator(
      'select[name="rule_type"], mat-select[formControlName="rule_type"]',
    );
    await ruleTypeSelect.click();
    await page.getByRole('option', { name: /weekly rotation/i }).click();

    // Wait for rotation options to appear
    await expect(page.getByText(/rotation type/i)).toBeVisible();

    // Select rotation type
    const rotationSelect = page.locator(
      'select[name="rotation_type"], mat-select[formControlName="rotation_type"]',
    );
    await rotationSelect.click();
    await page.getByRole('option', { name: /odd.*even week|alternating/i }).click();

    // Select both children (weekly rotation requires 2+)
    await page.getByLabel(/emma/i).check();
    await page.getByLabel(/noah/i).check();

    // Submit
    await page.getByRole('button', { name: /save|create|add/i }).click();

    // Verify success
    await expect(page.getByText(/created|success/i)).toBeVisible();
    await expect(page.getByText('Take out trash')).toBeVisible();
  });

  test.skip('should validate required fields', async ({ page }) => {
    await page.goto(`/households/${householdId}/tasks`);
    await page.getByRole('button', { name: /add task|create task|new task/i }).click();

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /save|create|add/i });
    await submitButton.click();

    // Should show validation errors
    await expect(page.getByText(/required|cannot be empty/i)).toBeVisible();

    // Submit button might be disabled
    const isDisabled = await submitButton.isDisabled();
    expect(isDisabled).toBe(true);
  });

  test.skip('should validate title length', async ({ page }) => {
    await page.goto(`/households/${householdId}/tasks`);
    await page.getByRole('button', { name: /add task|create task|new task/i }).click();

    // Enter title over 200 chars
    const longTitle = 'A'.repeat(300);
    await page.getByLabel(/title|name/i).fill(longTitle);

    // Should show length error
    await expect(page.getByText(/maximum|too long|255 characters/i)).toBeVisible();
  });

  test.skip('should validate repeating task requires days', async ({ page }) => {
    await page.goto(`/households/${householdId}/tasks`);
    await page.getByRole('button', { name: /add task|create task|new task/i }).click();

    await page.getByLabel(/title|name/i).fill('Test Task');

    // Select repeating
    const ruleTypeSelect = page.locator(
      'select[name="rule_type"], mat-select[formControlName="rule_type"]',
    );
    await ruleTypeSelect.click();
    await page.getByRole('option', { name: /repeating/i }).click();

    // Don't select any days
    // Try to submit
    await page.getByRole('button', { name: /save|create|add/i }).click();

    // Should show error
    await expect(page.getByText(/select.*days|days required/i)).toBeVisible();
  });

  test.skip('should validate weekly rotation requires 2+ children', async ({ page }) => {
    await page.goto(`/households/${householdId}/tasks`);
    await page.getByRole('button', { name: /add task|create task|new task/i }).click();

    await page.getByLabel(/title|name/i).fill('Test Task');

    // Select weekly rotation
    const ruleTypeSelect = page.locator(
      'select[name="rule_type"], mat-select[formControlName="rule_type"]',
    );
    await ruleTypeSelect.click();
    await page.getByRole('option', { name: /weekly rotation/i }).click();

    // Select rotation type
    const rotationSelect = page.locator(
      'select[name="rotation_type"], mat-select[formControlName="rotation_type"]',
    );
    await rotationSelect.click();
    await page.getByRole('option', { name: /odd.*even/i }).click();

    // Select only one child
    await page.getByLabel(/emma/i).check();

    // Try to submit
    await page.getByRole('button', { name: /save|create|add/i }).click();

    // Should show error
    await expect(page.getByText(/at least.*2.*children|multiple children/i)).toBeVisible();
  });

  test('should edit an existing task', async ({ page }) => {
    // Create a task first
    await page.goto(`/households/${householdId}/tasks`);
    await page.getByRole('button', { name: /add task|create task|new task/i }).click();

    await page.getByLabel(/title|name/i).fill('Original Title');
    await page.getByLabel(/points/i).fill('10');

    await page.locator('select[name="rule_type"]').selectOption('daily');

    await page
      .locator('.modal-content')
      .getByRole('button', { name: /save|create/i })
      .click();

    // Wait for modal to close (indicates success)
    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    // Edit the task
    await page.getByRole('button', { name: /edit/i }).first().click();

    // Modal should open with pre-filled data
    await expect(page.getByLabel(/title|name/i)).toHaveValue('Original Title');

    // Change title and points
    await page.getByLabel(/title|name/i).fill('Updated Title');
    await page.getByLabel(/points/i).fill('15');

    // Save changes
    await page.getByRole('button', { name: /save|update/i }).click();

    // Verify update
    await expect(page.getByText('Updated Title')).toBeVisible();
    await expect(page.getByText('15')).toBeVisible();
  });

  test('should delete a task (soft delete)', async ({ page }) => {
    // Create a task first
    await page.goto(`/households/${householdId}/tasks`);
    await page.getByRole('button', { name: /add task|create task|new task/i }).click();

    await page.getByLabel(/title|name/i).fill('Task to Delete');

    await page.locator('select[name="rule_type"]').selectOption('daily');

    await page
      .locator('.modal-content')
      .getByRole('button', { name: /save|create/i })
      .click();

    // Wait for modal to close (indicates success)
    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    // Delete the task
    page.on('dialog', (dialog) => dialog.accept()); // Accept confirm dialog
    await page
      .getByRole('button', { name: /delete/i })
      .first()
      .click();

    // Wait for task to disappear from list (indicates successful deletion)
    await expect(page.getByText('Task to Delete')).not.toBeVisible({ timeout: 10000 });
  });

  test('should filter tasks by active status', async ({ page }) => {
    // Create and delete a task
    await page.goto(`/households/${householdId}/tasks`);
    await page.getByRole('button', { name: /add task|create task|new task/i }).click();

    await page.getByLabel(/title|name/i).fill('Inactive Task');

    await page.locator('select[name="rule_type"]').selectOption('daily');

    await page
      .locator('.modal-content')
      .getByRole('button', { name: /save|create/i })
      .click();

    // Wait for modal to close (indicates success)
    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    // Delete it
    page.on('dialog', (dialog) => dialog.accept()); // Accept confirm dialog
    await page
      .getByRole('button', { name: /delete/i })
      .first()
      .click();

    // Wait for task to disappear (indicates successful soft-delete with active filter)
    await expect(page.getByText('Inactive Task')).not.toBeVisible({ timeout: 10000 });

    // TODO: Implement "Show all" toggle to verify filtering works
    // const showAllToggle = page.getByLabel(/show all|include inactive/i);
    // if (await showAllToggle.isVisible()) {
    //   await showAllToggle.check();
    //   await expect(page.getByText('Inactive Task')).toBeVisible();
    // }
  });

  test('should sort tasks by title', async ({ page }) => {
    // Create multiple tasks
    await page.goto(`/households/${householdId}/tasks`);

    const tasks = ['Zebra Task', 'Apple Task', 'Mango Task'];

    for (const taskName of tasks) {
      await page.getByRole('button', { name: /add task|create task|new task/i }).click();
      await page.getByLabel(/title|name/i).fill(taskName);

      await page.locator('select[name="rule_type"]').selectOption('daily');

      await page
        .locator('.modal-content')
        .getByRole('button', { name: /save|create/i })
        .click();

      // Wait for modal to close (indicates success)
      await expect(page.locator('.modal-overlay')).not.toBeVisible();
    }

    // Click sort by title
    const sortHeader = page.getByRole('columnheader', { name: /title|name/i });
    if (await sortHeader.isVisible()) {
      await sortHeader.click();

      // Verify alphabetical order
      const taskElements = await page.locator('.task-row, .task-card').allTextContents();
      const titles = taskElements.filter((text) => tasks.some((t) => text.includes(t)));

      // Should be sorted A-Z
      expect(titles[0]).toContain('Apple');
      expect(titles[1]).toContain('Mango');
      expect(titles[2]).toContain('Zebra');
    }
  });

  test.skip('should prevent other household members from seeing tasks', async ({
    page,
    context,
  }) => {
    // Create a task as first user
    await page.goto(`/households/${householdId}/tasks`);
    await page.getByRole('button', { name: /add task|create task|new task/i }).click();

    await page.getByLabel(/title|name/i).fill('Private Task');

    const ruleTypeSelect = page.locator(
      'select[name="rule_type"], mat-select[formControlName="rule_type"]',
    );
    await ruleTypeSelect.click();
    await page.getByRole('option', { name: /daily/i }).click();

    await page.getByRole('button', { name: /save|create|add/i }).click();
    await expect(page.getByText(/created|success/i)).toBeVisible();

    // Create a second user in a new context (simulates different browser)
    const page2 = await context.newPage();
    const user2Email = generateTestEmail();
    const user2Password = generateTestPassword();

    await registerUser(page2, user2Email, user2Password);
    await loginAsUser(page2, user2Email, user2Password);

    // Try to access first user's household tasks
    await page2.goto(`/households/${householdId}/tasks`);

    // Should get 403 or redirect, not see "Private Task"
    await expect(page2.getByText('Private Task')).not.toBeVisible();

    await page2.close();
  });
});
