import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Family member data
 */
export interface FamilyMember {
  name: string;
  role: 'parent' | 'child';
  avatar?: string;
}

/**
 * Page Object for the Family screen
 *
 * Provides access to:
 * - Family members list
 * - Invite member modal
 * - Add child modal
 * - Member cards with details
 */
export class FamilyPage extends BasePage {
  // Page header
  readonly pageTitle: Locator;

  // Actions
  readonly inviteMemberButton: Locator;
  readonly addChildButton: Locator;

  // Members list
  readonly membersSection: Locator;
  readonly memberCards: Locator;
  readonly parentCards: Locator;
  readonly childCards: Locator;

  // Invite modal
  readonly inviteModal: Locator;
  readonly inviteEmailInput: Locator;
  readonly inviteRoleSelect: Locator;
  readonly inviteSendButton: Locator;
  readonly inviteCancelButton: Locator;

  // Add child modal
  readonly addChildModal: Locator;
  readonly childNameInput: Locator;
  readonly childAgeInput: Locator;
  readonly childAvatarSelect: Locator;
  readonly addChildSubmitButton: Locator;
  readonly addChildCancelButton: Locator;

  // Success/error messages
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  // Loading
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    super(page);

    // Page header
    this.pageTitle = page.locator('h1, [data-testid="page-title"]');

    // Action buttons
    this.inviteMemberButton = page.locator(
      'button:has-text("Invite"), button:has-text("Add Member"), [data-testid="invite-member-btn"]',
    );
    this.addChildButton = page.locator(
      'button:has-text("Add Child"), [data-testid="add-child-btn"]',
    );

    // Members section
    this.membersSection = page.locator('.members-section, [data-testid="members-section"]');
    this.memberCards = page.locator('app-member-card, [data-testid="member-card"]');
    this.parentCards = page.locator(
      'app-member-card[data-role="parent"], [data-testid="member-card"][data-role="parent"]',
    );
    this.childCards = page.locator(
      'app-member-card[data-role="child"], [data-testid="member-card"][data-role="child"]',
    );

    // Invite modal
    this.inviteModal = page.locator('app-invite-modal, [data-testid="invite-modal"]');
    this.inviteEmailInput = this.inviteModal.locator(
      'input[type="email"], input[name="email"], [data-testid="invite-email-input"]',
    );
    this.inviteRoleSelect = this.inviteModal.locator(
      'select[name="role"], [data-testid="invite-role-select"]',
    );
    this.inviteSendButton = this.inviteModal.locator(
      'button[type="submit"], button:has-text("Send"), button:has-text("Invite")',
    );
    this.inviteCancelButton = this.inviteModal.locator(
      'button:has-text("Cancel"), button[aria-label="Close"]',
    );

    // Add child modal
    this.addChildModal = page.locator('app-add-child-modal, [data-testid="add-child-modal"]');
    this.childNameInput = this.addChildModal.locator(
      'input[name="name"], [data-testid="child-name-input"]',
    );
    this.childAgeInput = this.addChildModal.locator(
      'input[name="age"], input[type="number"], [data-testid="child-age-input"]',
    );
    this.childAvatarSelect = this.addChildModal.locator(
      '.avatar-selector, [data-testid="avatar-selector"]',
    );
    this.addChildSubmitButton = this.addChildModal.locator(
      'button[type="submit"], button:has-text("Add"), button:has-text("Create")',
    );
    this.addChildCancelButton = this.addChildModal.locator(
      'button:has-text("Cancel"), button[aria-label="Close"]',
    );

    // Messages
    this.successMessage = page.locator(
      '.success-message, [data-testid="success-message"], [role="status"]',
    );
    this.errorMessage = page.locator(
      '[role="alert"], .error-message, [data-testid="error-message"]',
    );

