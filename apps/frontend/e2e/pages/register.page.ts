import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page Object for the Registration page
 */
export class RegisterPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly registerButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/^password$/i);
    this.confirmPasswordInput = page.getByLabel(/confirm password/i);
    this.registerButton = page.getByRole('button', { name: /register|sign up/i });
    this.errorMessage = page.locator('[role="alert"], .error-message, .alert-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/auth/register');
    await this.waitForLoad();
  }

  async register(email: string, password: string, confirmPassword?: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword || password);
    await this.registerButton.click();
  }

  async getErrorMessage(): Promise<string | null> {
    try {
      return await this.errorMessage.textContent({ timeout: 2000 });
    } catch {
      return null;
    }
  }

  async isRegisterButtonEnabled(): Promise<boolean> {
    return await this.registerButton.isEnabled();
  }
}
