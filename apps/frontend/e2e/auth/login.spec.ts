import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import {
  resetTestDatabase,
  createTestUser,
  generateTestEmail,
  generateTestPassword,
} from '../helpers/test-helpers';

/**
 * Login Flow E2E Tests
 * Tests the complete user login flow including authentication,
 * token storage, session management, and error handling.
 */

test.describe('User Login Flow', () => {
  let loginPage: LoginPage;
  let testEmail: string;
  let testPassword: string;

  test.beforeEach(async ({ page }) => {
    // Reset database and create test user
    await resetTestDatabase();
    testEmail = generateTestEmail();
    testPassword = generateTestPassword();
    await createTestUser(testEmail, testPassword);

    // Initialize page object
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // ACT: Login with valid credentials
    await loginPage.login(testEmail, testPassword);

    // ASSERT: Should redirect away from login page
    await expect(page).not.toHaveURL(/\/login/);

    // ASSERT: Access token should be stored
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(accessToken).toBeTruthy();
    expect(accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT format
  });

  test('should reject login with invalid email', async () => {
    const invalidEmail = 'nonexistent@example.com';

    // ACT: Try to login with invalid email
    await loginPage.login(invalidEmail, testPassword);

    // ASSERT: Should show error message
    const error = await loginPage.getErrorMessage();
    expect(error).toBeTruthy();
    expect(error?.toLowerCase()).toMatch(/invalid|incorrect|wrong|credentials/);

    // ASSERT: Should still be on login page
    await expect(loginPage.page).toHaveURL(/\/login/);

    // ASSERT: No token should be stored
    const accessToken = await loginPage.page.evaluate(() => localStorage.getItem('accessToken'));
    expect(accessToken).toBeNull();
  });

  test('should reject login with wrong password', async () => {
    const wrongPassword = 'WrongPassword123!';

    // ACT: Try to login with wrong password
    await loginPage.login(testEmail, wrongPassword);

    // ASSERT: Should show error message
    const error = await loginPage.getErrorMessage();
    expect(error).toBeTruthy();
    expect(error?.toLowerCase()).toMatch(/invalid|incorrect|wrong|credentials/);

    // ASSERT: Should still be on login page
    await expect(loginPage.page).toHaveURL(/\/auth\/login/);

    // ASSERT: No token should be stored
    const accessToken = await loginPage.page.evaluate(() => localStorage.getItem('accessToken'));
    expect(accessToken).toBeNull();
  });

  test('should store tokens in localStorage when remember me is checked', async ({ page }) => {
    // ACT: Login with remember me enabled
    await loginPage.login(testEmail, testPassword, true);
    await page.waitForTimeout(500); // Let tokens be stored

    // ASSERT: Tokens should be in localStorage (not sessionStorage)
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('refreshToken'));

    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    // Verify NOT in sessionStorage
    const sessionAccessToken = await page.evaluate(() => sessionStorage.getItem('accessToken'));
    expect(sessionAccessToken).toBeNull();
  });

  test('should store tokens in sessionStorage when remember me is not checked', async ({
    page,
  }) => {
    // ACT: Login WITHOUT remember me
    await loginPage.login(testEmail, testPassword, false);
    await page.waitForTimeout(500); // Let tokens be stored

    // ASSERT: Tokens should be in sessionStorage (not localStorage)
    const sessionAccessToken = await page.evaluate(() => sessionStorage.getItem('accessToken'));
    const sessionRefreshToken = await page.evaluate(() => sessionStorage.getItem('refreshToken'));

    expect(sessionAccessToken).toBeTruthy();
    expect(sessionRefreshToken).toBeTruthy();

    // Verify NOT in localStorage (for accessToken - refreshToken might be there)
    const localAccessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(localAccessToken).toBeNull();
  });

  test('should toggle password visibility', async ({ page }) => {
    // ARRANGE: Fill password field
    await loginPage.passwordInput.fill(testPassword);

    // Initial state should be password (hidden)
    let inputType = await loginPage.passwordInput.getAttribute('type');
    expect(inputType).toBe('password');

    // ACT: Click show/hide password toggle
    const toggleButton = page.getByRole('button', { name: /show|hide|visibility/i });
    if (await toggleButton.isVisible()) {
      await toggleButton.click();

      // ASSERT: Should change to text (visible)
      inputType = await loginPage.passwordInput.getAttribute('type');
      expect(inputType).toBe('text');

      // ACT: Click again to hide
      await toggleButton.click();

      // ASSERT: Should change back to password (hidden)
      inputType = await loginPage.passwordInput.getAttribute('type');
      expect(inputType).toBe('password');
    }
  });

  test('should handle return URL redirect after login', async ({ page }) => {
    const returnUrl = '/dashboard';

    // ARRANGE: Navigate to login with return URL
    await page.goto(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    await loginPage.waitForLoad();

    // ACT: Login successfully
    await loginPage.login(testEmail, testPassword);

    // ASSERT: Should redirect to return URL
    await page.waitForTimeout(500);
    const currentUrl = page.url();
    expect(currentUrl).toContain(returnUrl);
  });

  test('should store both access and refresh tokens', async ({ page }) => {
    // ACT: Login successfully
    await loginPage.login(testEmail, testPassword, true);
    await page.waitForTimeout(500);

    // ASSERT: Both tokens should exist
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('refreshToken'));

    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    // Both should be valid JWT format
    expect(accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(refreshToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

    // They should be different tokens
    expect(accessToken).not.toBe(refreshToken);
  });

  test('should redirect to home page after successful login', async ({ page }) => {
    // ACT: Login successfully
    await loginPage.login(testEmail, testPassword);

    // ASSERT: Should redirect away from login page
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 5000 });

    // Should be on a valid app page
    const currentUrl = page.url();
    expect(currentUrl).not.toMatch(/\/auth\/(login|register)/);

    // Common redirects: home, dashboard, or root
    expect(currentUrl).toMatch(/\/(home|dashboard)?$/);
  });

  test('should prevent login with empty email', async () => {
    // ACT: Try to login with empty email
    await loginPage.login('', testPassword);

    // ASSERT: Should show error or button disabled
    const error = await loginPage.getErrorMessage();
    const isButtonEnabled = await loginPage.isLoginButtonEnabled();

    expect(error || !isButtonEnabled).toBeTruthy();

    // ASSERT: Should still be on login page
    await expect(loginPage.page).toHaveURL(/\/auth\/login/);
  });

  test('should prevent login with empty password', async () => {
    // ACT: Try to login with empty password
    await loginPage.login(testEmail, '');

    // ASSERT: Should show error or button disabled
    const error = await loginPage.getErrorMessage();
    const isButtonEnabled = await loginPage.isLoginButtonEnabled();

    expect(error || !isButtonEnabled).toBeTruthy();

    // ASSERT: Should still be on login page
    await expect(loginPage.page).toHaveURL(/\/auth\/login/);
  });

  test('should navigate to registration page from login', async ({ page }) => {
    // ACT: Click register link
    await loginPage.clickRegisterLink();

    // ASSERT: Should navigate to registration page
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('should handle special characters in email correctly', async ({ page }) => {
    // ARRANGE: Create user with special characters
    const specialEmail = 'test+special_123-abc@sub.example.com';
    await resetTestDatabase();
    await createTestUser(specialEmail, testPassword);

    // ACT: Login with special email
    await loginPage.goto();
    await loginPage.login(specialEmail, testPassword);

    // ASSERT: Should login successfully
    await expect(page).not.toHaveURL(/\/auth\/login/);
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(accessToken).toBeTruthy();
  });

  test('should be case-sensitive for password', async () => {
    const uppercasePassword = testPassword.toUpperCase();

    // ACT: Try to login with wrong case password
    await loginPage.login(testEmail, uppercasePassword);

    // ASSERT: Should fail (password is case-sensitive)
    const error = await loginPage.getErrorMessage();
    expect(error).toBeTruthy();
    await expect(loginPage.page).toHaveURL(/\/auth\/login/);
  });

  test('should handle rapid login attempts gracefully', async () => {
    // ACT: Make multiple rapid login attempts
    for (let i = 0; i < 3; i++) {
      await loginPage.login('wrong@email.com', 'WrongPassword123!');
      await loginPage.page.waitForTimeout(100);
    }

    // ASSERT: Should still show error (not crash)
    const error = await loginPage.getErrorMessage();
    expect(error).toBeTruthy();

    // Should still be on login page
    await expect(loginPage.page).toHaveURL(/\/auth\/login/);
  });

  test('should clear form errors after successful login', async ({ page }) => {
    // ARRANGE: Trigger an error first
    await loginPage.login('wrong@email.com', 'WrongPassword123!');
    await page.waitForTimeout(300);
    let error = await loginPage.getErrorMessage();
    expect(error).toBeTruthy();

    // ACT: Login successfully
    await loginPage.goto(); // Refresh to clear form
    await loginPage.login(testEmail, testPassword);

    // ASSERT: Should succeed without error
    await expect(page).not.toHaveURL(/\/auth\/login/);
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(accessToken).toBeTruthy();
  });
});
