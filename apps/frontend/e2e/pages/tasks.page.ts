import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Filter types matching the Tasks component
 */
export type TaskFilter = 'all' | 'mine' | 'person' | 'completed';

/**
 * Page Object for the Tasks screen
 *
 * Provides access to:
 * - Filter tabs (All, My Tasks, By Person, Completed)
 * - Person selector dropdown (for By Person filter)
 * - Task cards listing
 * - Task completion and editing
 * - Navigation
 */
export class TasksPage extends BasePage {
  // Filter tabs
  readonly filterTabs: Locator;
  readonly filterAll: Locator;
  readonly filterMine: Locator;
  readonly filterByPerson: Locator;
  readonly filterCompleted: Locator;

  // Person selector (for By Person filter)
  readonly personSelector: Locator;

  // Task list
  readonly tasksList: Locator;
  readonly taskCards: Locator;
  readonly emptyState: Locator;

  // Edit task modal
  readonly editTaskModal: Locator;
  readonly editTaskNameInput: Locator;
  readonly editTaskPointsInput: Locator;
  readonly editTaskAssigneeSelect: Locator;
  readonly editTaskSaveButton: Locator;
  readonly editTaskDeleteButton: Locator;
  readonly editTaskCancelButton: Locator;

  // Loading and error
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Filter tabs
    this.filterTabs = page.locator('.filter-tabs, [role="tablist"], [data-testid="filter-tabs"]');
    this.filterAll = page.locator(
      'button:has-text("All"), [role="tab"]:has-text("All"), [data-testid="filter-all"]',
    );
    this.filterMine = page.locator(
      'button:has-text("My Tasks"), [role="tab"]:has-text("My Tasks"), [data-testid="filter-mine"]',
    );
    this.filterByPerson = page.locator(
      'button:has-text("By Person"), [role="tab"]:has-text("By Person"), [data-testid="filter-person"]',
    );
    this.filterCompleted = page.locator(
      'button:has-text("Completed"), [role="tab"]:has-text("Completed"), [data-testid="filter-completed"]',
    );

    // Person selector
    this.personSelector = page.locator('select[name="person"], [data-testid="person-selector"]');

    // Task list
    this.tasksList = page.locator('.tasks-list, [data-testid="tasks-list"]');
    this.taskCards = page.locator('app-task-card');
    this.emptyState = page.locator(
      '.empty-state, [data-testid="empty-state"], p:has-text("No tasks")',
    );

    // Edit task modal
    this.editTaskModal = page.locator('app-edit-task-modal, [data-testid="edit-task-modal"]');
    this.editTaskNameInput = this.editTaskModal.locator(
      'input[name="name"], [data-testid="task-name-input"]',
    );
    this.editTaskPointsInput = this.editTaskModal.locator(
      'input[name="points"], [data-testid="task-points-input"]',
    );
    this.editTaskAssigneeSelect = this.editTaskModal.locator(
      'select[name="assignee"], [data-testid="task-assignee-select"]',
    );
    this.editTaskSaveButton = this.editTaskModal.locator(
      'button[type="submit"], button:has-text("Save")',
    );
    this.editTaskDeleteButton = this.editTaskModal.locator('button:has-text("Delete")');
    this.editTaskCancelButton = this.editTaskModal.locator(
      'button:has-text("Cancel"), button[aria-label="Close"]',
    );

