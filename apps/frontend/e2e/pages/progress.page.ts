import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Leaderboard entry data
 */
export interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  isCurrentUser: boolean;
}

/**
 * Achievement data
 */
export interface Achievement {
  name: string;
  description: string;
  unlocked: boolean;
  progress?: number;
}

/**
 * Page Object for the Progress screen
 *
 * Provides access to:
 * - Leaderboard with rankings
 * - Achievements section
 * - Stats summary
 * - Navigation
 */
export class ProgressPage extends BasePage {
  // Leaderboard section
  readonly leaderboardSection: Locator;
  readonly leaderboardList: Locator;
  readonly leaderboardEntries: Locator;
  readonly currentUserEntry: Locator;

  // Achievements section
  readonly achievementsSection: Locator;
  readonly achievementCards: Locator;
  readonly unlockedAchievements: Locator;
  readonly lockedAchievements: Locator;

  // Stats
  readonly totalPointsStat: Locator;
  readonly tasksCompletedStat: Locator;
  readonly currentStreakStat: Locator;

  // Navigation
  readonly bottomNav: Locator;
  readonly sidebarNav: Locator;

  // Loading and error
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Leaderboard
    this.leaderboardSection = page.locator(
      'section:has-text("Leaderboard"), [data-testid="leaderboard"]',
    );
    this.leaderboardList = page.locator('ol, [role="list"], [data-testid="leaderboard-list"]');
    this.leaderboardEntries = page.locator('ol > li, [data-testid="leaderboard-entry"]');
    this.currentUserEntry = page.locator(
      'li[aria-current="true"], .current-user, [data-testid="current-user-entry"]',
    );

    // Achievements
    this.achievementsSection = page.locator(
      'section:has-text("Achievements"), [data-testid="achievements"]',
    );
    this.achievementCards = page.locator('.achievement-card, [data-testid="achievement"]');
    this.unlockedAchievements = page.locator(
      '.achievement-card.unlocked, [data-testid="achievement"][data-unlocked="true"]',
    );
    this.lockedAchievements = page.locator(
      '.achievement-card.locked, [data-testid="achievement"][data-unlocked="false"]',
    );

    // Stats
    this.totalPointsStat = page.locator('[data-testid="total-points"], .stat:has-text("Points")');
    this.tasksCompletedStat = page.locator(
      '[data-testid="tasks-completed"], .stat:has-text("Completed")',
    );
    this.currentStreakStat = page.locator(
      '[data-testid="current-streak"], .stat:has-text("Streak")',
    );

    // Navigation
    this.bottomNav = page.locator('app-bottom-nav, nav.bottom-nav');
    this.sidebarNav = page.locator('app-sidebar-nav, aside.sidebar');

    // Loading and error
    this.loadingIndicator = page.locator('[aria-busy="true"], .loading, [data-testid="loading"]');
    this.errorMessage = page.locator(
      '[role="alert"], .error-message, [data-testid="error-message"]',
    );
  }

  /**
   * Navigate to progress page
   */
  async goto(): Promise<void> {
    await this.page.goto('/progress');
    await this.waitForLoad();
  }

  /**
   * Wait for progress data to load
   */
  async waitForProgressLoad(): Promise<void> {
    // Wait for loading to complete
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // May not have loading indicator
    });

    // Wait for leaderboard to appear
    await this.leaderboardSection.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Get leaderboard entries
   */
  async getLeaderboardEntries(): Promise<LeaderboardEntry[]> {
    const entries: LeaderboardEntry[] = [];
    const count = await this.leaderboardEntries.count();

    for (let i = 0; i < count; i++) {
      const entry = this.leaderboardEntries.nth(i);

      // Extract rank (usually shown as number or position)
      const rankText = await entry.locator('.rank, [data-testid="rank"]').textContent();
      const rank = rankText ? parseInt(rankText.replace(/[^0-9]/g, ''), 10) || i + 1 : i + 1;

      // Extract name
      const name = (await entry.locator('.name, [data-testid="name"]').textContent())?.trim() || '';

      // Extract points
      const pointsText = await entry.locator('.points, [data-testid="points"]').textContent();
      const points = pointsText ? parseInt(pointsText.replace(/[^0-9]/g, ''), 10) : 0;

      // Check if current user
      const isCurrentUser =
        (await entry.getAttribute('aria-current')) === 'true' ||
        (await entry.evaluate((el) => el.classList.contains('current-user')));

      entries.push({ rank, name, points, isCurrentUser });
    }

    return entries;
  }

  /**
   * Get current user's rank
   */
  async getCurrentUserRank(): Promise<number | null> {
    const entries = await this.getLeaderboardEntries();
    const currentUser = entries.find((e) => e.isCurrentUser);
    return currentUser?.rank || null;
  }

  /**
   * Get current user's points
   */
  async getCurrentUserPoints(): Promise<number | null> {
    const entries = await this.getLeaderboardEntries();
    const currentUser = entries.find((e) => e.isCurrentUser);
    return currentUser?.points || null;
  }

  /**
   * Get achievements
   */
  async getAchievements(): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    const count = await this.achievementCards.count();

    for (let i = 0; i < count; i++) {
      const card = this.achievementCards.nth(i);

      const name =
        (
          await card
            .locator('.achievement-name, h3, [data-testid="achievement-name"]')
            .textContent()
        )?.trim() || '';

      const description =
        (
          await card
            .locator('.achievement-description, p, [data-testid="achievement-description"]')
            .textContent()
        )?.trim() || '';

      // Check if unlocked via class or aria
      const unlocked =
        (await card.getAttribute('data-unlocked')) === 'true' ||
        (await card.evaluate((el) => el.classList.contains('unlocked')));

      // Get progress if present
      const progressBar = card.locator('[role="progressbar"]');
      let progress: number | undefined;
      if (await progressBar.isVisible()) {
        const ariaValueNow = await progressBar.getAttribute('aria-valuenow');
        progress = ariaValueNow ? parseFloat(ariaValueNow) : undefined;
      }

      achievements.push({ name, description, unlocked, progress });
    }

    return achievements;
  }

  /**
   * Get count of unlocked achievements
   */
  async getUnlockedAchievementCount(): Promise<number> {
    return this.unlockedAchievements.count();
  }

  /**
   * Get count of locked achievements
   */
  async getLockedAchievementCount(): Promise<number> {
    return this.lockedAchievements.count();
  }

  /**
   * Check if current user is highlighted in leaderboard
   */
  async isCurrentUserHighlighted(): Promise<boolean> {
    return this.currentUserEntry.isVisible();
  }

  /**
   * Get total points from stats section
   */
  async getTotalPoints(): Promise<number> {
    const text = await this.totalPointsStat.textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * Check if an error is displayed
   */
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }
}
