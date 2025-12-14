import { test, expect } from '@playwright/test';

test.describe('Example E2E', () => {
  test('loads homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigates to register if link exists', async ({ page }) => {
    await page.goto('/');
    const registerLink = page.getByRole('link', { name: /register|sign up/i });
    if (await registerLink.isVisible().catch(() => false)) {
      await registerLink.click();
      await expect(page).toHaveURL(/\/auth\/register/);
    }
  });
});