    // Loading and error
    this.loadingIndicator = page.locator('[aria-busy="true"], .loading, [data-testid="loading"]');
    this.errorMessage = page.locator(
      '[role="alert"], .error-message, [data-testid="error-message"]',
    );
  }

  /**
   * Navigate to tasks page
   */
  async goto(): Promise<void> {
    await this.page.goto('/household/all-tasks');
    await this.waitForLoad();
  }

  /**
   * Wait for tasks data to load
   */
  async waitForTasksLoad(): Promise<void> {
    // Wait for loading indicator to disappear
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // Loading indicator may not exist if data loads quickly
    });

    // Wait for either task cards or empty state
    await this.page
      .locator('app-task-card, .empty-state, [data-testid="empty-state"]')
      .first()
      .waitFor({ timeout: 10000 })
      .catch(() => {
        // May be on a different filter state
      });
  }

  /**
   * Get the currently active filter
   */
  async getActiveFilter(): Promise<TaskFilter> {
    // Check which tab has active/selected state
    if ((await this.filterAll.getAttribute('aria-selected')) === 'true') return 'all';
    if ((await this.filterMine.getAttribute('aria-selected')) === 'true') return 'mine';
    if ((await this.filterByPerson.getAttribute('aria-selected')) === 'true') return 'person';
    if ((await this.filterCompleted.getAttribute('aria-selected')) === 'true') return 'completed';

    // Fallback: check CSS classes
    if (await this.filterAll.evaluate((el) => el.classList.contains('active'))) return 'all';
    if (await this.filterMine.evaluate((el) => el.classList.contains('active'))) return 'mine';
    if (await this.filterByPerson.evaluate((el) => el.classList.contains('active')))
      return 'person';
    if (await this.filterCompleted.evaluate((el) => el.classList.contains('active')))
      return 'completed';

    return 'all'; // Default
  }

  /**
   * Select a filter tab
   */
  async selectFilter(filter: TaskFilter): Promise<void> {
    switch (filter) {
      case 'all':
        await this.filterAll.click();
        break;
      case 'mine':
        await this.filterMine.click();
        break;
      case 'person':
        await this.filterByPerson.click();
        break;
      case 'completed':
        await this.filterCompleted.click();
        break;
    }
    await this.waitForTasksLoad();
  }

  /**
   * Select a person from the dropdown (when on By Person filter)
   */
  async selectPerson(personName: string): Promise<void> {
    // First ensure we're on the By Person filter
    await this.selectFilter('person');

    // Wait for person selector to be visible
    await this.personSelector.waitFor({ state: 'visible' });

    // Select by visible text
    await this.personSelector.selectOption({ label: personName });
    await this.waitForTasksLoad();
  }

  /**
   * Get count of visible task cards
   */
  async getTaskCount(): Promise<number> {
    return this.taskCards.count();
  }

  /**
   * Get task card by name
   */
  getTaskCardByName(name: string): Locator {
    return this.page.locator(`app-task-card:has-text("${name}")`);
  }

  /**
   * Check if a task is visible
   */
  async isTaskVisible(taskName: string): Promise<boolean> {
    return this.getTaskCardByName(taskName).isVisible();
  }

  /**
   * Complete a task
   */
  async completeTask(taskName: string): Promise<void> {
    const card = this.getTaskCardByName(taskName);
    const completeButton = card.locator(
      'button[aria-label*="complete" i], input[type="checkbox"], button.complete-btn',
    );
    await completeButton.click();
    await this.waitForTasksLoad();
  }

  /**
   * Open task for editing
   */
  async openTaskForEdit(taskName: string): Promise<void> {
    const card = this.getTaskCardByName(taskName);
    await card.click();
    await this.editTaskModal.waitFor({ state: 'visible' });
  }

  /**
   * Update task details in edit modal
   */
  async updateTask(updates: { name?: string; points?: number; assignee?: string }): Promise<void> {
    if (updates.name) {
      await this.editTaskNameInput.clear();
      await this.editTaskNameInput.fill(updates.name);
    }
    if (updates.points !== undefined) {
      await this.editTaskPointsInput.clear();
      await this.editTaskPointsInput.fill(updates.points.toString());
    }
    if (updates.assignee) {
      await this.editTaskAssigneeSelect.selectOption({ label: updates.assignee });
    }

    await this.editTaskSaveButton.click();
    await this.editTaskModal.waitFor({ state: 'hidden' });
    await this.waitForTasksLoad();
  }

  /**
   * Delete task via edit modal
   */
  async deleteTask(taskName: string): Promise<void> {
    await this.openTaskForEdit(taskName);
    await this.editTaskDeleteButton.click();

    // Handle confirmation dialog if present
    const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }

    await this.editTaskModal.waitFor({ state: 'hidden' });
    await this.waitForTasksLoad();
  }

  /**
   * Close edit modal without saving
   */
  async closeEditModal(): Promise<void> {
    await this.editTaskCancelButton.click();
    await this.editTaskModal.waitFor({ state: 'hidden' });
  }

  /**
   * Check if empty state is displayed
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return this.emptyState.isVisible();
  }

  /**
   * Get empty state message
   */
  async getEmptyStateMessage(): Promise<string> {
    if (await this.isEmptyStateVisible()) {
      return (await this.emptyState.textContent()) || '';
    }
    return '';
  }

  /**
   * Check if an error is displayed
   */
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }

  /**
   * Get all visible task names
   */
  async getVisibleTaskNames(): Promise<string[]> {
    const cards = await this.taskCards.all();
    const names: string[] = [];
    for (const card of cards) {
      const nameEl = card.locator('.task-name, h3, [data-testid="task-name"]');
      const text = await nameEl.textContent();
      if (text) names.push(text.trim());
    }
    return names;
  }
}
