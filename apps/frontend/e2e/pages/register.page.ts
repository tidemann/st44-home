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
    this.emailInput = page.getByRole('textbox', { name: /email/i });
    this.passwordInput = page.locator('input[type="password"]').first();
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    this.registerButton = page.getByRole('button', { name: /register|sign up/i });
    this.errorMessage = page.locator('[role="alert"], .error-message, .alert-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/register');
    await this.waitForLoad();
  }

  async register(email: string, password: string, confirmPassword?: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword || password);
    await this.registerButton.click();

    // Wait for navigation or error message
    await Promise.race([
      this.page.waitForURL((url) => !url.pathname.includes('/register'), { timeout: 5000 }),
      this.errorMessage.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
    ]);

    // Give Angular time to process response (if going to login, tokens won't be stored)
    await this.page.waitForTimeout(500);
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
