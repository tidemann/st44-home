import { Page } from '@playwright/test';

/**
 * Login a user via the login form
 * Navigates to login page, fills credentials, submits, and waits for redirect
 */
export async function loginAsUser(page: Page, email: string, password: string): Promise<void> {
  // Navigate to login page
  await page.goto('/auth/login');

  // Fill in credentials
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);

  // Submit form
  await page.getByRole('button', { name: /log in|sign in/i }).click();

  // Wait for successful redirect (away from login page)
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 5000 });
}

/**
 * Register a new user via the registration form
 * Navigates to register page, fills credentials, submits, and waits for redirect
 */
export async function registerUser(page: Page, email: string, password: string): Promise<void> {
  // Navigate to registration page
  await page.goto('/auth/register');

  // Fill in credentials
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByLabel(/confirm password/i).fill(password);

  // Submit form
  await page.getByRole('button', { name: /register|sign up/i }).click();

  // Wait for successful redirect (away from register page)
  await page.waitForURL((url) => !url.pathname.includes('/auth/register'), { timeout: 5000 });
}

/**
 * Logout the current user
 * Clears localStorage tokens and navigates to login
 */
export async function logout(page: Page): Promise<void> {
  // Clear tokens from storage
  await page.evaluate(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.clear();
  });

  // Navigate to login page
  await page.goto('/auth/login');
}

/**
 * Check if user is authenticated by verifying token exists
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => localStorage.getItem('accessToken'));
  return !!token;
}

/**
 * Get the current user's access token from localStorage
 */
export async function getAccessToken(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem('accessToken'));
}
