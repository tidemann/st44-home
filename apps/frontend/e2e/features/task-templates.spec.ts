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

    // Create household via UI
    await page.goto('/households/new');
    await page.getByLabel(/household name/i).fill('Test Family');
    await page.getByRole('button', { name: /create/i }).click();
    await page.waitForURL(/\/households\/\d+/);

    // Extract household ID from URL
    const url = page.url();
    const match = url.match(/\/households\/(\d+)/);
    householdId = match ? match[1] : '';
    expect(householdId).toBeTruthy();

    // Create children via UI
    await page.goto(`/households/${householdId}/children/new`);
    await page.getByLabel(/name/i).fill('Emma');
    await page.getByLabel(/birth year/i).fill('2015');
    await page.getByRole('button', { name: /add child/i }).click();
    await page.waitForURL(/\/households\/\d+/);

    await page.goto(`/households/${householdId}/children/new`);
    await page.getByLabel(/name/i).fill('Noah');
    await page.getByLabel(/birth year/i).fill('2017');
    await page.getByRole('button', { name: /add child/i }).click();
    await page.waitForURL(/\/households\/\d+/);
  });

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
    const ruleTypeSelect = page.locator(
      'select[name="rule_type"], mat-select[formControlName="rule_type"]',
    );
    await ruleTypeSelect.click();
    await page.getByRole('option', { name: /daily/i }).click();

    // Submit
    await page.getByRole('button', { name: /save|create|add/i }).click();

    // Verify success message
    await expect(page.getByText(/created|success/i)).toBeVisible();

    // Verify task appears in list
    await expect(page.getByText('Make your bed')).toBeVisible();
  });

  test('should create a repeating task with day selection', async ({ page }) => {
    await page.goto(`/households/${householdId}/tasks`);
    await page.getByRole('button', { name: /add task|create task|new task/i }).click();

    // Fill basic info
    await page.getByLabel(/title|name/i).fill('Water plants');
    await page.getByLabel(/points/i).fill('5');

    // Select repeating rule type
    const ruleTypeSelect = page.locator(
      'select[name="rule_type"], mat-select[formControlName="rule_type"]',
    );
    await ruleTypeSelect.click();
    await page.getByRole('option', { name: /repeating/i }).click();

    // Wait for day selection to appear
    await expect(page.getByText(/select days/i)).toBeVisible();

    // Select days (Monday, Wednesday, Friday)
    await page.getByLabel(/monday/i).check();
    await page.getByLabel(/wednesday/i).check();
    await page.getByLabel(/friday/i).check();

    // Select children
    await page.getByLabel(/emma/i).check();

    // Submit
    await page.getByRole('button', { name: /save|create|add/i }).click();

    // Verify success
    await expect(page.getByText(/created|success/i)).toBeVisible();
    await expect(page.getByText('Water plants')).toBeVisible();
  });

  test('should create a weekly rotation task', async ({ page }) => {
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

  test('should validate required fields', async ({ page }) => {
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

  test('should validate title length', async ({ page }) => {
    await page.goto(`/households/${householdId}/tasks`);
    await page.getByRole('button', { name: /add task|create task|new task/i }).click();

    // Enter title over 200 chars
    const longTitle = 'A'.repeat(300);
    await page.getByLabel(/title|name/i).fill(longTitle);

    // Should show length error
    await expect(page.getByText(/maximum|too long|255 characters/i)).toBeVisible();
  });

  test('should validate repeating task requires days', async ({ page }) => {
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

  test('should validate weekly rotation requires 2+ children', async ({ page }) => {
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

    const ruleTypeSelect = page.locator(
      'select[name="rule_type"], mat-select[formControlName="rule_type"]',
    );
    await ruleTypeSelect.click();
    await page.getByRole('option', { name: /daily/i }).click();

    await page.getByRole('button', { name: /save|create|add/i }).click();
    await expect(page.getByText(/created|success/i)).toBeVisible();

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

    const ruleTypeSelect = page.locator(
      'select[name="rule_type"], mat-select[formControlName="rule_type"]',
    );
    await ruleTypeSelect.click();
    await page.getByRole('option', { name: /daily/i }).click();

    await page.getByRole('button', { name: /save|create|add/i }).click();
    await expect(page.getByText(/created|success/i)).toBeVisible();

    // Delete the task
    await page
      .getByRole('button', { name: /delete/i })
      .first()
      .click();

    // Confirm deletion
    await page.getByRole('button', { name: /confirm|yes|delete/i }).click();

    // Task should be removed from active list
    await expect(page.getByText('Task to Delete')).not.toBeVisible();
  });

  test('should filter tasks by active status', async ({ page }) => {
    // Create and delete a task
    await page.goto(`/households/${householdId}/tasks`);
    await page.getByRole('button', { name: /add task|create task|new task/i }).click();

    await page.getByLabel(/title|name/i).fill('Inactive Task');

    const ruleTypeSelect = page.locator(
      'select[name="rule_type"], mat-select[formControlName="rule_type"]',
    );
    await ruleTypeSelect.click();
    await page.getByRole('option', { name: /daily/i }).click();

    await page.getByRole('button', { name: /save|create|add/i }).click();
    await expect(page.getByText(/created|success/i)).toBeVisible();

    // Delete it
    await page
      .getByRole('button', { name: /delete/i })
      .first()
      .click();
    await page.getByRole('button', { name: /confirm|yes|delete/i }).click();

    // By default, should not see inactive task
    await expect(page.getByText('Inactive Task')).not.toBeVisible();

    // Toggle "Show all" or "Include inactive"
    const showAllToggle = page.getByLabel(/show all|include inactive/i);
    if (await showAllToggle.isVisible()) {
      await showAllToggle.check();
      // Now should see the inactive task
      await expect(page.getByText('Inactive Task')).toBeVisible();
    }
  });

  test('should sort tasks by title', async ({ page }) => {
    // Create multiple tasks
    await page.goto(`/households/${householdId}/tasks`);

    const tasks = ['Zebra Task', 'Apple Task', 'Mango Task'];

    for (const taskName of tasks) {
      await page.getByRole('button', { name: /add task|create task|new task/i }).click();
      await page.getByLabel(/title|name/i).fill(taskName);

      const ruleTypeSelect = page.locator(
        'select[name="rule_type"], mat-select[formControlName="rule_type"]',
      );
      await ruleTypeSelect.click();
      await page.getByRole('option', { name: /daily/i }).click();

      await page.getByRole('button', { name: /save|create|add/i }).click();
      await expect(page.getByText(/created|success/i)).toBeVisible();
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

  test('should prevent other household members from seeing tasks', async ({ page, context }) => {
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
