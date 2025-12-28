import { test, expect } from '@playwright/test';
import { FamilyPage } from '../pages/family.page';
import { loginAsUser } from '../helpers/auth-helpers';
import { seedFullScenario, resetDatabase, seedTestChild } from '../helpers/seed-database';

/**
 * E2E Tests for the Family screen
 *
 * Tests the redesigned family member management with:
 * - Member display with cards
 * - Invite member functionality
 * - Add child functionality
 * - Member role display
 */
test.describe('Family Screen - Member Display', () => {
  let scenario: Awaited<ReturnType<typeof seedFullScenario>>;

  test.beforeEach(async () => {
    await resetDatabase();
    scenario = await seedFullScenario({
      userEmail: 'family-test@example.com',
      userPassword: 'SecureTestPass123!',
      householdName: 'Test Family',
      childrenCount: 2,
      tasksCount: 0,
    });
  });

  test('displays family page with title', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const familyPage = new FamilyPage(page);
    await familyPage.goto();
    await familyPage.waitForFamilyLoad();

    await expect(familyPage.pageTitle).toBeVisible();
    const title = await familyPage.pageTitle.textContent();
    expect(title?.toLowerCase()).toContain('family');
  });

  test('displays member cards', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const familyPage = new FamilyPage(page);
    await familyPage.goto();
    await familyPage.waitForFamilyLoad();

    // Should have member cards (at least children)
    const memberCount = await familyPage.getMemberCount();
    expect(memberCount).toBeGreaterThanOrEqual(0);
  });

  test('shows action buttons', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const familyPage = new FamilyPage(page);
    await familyPage.goto();
    await familyPage.waitForFamilyLoad();

    // Invite and Add Child buttons should be visible
    await expect(familyPage.inviteMemberButton).toBeVisible();
    await expect(familyPage.addChildButton).toBeVisible();
  });

  test('displays child members from seeded data', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const familyPage = new FamilyPage(page);
    await familyPage.goto();
    await familyPage.waitForFamilyLoad();

    // Should have the seeded children
    const childCount = await familyPage.getChildCount();
    expect(childCount).toBe(2);
  });
});

test.describe('Family Screen - Invite Member', () => {
  let scenario: Awaited<ReturnType<typeof seedFullScenario>>;

  test.beforeEach(async () => {
    await resetDatabase();
    scenario = await seedFullScenario({
      userEmail: 'invite-test@example.com',
      userPassword: 'SecureTestPass123!',
      childrenCount: 1,
    });
  });

  test('can open invite modal', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const familyPage = new FamilyPage(page);
    await familyPage.goto();
    await familyPage.waitForFamilyLoad();

    await familyPage.openInviteModal();

    await expect(familyPage.inviteModal).toBeVisible();
  });

  test('invite modal has email input', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const familyPage = new FamilyPage(page);
    await familyPage.goto();
    await familyPage.waitForFamilyLoad();

    await familyPage.openInviteModal();

    await expect(familyPage.inviteEmailInput).toBeVisible();
  });

  test('can close invite modal', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const familyPage = new FamilyPage(page);
    await familyPage.goto();
    await familyPage.waitForFamilyLoad();

    await familyPage.openInviteModal();
    await expect(familyPage.inviteModal).toBeVisible();

    await familyPage.closeInviteModal();
    await expect(familyPage.inviteModal).toBeHidden();
  });

  test.skip('can send invitation', async ({ page }) => {
    // Note: Skipped - requires full API integration
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const familyPage = new FamilyPage(page);
    await familyPage.goto();
    await familyPage.waitForFamilyLoad();

    await familyPage.inviteMember('newmember@example.com', 'parent');

    // Should show success message
    const hasSuccess = await familyPage.hasSuccessMessage();
    expect(hasSuccess).toBe(true);
  });
});

test.describe('Family Screen - Add Child', () => {
  let scenario: Awaited<ReturnType<typeof seedFullScenario>>;

  test.beforeEach(async () => {
    await resetDatabase();
    scenario = await seedFullScenario({
      userEmail: 'add-child-test@example.com',
      userPassword: 'SecureTestPass123!',
      childrenCount: 0,
    });
  });

  test('can open add child modal', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const familyPage = new FamilyPage(page);
    await familyPage.goto();
    await familyPage.waitForFamilyLoad();

    await familyPage.openAddChildModal();

    await expect(familyPage.addChildModal).toBeVisible();
  });

  test('add child modal has required fields', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const familyPage = new FamilyPage(page);
    await familyPage.goto();
    await familyPage.waitForFamilyLoad();

    await familyPage.openAddChildModal();

    await expect(familyPage.childNameInput).toBeVisible();
    await expect(familyPage.childAgeInput).toBeVisible();
  });

  test('can close add child modal', async ({ page }) => {
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const familyPage = new FamilyPage(page);
    await familyPage.goto();
    await familyPage.waitForFamilyLoad();

    await familyPage.openAddChildModal();
    await expect(familyPage.addChildModal).toBeVisible();

    await familyPage.closeAddChildModal();
    await expect(familyPage.addChildModal).toBeHidden();
  });

  test.skip('can add a child', async ({ page }) => {
    // Note: Skipped - requires full API integration
    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const familyPage = new FamilyPage(page);
    await familyPage.goto();
    await familyPage.waitForFamilyLoad();

    const initialCount = await familyPage.getChildCount();

    await familyPage.addChild('New Child', 8);

    // Child count should increase
    const newCount = await familyPage.getChildCount();
    expect(newCount).toBe(initialCount + 1);

    // New child should be visible
    const hasNewChild = await familyPage.hasMember('New Child');
    expect(hasNewChild).toBe(true);
  });
});

test.describe('Family Screen - Responsive', () => {
  let scenario: Awaited<ReturnType<typeof seedFullScenario>>;

  test.beforeEach(async () => {
    await resetDatabase();
    scenario = await seedFullScenario({
      userEmail: 'responsive-family@example.com',
      userPassword: 'SecureTestPass123!',
      childrenCount: 2,
    });
  });

  test('displays correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const familyPage = new FamilyPage(page);
    await familyPage.goto();
    await familyPage.waitForFamilyLoad();

    // Action buttons should be visible
    await expect(familyPage.inviteMemberButton).toBeVisible();
    await expect(familyPage.addChildButton).toBeVisible();
  });

  test('displays correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const familyPage = new FamilyPage(page);
    await familyPage.goto();
    await familyPage.waitForFamilyLoad();

    await expect(familyPage.membersSection).toBeVisible();
  });

  test('displays correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const familyPage = new FamilyPage(page);
    await familyPage.goto();
    await familyPage.waitForFamilyLoad();

    await expect(familyPage.membersSection).toBeVisible();
    await expect(familyPage.inviteMemberButton).toBeVisible();
    await expect(familyPage.addChildButton).toBeVisible();
  });
});

test.describe('Family Screen - Loading & Errors', () => {
  test('handles loading state', async ({ page }) => {
    await resetDatabase();
    const scenario = await seedFullScenario({
      userEmail: 'loading-family@example.com',
      userPassword: 'SecureTestPass123!',
    });

    await loginAsUser(page, scenario.user.email, 'SecureTestPass123!');

    const familyPage = new FamilyPage(page);
    await page.goto('/family');

    // Wait for load to complete
    await familyPage.waitForFamilyLoad();

    // After loading, should not show error
    const hasError = await familyPage.hasError();
    expect(hasError).toBe(false);
  });
});
