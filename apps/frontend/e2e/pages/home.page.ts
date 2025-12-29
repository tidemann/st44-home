import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page Object for the Home/Dashboard screen
 *
 * Provides access to:
 * - Greeting and user info
 * - Stats cards (active tasks, week progress, total points)
 * - Today's tasks section
 * - Upcoming tasks section
 * - Quick-add FAB button
 * - Navigation (bottom nav for mobile, sidebar for desktop)
 */
export class HomePage extends BasePage {
  // Selectors
  readonly greeting: Locator;
  readonly userName: Locator;

  // Stats section
  readonly activeTasksStat: Locator;
  readonly weekProgressStat: Locator;
  readonly totalPointsStat: Locator;

  // Tasks sections
  readonly todayTasksSection: Locator;
  readonly upcomingTasksSection: Locator;

  // Task cards
  readonly taskCards: Locator;

  // Quick-add FAB
  readonly quickAddFab: Locator;

  // Quick-add modal
  readonly quickAddModal: Locator;
  readonly quickAddNameInput: Locator;
  readonly quickAddPointsInput: Locator;
  readonly quickAddSubmitButton: Locator;
  readonly quickAddCancelButton: Locator;

  // Edit task modal
  readonly editTaskModal: Locator;
  readonly editTaskNameInput: Locator;
  readonly editTaskPointsInput: Locator;
  readonly editTaskSaveButton: Locator;
  readonly editTaskDeleteButton: Locator;
  readonly editTaskCancelButton: Locator;

  // Navigation
  readonly bottomNav: Locator;
  readonly sidebarNav: Locator;
  readonly navHomeButton: Locator;
  readonly navTasksButton: Locator;
  readonly navFamilyButton: Locator;
  readonly navProgressButton: Locator;

  // Loading and error states
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Greeting
    this.greeting = page.locator('h1, [data-testid="greeting"]').first();
    this.userName = page.locator('[data-testid="user-name"]');

    // Stats cards
    this.activeTasksStat = page.locator(
      '[data-testid="stat-active-tasks"], app-stat-card:has-text("Active")',
    );
    this.weekProgressStat = page.locator(
      '[data-testid="stat-week-progress"], app-stat-card:has-text("Week")',
    );
    this.totalPointsStat = page.locator(
      '[data-testid="stat-total-points"], app-stat-card:has-text("Points")',
    );

    // Task sections
    this.todayTasksSection = page.locator('section:has-text("Today"), [data-testid="today-tasks"]');
    this.upcomingTasksSection = page.locator(
      'section:has-text("Coming Up"), [data-testid="upcoming-tasks"]',
    );

    // Task cards
    this.taskCards = page.locator('app-task-card');

    // Quick-add FAB
    this.quickAddFab = page.locator(
      'button[aria-label*="Add"], button.fab, [data-testid="quick-add-fab"]',
    );

    // Quick-add modal
    this.quickAddModal = page.locator('app-quick-add-modal, [data-testid="quick-add-modal"]');
    this.quickAddNameInput = this.quickAddModal.locator(
      'input[type="text"], input[name="name"], [data-testid="task-name-input"]',
    );
    this.quickAddPointsInput = this.quickAddModal.locator(
      'input[type="number"], input[name="points"], [data-testid="task-points-input"]',
    );
    this.quickAddSubmitButton = this.quickAddModal.locator(
      'button[type="submit"], button:has-text("Add"), button:has-text("Create")',
    );
    this.quickAddCancelButton = this.quickAddModal.locator(
      'button:has-text("Cancel"), button[aria-label="Close"]',
    );

    // Edit task modal
    this.editTaskModal = page.locator('app-edit-task-modal, [data-testid="edit-task-modal"]');
    this.editTaskNameInput = this.editTaskModal.locator(
      'input[type="text"], input[name="name"], [data-testid="task-name-input"]',
    );
    this.editTaskPointsInput = this.editTaskModal.locator(
      'input[type="number"], input[name="points"], [data-testid="task-points-input"]',
    );
    this.editTaskSaveButton = this.editTaskModal.locator(
      'button[type="submit"], button:has-text("Save")',
    );
    this.editTaskDeleteButton = this.editTaskModal.locator('button:has-text("Delete")');
    this.editTaskCancelButton = this.editTaskModal.locator(
      'button:has-text("Cancel"), button[aria-label="Close"]',
    );

    // Navigation - bottom nav (mobile)
    // Use nav.bottom-nav for visibility checks (inner nav element has CSS visibility rules)
    this.bottomNav = page.locator('nav.bottom-nav');
    // Use getByRole for accessible button selection - works with both navs since we click visible ones
    this.navHomeButton = page.getByRole('button', { name: 'Home' });
    this.navTasksButton = page.getByRole('button', { name: 'Tasks' });
    this.navFamilyButton = page.getByRole('button', { name: 'Family' });
    this.navProgressButton = page.getByRole('button', { name: 'Progress' });

