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

    await this.loginButton.click();
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
