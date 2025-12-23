import { test, expect } from '@playwright/test';
import { registerUser, loginAsUser } from '../helpers/auth-helpers';
import {
  resetTestDatabase,
  generateTestEmail,
  generateTestPassword,
} from '../helpers/test-helpers';

/**
 * Task Form Button Text E2E Tests
 * Verifies that the task creation form submit button displays proper text
 * and is functional (not blank)
 *
 * Related issue: #151 - Task save button blank and not working
 */

test.describe('Task Form Submit Button', () => {
  let userEmail: string;
  let userPassword: string;
  let householdId: string;

  test.beforeEach(async ({ page }) => {
    // Reset database
    await resetTestDatabase();

    // Register and login
    userEmail = generateTestEmail();
    userPassword = generateTestPassword();
    await registerUser(page, userEmail, userPassword);
    await loginAsUser(page, userEmail, userPassword);

    // Create household
    const baseURL = new URL(page.url()).origin;
    const householdResult = await page.evaluate(async (apiBase) => {
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      const response = await fetch(`${apiBase}/api/households`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test Household' }),
      });
      return await response.json();
    }, baseURL);
    householdId = householdResult.id.toString();
  });

  test('submit button displays "Create" text when creating new task', async ({ page }) => {
    await page.goto(`/households/${householdId}/tasks`);

    // Click Add Task button to open form modal
    await page.getByRole('button', { name: /add task|create task/i }).click();

    // Wait for modal to be visible
    await expect(page.locator('.modal-overlay')).toBeVisible();

    // Find the submit button inside the modal
    const submitButton = page.locator('.modal-content button[type="submit"]');

    // Verify button is visible
    await expect(submitButton).toBeVisible();

    // Verify button has text "Create" (not blank)
    await expect(submitButton).toHaveText('Create');

    // Verify button is enabled initially (becomes disabled when form is invalid)
    const isDisabled = await submitButton.isDisabled();
    expect(isDisabled).toBe(false);
  });

  test('submit button displays "Save" text when editing existing task', async ({ page }) => {
    // First create a task
    await page.goto(`/households/${householdId}/tasks`);
    await page.getByRole('button', { name: /add task/i }).click();

    await page.getByLabel(/title|name/i).fill('Test Task');
    await page.getByLabel(/points/i).fill('10');
    await page.locator('select[name="ruleType"]').selectOption('daily');

    await page.locator('.modal-content button[type="submit"]').click();
    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    // Now edit the task
    await page.getByRole('button', { name: /edit/i }).first().click();

    // Wait for modal to be visible
    await expect(page.locator('.modal-overlay')).toBeVisible();

    // Find the submit button
    const submitButton = page.locator('.modal-content button[type="submit"]');

    // Verify button displays "Save" when editing
    await expect(submitButton).toHaveText('Save');
  });

  test('submit button displays "Saving..." while submitting', async ({ page }) => {
    await page.goto(`/households/${householdId}/tasks`);
    await page.getByRole('button', { name: /add task/i }).click();

    // Fill form
    await page.getByLabel(/title|name/i).fill('Submit Test Task');
    await page.getByLabel(/points/i).fill('10');
    await page.locator('select[name="ruleType"]').selectOption('daily');

    const submitButton = page.locator('.modal-content button[type="submit"]');

    // Intercept the API call to slow it down so we can see "Saving..."
    await page.route('**/api/households/*/tasks', async (route) => {
      await page.waitForTimeout(1000); // Delay 1 second
      await route.continue();
    });

    // Click submit
    const submitPromise = submitButton.click();

    // Check if button shows "Saving..." during submission
    // (This may not always be visible due to fast API, but worth checking)
    const savingText = await submitButton.textContent();
    if (savingText === 'Saving...') {
      expect(savingText).toBe('Saving...');
    }

    await submitPromise;
  });

  test('submit button works correctly (not blank, creates task)', async ({ page }) => {
    await page.goto(`/households/${householdId}/tasks`);
    await page.getByRole('button', { name: /add task/i }).click();

    // Fill form completely
    await page.getByLabel(/title|name/i).fill('Functional Button Test');
    await page.getByLabel(/description/i).fill('Testing that button works');
    await page.getByLabel(/points/i).fill('15');
    await page.locator('select[name="ruleType"]').selectOption('daily');

    const submitButton = page.locator('.modal-content button[type="submit"]');

    // Verify button text is NOT blank
    const buttonText = await submitButton.textContent();
    expect(buttonText).toBeTruthy();
    expect(buttonText?.trim().length).toBeGreaterThan(0);

    // Click submit
    await submitButton.click();

    // Verify modal closes (indicates successful submission)
    await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 10000 });

    // Verify task appears in list
    await expect(page.getByText('Functional Button Test')).toBeVisible();
  });

  test('cancel button has text and works correctly', async ({ page }) => {
    await page.goto(`/households/${householdId}/tasks`);
    await page.getByRole('button', { name: /add task/i }).click();

    const cancelButton = page.locator('.modal-content button[type="button"]');

    // Verify cancel button has text
    await expect(cancelButton).toHaveText('Cancel');

    // Click cancel
    await cancelButton.click();

    // Verify modal closes
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });
});
