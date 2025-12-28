import { Page } from '@playwright/test';

/**
 * Login a user via the login form
 * Navigates to login page, fills credentials, submits, and waits for redirect
 */
export async function loginAsUser(page: Page, email: string, password: string): Promise<void> {
  // Navigate to login page
  await page.goto('/login');

  // Fill in credentials
  await page.getByLabel(/email/i).fill(email);
  await page.locator('#password').fill(password);

  // Check "Remember me" to store in localStorage (required for E2E tests)
  await page.getByLabel(/remember me/i).check();

  // Submit form
  await page.getByRole('button', { name: /log in/i }).click();

  // Wait for successful redirect (away from login page)
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
}

/**
 * Login as a parent user
 * Alias for loginAsUser - parents login with email/password
 */
export async function loginAsParent(page: Page, email: string, password: string): Promise<void> {
  return loginAsUser(page, email, password);
}

/**
 * Login as a child user
 * First logs in with parent credentials, then selects child profile
 *
 * @param page - Playwright page
 * @param parentEmail - Parent's email
 * @param parentPassword - Parent's password
 * @param childId - The child's ID to switch to
 */
export async function loginAsChild(
  page: Page,
  parentEmail: string,
  parentPassword: string,
  childId: string,
): Promise<void> {
  // First login as parent
  await loginAsUser(page, parentEmail, parentPassword);

  // Navigate to child login/switch page
  await page.goto(`/child-login?childId=${childId}`);

  // Wait for child context to be set
  await page.waitForURL((url) => !url.pathname.includes('/child-login'), { timeout: 10000 });
}

/**
 * Register a new user via the registration form
 * Navigates to register page, fills credentials, submits, and waits for redirect
 */
export async function registerUser(page: Page, email: string, password: string): Promise<void> {
  // Navigate to registration page
  await page.goto('/register');

  // Fill in credentials
  await page.getByLabel(/email/i).fill(email);
  await page.getByRole('textbox', { name: /^password$/i }).fill(password);
  await page.getByRole('textbox', { name: /confirm password/i }).fill(password);

  // Submit form
  await page.getByRole('button', { name: /create account|register|sign up/i }).click();

  // Wait for successful redirect (away from register page)
  await page.waitForURL((url) => !url.pathname.includes('/register'), { timeout: 5000 });
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
  await page.goto('/login');
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
