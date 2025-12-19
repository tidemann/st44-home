import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page Object for the Login page
 */
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByRole('textbox', { name: /email/i });
    this.passwordInput = page.locator('input[type="password"]').first();
    this.rememberMeCheckbox = page.getByLabel(/remember me/i);
    this.loginButton = page.getByRole('button', { name: /log in|sign in/i });
    this.errorMessage = page.locator('[role="alert"], .error-message, .alert-error');
    this.registerLink = page.getByRole('link', { name: /register|sign up/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForLoad();
  }

  async login(email: string, password: string, rememberMe = false): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    if (rememberMe) {
      await this.rememberMeCheckbox.check();
    }

    // Wait a moment for Angular form validation to update button state
    await this.page.waitForTimeout(100);

    // Check if button is enabled before clicking
    const isEnabled = await this.loginButton.isEnabled();
    if (isEnabled) {
      await this.loginButton.click();

      // Wait for navigation or error message
      await Promise.race([
        this.page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 5000 }),
        this.errorMessage.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      ]);

      // Give Angular time to process response and store tokens
      await this.page.waitForTimeout(500);
    }
    // If button is disabled, don't attempt to click it
    // The test should verify the disabled state instead
  }

  async getErrorMessage(): Promise<string | null> {
    try {
      return await this.errorMessage.textContent({ timeout: 2000 });
    } catch {
      return null;
    }
  }

  async clickRegisterLink(): Promise<void> {
    await this.registerLink.click();
  }

  async isLoginButtonEnabled(): Promise<boolean> {
    return await this.loginButton.isEnabled();
  }
}
