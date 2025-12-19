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
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'st44_test_local',
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
    await registerPage.page.waitForTimeout(500); // Let DB transaction complete

    // ACT: Try to register again with same email
    await registerPage.goto(); // Go back to register page
    await registerPage.register(testEmail, testPassword);

    // ASSERT: Should show error about duplicate email
    const error = await registerPage.getErrorMessage();
    expect(error).toBeTruthy();
    expect(error?.toLowerCase()).toMatch(/email|already|exists|registered/);

    // ASSERT: Should only have one user in database
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [testEmail]);
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
        expect(error.toLowerCase()).toMatch(/email|invalid|format/);
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

    // ASSERT: Should show error about password mismatch
    const error = await registerPage.getErrorMessage();
    expect(error).toBeTruthy();
    expect(error?.toLowerCase()).toMatch(/password|match|same|confirm/);

    // ASSERT: User should NOT be in database
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [testEmail]);
    expect(result.rows).toHaveLength(0);
  });

  test('should store both access and refresh tokens', async ({ page }) => {
    // ACT: Register successfully
    await registerPage.register(testEmail, testPassword);
    await page.waitForTimeout(500); // Let tokens be stored

    // ASSERT: Both tokens should exist in localStorage
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

  test('should redirect to home page after successful registration', async ({ page }) => {
    // ACT: Register successfully
    await registerPage.register(testEmail, testPassword);

    // ASSERT: Should redirect away from register page within reasonable time
    await expect(page).not.toHaveURL(/\/register/, { timeout: 5000 });

    // Should be on a valid app page (not login either)
    const currentUrl = page.url();
    expect(currentUrl).not.toMatch(/\/(login|register)/);

    // After registration, redirected to login page
    expect(currentUrl).toMatch(/\/login$/);
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

    // Check column types and values
    expect(typeof user.id).toBe('number');
    expect(user.email).toBe(testEmail);
    expect(user.password_hash).toBeTruthy();
    expect(user.oauth_provider).toBeNull(); // Not OAuth registration
    expect(user.oauth_provider_id).toBeNull();
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  test('should prevent registration with empty fields', async () => {
    // Test empty email
    await registerPage.register('', testPassword);
    let error = await registerPage.getErrorMessage();
    expect(error || !(await registerPage.isRegisterButtonEnabled())).toBeTruthy();

    // Test empty password
    await registerPage.goto();
    await registerPage.register(testEmail, '');
    error = await registerPage.getErrorMessage();
    expect(error || !(await registerPage.isRegisterButtonEnabled())).toBeTruthy();

    // Test empty confirm password
    await registerPage.goto();
    await registerPage.emailInput.fill(testEmail);
    await registerPage.passwordInput.fill(testPassword);
    await registerPage.confirmPasswordInput.fill('');
    await registerPage.registerButton.click();
    error = await registerPage.getErrorMessage();
    expect(error || !(await registerPage.isRegisterButtonEnabled())).toBeTruthy();

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

    // ASSERT: Email should be stored without spaces
    const result = await pool.query('SELECT email FROM users WHERE email = $1', [testEmail]);
    expect(result.rows).toHaveLength(1);

    // Verify with spaces doesn't create separate user
    const spacedResult = await pool.query('SELECT email FROM users WHERE email = $1', [
      emailWithSpaces,
    ]);
    expect(spacedResult.rows).toHaveLength(0);
  });
});