    // Loading
    this.loadingIndicator = page.locator('[aria-busy="true"], .loading, [data-testid="loading"]');
  }

  /**
   * Navigate to family page
   */
  async goto(): Promise<void> {
    await this.page.goto('/family');
    await this.waitForLoad();
  }

  /**
   * Wait for family data to load
   */
  async waitForFamilyLoad(): Promise<void> {
    // Wait for loading to complete
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // May not have loading indicator
    });

    // Wait for members section to appear
    await this.membersSection.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      // Section might not be present if no members
    });
  }

  /**
   * Get all family members
   */
  async getMembers(): Promise<FamilyMember[]> {
    const members: FamilyMember[] = [];
    const count = await this.memberCards.count();

    for (let i = 0; i < count; i++) {
      const card = this.memberCards.nth(i);

      const name =
        (
          await card.locator('.member-name, h3, [data-testid="member-name"]').textContent()
        )?.trim() || '';

      const roleText = await card.getAttribute('data-role');
      const role = roleText === 'parent' ? 'parent' : 'child';

      const avatar =
        (await card.locator('.avatar, [data-testid="avatar"]').getAttribute('src')) || undefined;

      members.push({ name, role, avatar });
    }

    return members;
  }

  /**
   * Get count of members
   */
  async getMemberCount(): Promise<number> {
    return this.memberCards.count();
  }

  /**
   * Get count of parent members
   */
  async getParentCount(): Promise<number> {
    const members = await this.getMembers();
    return members.filter((m) => m.role === 'parent').length;
  }

  /**
   * Get count of child members
   */
  async getChildCount(): Promise<number> {
    const members = await this.getMembers();
    return members.filter((m) => m.role === 'child').length;
  }

  /**
   * Open invite member modal
   */
  async openInviteModal(): Promise<void> {
    await this.inviteMemberButton.click();
    await this.inviteModal.waitFor({ state: 'visible' });
  }

  /**
   * Send invitation
   */
  async inviteMember(email: string, role: 'parent' | 'admin' = 'parent'): Promise<void> {
    await this.openInviteModal();
    await this.inviteEmailInput.fill(email);

    // Select role if dropdown is available
    if (await this.inviteRoleSelect.isVisible()) {
      await this.inviteRoleSelect.selectOption({ label: role });
    }

    await this.inviteSendButton.click();
    await this.inviteModal.waitFor({ state: 'hidden' });
  }

  /**
   * Open add child modal
   */
  async openAddChildModal(): Promise<void> {
    await this.addChildButton.click();
    await this.addChildModal.waitFor({ state: 'visible' });
  }

  /**
   * Add a child
   */
  async addChild(name: string, age: number, avatar?: string): Promise<void> {
    await this.openAddChildModal();
    await this.childNameInput.fill(name);
    await this.childAgeInput.fill(age.toString());

    // Select avatar if provided and selector is available
    if (avatar && (await this.childAvatarSelect.isVisible())) {
      const avatarOption = this.childAvatarSelect.locator(`[data-avatar="${avatar}"]`);
      if (await avatarOption.isVisible()) {
        await avatarOption.click();
      }
    }

    await this.addChildSubmitButton.click();
    await this.addChildModal.waitFor({ state: 'hidden' });
    await this.waitForFamilyLoad();
  }

  /**
   * Close invite modal
   */
  async closeInviteModal(): Promise<void> {
    await this.inviteCancelButton.click();
    await this.inviteModal.waitFor({ state: 'hidden' });
  }

  /**
   * Close add child modal
   */
  async closeAddChildModal(): Promise<void> {
    await this.addChildCancelButton.click();
    await this.addChildModal.waitFor({ state: 'hidden' });
  }

  /**
   * Check if member exists by name
   */
  async hasMember(name: string): Promise<boolean> {
    const members = await this.getMembers();
    return members.some((m) => m.name === name);
  }

  /**
   * Get member card by name
   */
  getMemberCardByName(name: string): Locator {
    return this.page.locator(
      `app-member-card:has-text("${name}"), [data-testid="member-card"]:has-text("${name}")`,
    );
  }

  /**
   * Check if success message is displayed
   */
  async hasSuccessMessage(): Promise<boolean> {
    return this.successMessage.isVisible();
  }

  /**
   * Get success message text
   */
  async getSuccessMessage(): Promise<string> {
    if (await this.hasSuccessMessage()) {
      return (await this.successMessage.textContent()) || '';
    }
    return '';
  }

  /**
   * Check if error message is displayed
   */
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    if (await this.hasError()) {
      return (await this.errorMessage.textContent()) || '';
    }
    return '';
  }
}
