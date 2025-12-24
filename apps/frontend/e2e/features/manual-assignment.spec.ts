import { test, expect } from '@playwright/test';
import { registerUser, loginAsUser } from '../helpers/auth-helpers';
import {
  resetTestDatabase,
  generateTestEmail,
  generateTestPassword,
} from '../helpers/test-helpers';

/**
 * Manual Task Assignment E2E Tests
 * Tests complete user flow for manually assigning tasks to children
 */

test.describe('Manual Task Assignment', () => {
  let userEmail: string;
  let userPassword: string;
  let householdId: string;
  let childId: string;
  let taskId: string;

  test.beforeEach(async ({ page }) => {
    // Reset database for isolated tests
    await resetTestDatabase();

    // Generate credentials
    userEmail = generateTestEmail();
    userPassword = generateTestPassword();

    // Register and login
    await registerUser(page, userEmail, userPassword);
    await loginAsUser(page, userEmail, userPassword);

    // Get base URL
    const baseURL = page.context().browser()?.browserType().name()
      ? new URL(page.url()).origin
      : 'http://localhost:4201';

    // Create household via API
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

    // Create child via API
    const childResult = await page.evaluate(
      async ({ hid, apiBase }) => {
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        const response = await fetch(`${apiBase}/api/households/${hid}/children`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Alice', birthYear: 2015 }),
        });
        if (!response.ok) throw new Error(`Failed to create child: ${response.status}`);
        return await response.json();
      },
      { hid: householdId, apiBase: baseURL },
    );
    childId = childResult.id.toString();

    // Create task via API
    const taskResult = await page.evaluate(
      async ({ hid, apiBase }) => {
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        const response = await fetch(`${apiBase}/api/households/${hid}/tasks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Clean Room',
            description: 'Clean and organize your room',
            points: 10,
            ruleType: 'daily',
            ruleConfig: {},
            active: true,
          }),
        });
        if (!response.ok) throw new Error(`Failed to create task: ${response.status}`);
        return await response.json();
      },
      { hid: householdId, apiBase: baseURL },
    );
    taskId = taskResult.id.toString();
  });

  test('should open manual assignment modal from parent dashboard', async ({ page }) => {
    // Navigate to parent dashboard
    await page.goto('/dashboard');

    // Wait for dashboard to load
    await expect(page.getByRole('main')).toBeVisible();

    // Click "Assign Task" button
    const assignButton = page.getByRole('button', { name: /assign task/i });
    await expect(assignButton).toBeVisible();
    await assignButton.click();

    // Verify modal is opened
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/assign task/i).first()).toBeVisible();
  });

  test('should manually assign a task to a child', async ({ page }) => {
    // Navigate to parent dashboard
    await page.goto('/dashboard');

    // Click "Assign Task" button
    await page.getByRole('button', { name: /assign task/i }).click();

    // Verify modal is opened
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Select task
    const taskSelect = modal.locator('select#task-select');
    await taskSelect.selectOption({ label: 'Clean Room' });

    // Select child
    const childSelect = modal.locator('select#child-select');
    await childSelect.selectOption({ label: 'Alice' });

    // Select date (use today's date)
    const dateInput = modal.locator('input#date-input');
    const today = new Date().toISOString().split('T')[0];
    await dateInput.fill(today);

    // Submit form
    await modal.getByRole('button', { name: /assign task/i }).click();

    // Wait for success message or modal to close
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Verify assignment was created (should reload dashboard)
    // We can verify by checking if the dashboard data updated
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('should show validation error when required fields are missing', async ({ page }) => {
    // Navigate to parent dashboard
    await page.goto('/dashboard');

    // Click "Assign Task" button
    await page.getByRole('button', { name: /assign task/i }).click();

    // Verify modal is opened
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Try to submit without selecting anything (form should prevent submission)
    const submitButton = modal.getByRole('button', { name: /assign task/i });
    await expect(submitButton).toBeDisabled();
  });

  test('should close modal when clicking cancel', async ({ page }) => {
    // Navigate to parent dashboard
    await page.goto('/dashboard');

    // Click "Assign Task" button
    await page.getByRole('button', { name: /assign task/i }).click();

    // Verify modal is opened
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Click cancel button
    await modal.getByRole('button', { name: /cancel/i }).click();

    // Verify modal is closed
    await expect(modal).not.toBeVisible();
  });

  test('should close modal when clicking outside (backdrop)', async ({ page }) => {
    // Navigate to parent dashboard
    await page.goto('/dashboard');

    // Click "Assign Task" button
    await page.getByRole('button', { name: /assign task/i }).click();

    // Verify modal is opened
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Click on backdrop (outside modal content)
    const backdrop = page.locator('.modal-backdrop');
    await backdrop.click({ position: { x: 10, y: 10 } });

    // Verify modal is closed
    await expect(modal).not.toBeVisible();
  });

  test('should show error when assigning duplicate task', async ({ page }) => {
    // Get base URL
    const baseURL = page.context().browser()?.browserType().name()
      ? new URL(page.url()).origin
      : 'http://localhost:4201';

    // Create first assignment via API
    const today = new Date().toISOString().split('T')[0];
    await page.evaluate(
      async ({ apiBase, taskId, childId, date }) => {
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        await fetch(`${apiBase}/api/assignments/manual`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskId, childId, date }),
        });
      },
      { apiBase: baseURL, taskId, childId, date: today },
    );

    // Navigate to parent dashboard
    await page.goto('/dashboard');

    // Click "Assign Task" button
    await page.getByRole('button', { name: /assign task/i }).click();

    // Verify modal is opened
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Select task
    await modal.locator('select#task-select').selectOption({ label: 'Clean Room' });

    // Select child
    await modal.locator('select#child-select').selectOption({ label: 'Alice' });

    // Select same date
    await modal.locator('input#date-input').fill(today);

    // Submit form
    await modal.getByRole('button', { name: /assign task/i }).click();

    // Wait for error message
    await expect(modal.getByText(/already exists/i)).toBeVisible();
  });

  test('should disable assign button when no children exist', async ({ page }) => {
    // Delete the child we created in beforeEach
    const baseURL = page.context().browser()?.browserType().name()
      ? new URL(page.url()).origin
      : 'http://localhost:4201';

    await page.evaluate(
      async ({ apiBase, hid, cid }) => {
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        await fetch(`${apiBase}/api/households/${hid}/children/${cid}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      },
      { apiBase: baseURL, hid: householdId, cid: childId },
    );

    // Navigate to parent dashboard
    await page.goto('/dashboard');

    // Verify "Assign Task" button is disabled
    const assignButton = page.getByRole('button', { name: /assign task/i });
    await expect(assignButton).toBeDisabled();
  });
});
