import { test, expect } from '@playwright/test';
import { RegisterPage } from '../pages/register.page';
import {
  resetTestDatabase,
  generateTestEmail,
  generateTestPassword,
} from '../helpers/test-helpers';
import { Pool } from 'pg';

/**
 * Registration Flow E2E Tests
 * Tests the complete user registration flow including form validation,
 * database persistence, password hashing, JWT tokens, and redirects.
 *
 * CRITICAL: These tests prevent production failures like missing users table.
 */

// Database connection for verification queries
const pool = new Pool({
  host: process.env.DB_HOST || 'host.docker.internal',
  port: parseInt(process.env.DB_PORT || '55432'),
  database: process.env.DB_NAME || 'st44_test',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

test.describe('User Registration Flow', () => {
  let registerPage: RegisterPage;
  let testEmail: string;
  let testPassword: string;

  test.beforeEach(async ({ page }) => {
    // Reset database to clean state
    await resetTestDatabase();

    // Initialize page object
    registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Generate unique test credentials
    testEmail = generateTestEmail();
    testPassword = generateTestPassword();
  });

  test.afterAll(async () => {
    await pool.end();
  });

  test('should successfully register a new user with valid credentials', async ({ page }) => {
    // ACT: Fill and submit registration form
    await registerPage.register(testEmail, testPassword);

    // ASSERT: Should redirect to login page (not auto-login)
    await expect(page).toHaveURL(/\/login/);

    // ASSERT: Should show success message
    const successMessage = await page.locator('[role="alert"]').textContent();
    expect(successMessage?.toLowerCase()).toContain('account created');

    // ASSERT: No tokens should be stored yet (user must log in)
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    const sessionToken = await page.evaluate(() => sessionStorage.getItem('accessToken'));
    expect(accessToken).toBeNull();
    expect(sessionToken).toBeNull();

    // ASSERT: User should be in database
    const result = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [
      testEmail,
    ]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].email).toBe(testEmail);

    // ASSERT: Password should be hashed (not plaintext)
    expect(result.rows[0].password_hash).not.toBe(testPassword);
    expect(result.rows[0].password_hash).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt format
  });

  test('should reject registration with weak password', async () => {
    const weakPassword = '123'; // Too short, no complexity

    // ACT: Try to register with weak password
    await registerPage.register(testEmail, weakPassword);

    // ASSERT: Should show error message
    const error = await registerPage.getErrorMessage();
    expect(error).toBeTruthy();
    expect(error?.toLowerCase()).toMatch(/password|weak|length|character/);

    // ASSERT: Should still be on registration page
    await expect(registerPage.page).toHaveURL(/\/register/);

    // ASSERT: User should NOT be in database
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [testEmail]);
    expect(result.rows).toHaveLength(0);
  });

  test('should reject registration with duplicate email', async () => {
    // ARRANGE: Create user first
    await registerPage.register(testEmail, testPassword);
    await registerPage.page.waitForTimeout(1000); // Let DB transaction complete and redirect finish

    // Verify user was created
    let result = await pool.query('SELECT id FROM users WHERE email = $1', [testEmail]);
    expect(result.rows).toHaveLength(1);

    // ACT: Try to register again with same email
    await registerPage.goto(); // Go back to register page
    await registerPage.register(testEmail, testPassword);
    await registerPage.page.waitForTimeout(500);

    // ASSERT: Should show error about duplicate email
    const error = await registerPage.getErrorMessage();
    expect(error).toBeTruthy();
    expect(error?.toLowerCase()).toMatch(/email|already|exists|registered/);

    // ASSERT: Should still have only one user in database
    result = await pool.query('SELECT id FROM users WHERE email = $1', [testEmail]);
    expect(result.rows).toHaveLength(1);
  });

  test('should reject registration with invalid email format', async () => {
    const invalidEmails = [
      'notanemail',
      'missing@domain',
      '@nodomain.com',
      'spaces in@email.com',
      'email@',
    ];

    for (const invalidEmail of invalidEmails) {
      // ARRANGE: Start fresh
      await registerPage.goto();

      // ACT: Try to register with invalid email
      await registerPage.register(invalidEmail, testPassword);

      // ASSERT: Should show error (client-side or server-side)
      const error = await registerPage.getErrorMessage();
      if (error) {
        // Accept generic "bad request" error from Fastify or specific validation error
        expect(error.toLowerCase()).toMatch(/email|invalid|format|bad request/);
      } else {
        // If no error shown, button should be disabled or validation failed
        const isEnabled = await registerPage.isRegisterButtonEnabled();
        expect(isEnabled).toBe(false);
      }

      // ASSERT: User should NOT be in database
      const result = await pool.query('SELECT id FROM users WHERE email = $1', [invalidEmail]);
      expect(result.rows).toHaveLength(0);
    }
  });

  test('should reject registration when passwords do not match', async () => {
    const password1 = 'SecurePassword123!';
    const password2 = 'DifferentPassword456!';

    // ACT: Try to register with mismatched passwords
    await registerPage.register(testEmail, password1, password2);

    // ASSERT: Should show error or prevent submission (frontend validation)
    const error = await registerPage.getErrorMessage();
    const isEnabled = await registerPage.isRegisterButtonEnabled();
    // Either error shown OR button disabled (Angular form validation)
    expect(error || !isEnabled).toBeTruthy();

    // ASSERT: User should NOT be in database
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [testEmail]);
    expect(result.rows).toHaveLength(0);
  });

  test('should redirect to login after registration (no auto-login)', async ({ page }) => {
    // ACT: Register successfully
    await registerPage.register(testEmail, testPassword);
    await page.waitForTimeout(500);

    // ASSERT: Should redirect to login page (security best practice - no auto-login)
    await expect(page).toHaveURL(/\/login/);

    // ASSERT: No tokens should be stored (user must explicitly log in)
    const accessTokenLocal = await page.evaluate(() => localStorage.getItem('accessToken'));
    const accessTokenSession = await page.evaluate(() => sessionStorage.getItem('accessToken'));

    expect(accessTokenLocal).toBeNull();
    expect(accessTokenSession).toBeNull();
  });

  test('should redirect to home page after successful registration', async ({ page }) => {
    // ACT: Register successfully
    await registerPage.register(testEmail, testPassword);

    // ASSERT: Should redirect away from register page within reasonable time
    await expect(page).not.toHaveURL(/\/register/, { timeout: 5000 });

    // Should redirect to login page after registration (no auto-login for security)
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/login/);
  });

  test('should create user with correct database schema', async () => {
    // ACT: Register user
    await registerPage.register(testEmail, testPassword);
    await registerPage.page.waitForTimeout(500);

    // ASSERT: Verify all expected columns exist and have correct types
    const result = await pool.query(
      `SELECT
        id,
        email,
        password_hash,
        oauth_provider,
        oauth_provider_id,
        created_at,
        updated_at
      FROM users
      WHERE email = $1`,
      [testEmail],
    );

    expect(result.rows).toHaveLength(1);
    const user = result.rows[0];

    // Check column types and values (PostgreSQL bigint returns as string in node-postgres)
    expect(typeof user.id).toBe('string');
    expect(user.email).toBe(testEmail);
    expect(user.password_hash).toBeTruthy();
    expect(user.oauth_provider).toBeNull(); // Not OAuth registration
    expect(user.oauth_provider_id).toBeNull();
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  test('should prevent registration with empty fields', async () => {
    // Test empty email - fill fields directly, don't use register() method
    await registerPage.goto();
    await registerPage.emailInput.fill('');
    await registerPage.passwordInput.fill(testPassword);
    await registerPage.confirmPasswordInput.fill(testPassword);
    // Button should be disabled, don't try to click it
    expect(await registerPage.isRegisterButtonEnabled()).toBe(false);

    // Test empty password
    await registerPage.goto();
    await registerPage.emailInput.fill(testEmail);
    await registerPage.passwordInput.fill('');
    await registerPage.confirmPasswordInput.fill(testPassword);
    // Button should be disabled
    expect(await registerPage.isRegisterButtonEnabled()).toBe(false);

    // Test empty confirm password
    await registerPage.goto();
    await registerPage.emailInput.fill(testEmail);
    await registerPage.passwordInput.fill(testPassword);
    await registerPage.confirmPasswordInput.fill('');
    // Button should be disabled
    expect(await registerPage.isRegisterButtonEnabled()).toBe(false);

    // ASSERT: No user created with empty fields
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [testEmail]);
    expect(result.rows).toHaveLength(0);
  });

  test('should handle special characters in email correctly', async () => {
    const specialEmail = `test+special_123-abc@sub.example.com`;

    // ACT: Register with special characters
    await registerPage.register(specialEmail, testPassword);

    // ASSERT: Should succeed and store correctly
    await expect(registerPage.page).not.toHaveURL(/\/register/);

    const result = await pool.query('SELECT email FROM users WHERE email = $1', [specialEmail]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].email).toBe(specialEmail);
  });

  test('should handle long email addresses correctly', async () => {
    const longLocalPart = 'a'.repeat(64); // Max local part length
    const longEmail = `${longLocalPart}@example.com`;

    // ACT: Register with long email
    await registerPage.register(longEmail, testPassword);

    // ASSERT: Should succeed
    const result = await pool.query('SELECT email FROM users WHERE email = $1', [longEmail]);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  test('should trim whitespace from email input', async () => {
    const emailWithSpaces = `  ${testEmail}  `;

    // ACT: Register with spaces around email
    await registerPage.register(emailWithSpaces, testPassword);
    await registerPage.page.waitForTimeout(1000); // Wait for registration and redirect

    // ASSERT: Email should be stored without spaces (trimmed)
    const result = await pool.query('SELECT email FROM users WHERE email = $1', [testEmail]);
    expect(result.rows).toHaveLength(1);

    // Verify with spaces doesn't create separate user
    const spacedResult = await pool.query('SELECT email FROM users WHERE email = $1', [
      emailWithSpaces,
    ]);
    expect(spacedResult.rows).toHaveLength(0);
  });
});