    // Sidebar nav (desktop)
    // Use nav.sidebar-nav for visibility checks (inner nav element has CSS visibility rules)
    this.sidebarNav = page.locator('nav.sidebar-nav');

    // Loading and error
    this.loadingIndicator = page.locator('[aria-busy="true"], .loading, [data-testid="loading"]');
    this.errorMessage = page.locator(
      '[role="alert"], .error-message, [data-testid="error-message"]',
    );
  }

  /**
   * Navigate to home page
   */
  async goto(): Promise<void> {
    await this.page.goto('/home');
    await this.waitForLoad();
  }

  /**
   * Wait for dashboard data to load
   */
  async waitForDashboardLoad(): Promise<void> {
    // Wait for loading indicator to disappear
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // Loading indicator may not exist if data loads quickly
    });

    // Wait for either task cards or empty state to appear
    await this.page
      .locator('app-task-card, .empty-state, [data-testid="no-tasks"]')
      .first()
      .waitFor({ timeout: 10000 })
      .catch(() => {
        // May not have tasks - that's ok
      });
  }

  /**
   * Get greeting text
   */
  async getGreeting(): Promise<string> {
    return (await this.greeting.textContent()) || '';
  }

  /**
   * Get active tasks count from stats
   */
  async getActiveTasksCount(): Promise<number> {
    const text = await this.activeTasksStat.textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * Get week progress percentage
   */
  async getWeekProgress(): Promise<number> {
    const text = await this.weekProgressStat.textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * Get total points from stats
   */
  async getTotalPoints(): Promise<number> {
    const text = await this.totalPointsStat.textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * Get all today's task cards
   */
  async getTodayTaskCards(): Promise<Locator[]> {
    const count = await this.todayTasksSection.locator('app-task-card').count();
    const cards: Locator[] = [];
    for (let i = 0; i < count; i++) {
      cards.push(this.todayTasksSection.locator('app-task-card').nth(i));
    }
    return cards;
  }

  /**
   * Get task card by name
   */
  getTaskCardByName(name: string): Locator {
    return this.page.locator(`app-task-card:has-text("${name}")`);
  }

  /**
   * Complete a task by clicking its checkbox/complete button
   */
  async completeTask(taskName: string): Promise<void> {
    const card = this.getTaskCardByName(taskName);
    const completeButton = card.locator(
      'button[aria-label*="complete" i], input[type="checkbox"], button.complete-btn',
    );
    await completeButton.click();
  }

  /**
   * Click edit on a task card
   */
  async editTask(taskName: string): Promise<void> {
    const card = this.getTaskCardByName(taskName);
    await card.click(); // Click the card to open edit modal
  }

  /**
   * Open quick-add modal via FAB
   */
  async openQuickAdd(): Promise<void> {
    await this.quickAddFab.click();
    await this.quickAddModal.waitFor({ state: 'visible' });
  }

  /**
   * Create a task via quick-add modal
   */
  async quickAddTask(name: string, points: number = 10): Promise<void> {
    await this.openQuickAdd();
    await this.quickAddNameInput.fill(name);
    await this.quickAddPointsInput.fill(points.toString());
    await this.quickAddSubmitButton.click();
    await this.quickAddModal.waitFor({ state: 'hidden' });
  }

  /**
   * Click the first visible navigation button matching the role
   * Handles both mobile (bottom-nav) and desktop (sidebar-nav) layouts
   */
  private async clickVisibleNavButton(button: Locator): Promise<void> {
    // Get count of matching buttons
    const count = await button.count();

    // Find and click the first visible one
    for (let i = 0; i < count; i++) {
      const btn = button.nth(i);
      if (await btn.isVisible()) {
        await btn.click();
        return;
      }
    }

    // If none visible, click the first one (fallback)
    await button.first().click();
  }

  /**
   * Navigate to Tasks screen
   */
  async goToTasks(): Promise<void> {
    await this.clickVisibleNavButton(this.navTasksButton);
    await this.page.waitForURL(/\/(tasks|household\/all-tasks)/);
  }

  /**
   * Navigate to Family screen
   */
  async goToFamily(): Promise<void> {
    await this.clickVisibleNavButton(this.navFamilyButton);
    await this.page.waitForURL(/\/family/);
  }

  /**
   * Navigate to Progress screen
   */
  async goToProgress(): Promise<void> {
    await this.clickVisibleNavButton(this.navProgressButton);
    await this.page.waitForURL(/\/progress/);
  }

  /**
   * Check if an error is displayed
   */
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }

  /**
   * Get error message text
   */
  async getErrorText(): Promise<string> {
    if (await this.hasError()) {
      return (await this.errorMessage.textContent()) || '';
    }
    return '';
  }

  /**
   * Check if loading indicator is visible
   */
  async isLoading(): Promise<boolean> {
    return this.loadingIndicator.isVisible();
  }
}
