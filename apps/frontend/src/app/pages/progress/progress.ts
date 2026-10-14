import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { HouseholdService } from '../../services/household.service';
import { AnalyticsService } from '../../services/analytics.service';
import { HouseholdStore } from '../../stores/household.store';
import { PageComponent } from '../../components/page/page';
import { GroupLabel } from '../../components/poeng/group-label/group-label';
import { isoWeek, weekSubline } from './week-subline';
import type { HouseholdAnalytics, ChildStreak } from '@st44/types';

/** The achievement meter is ten pills, each a tenth of the way (ST-1067) */
const PILLS = 10;

/**
 * Leaderboard entry for weekly rankings
 */
interface LeaderboardEntry {
  userId: string;
  name: string;
  points: number;
  tasksCompleted: number;
  rank: number;
  isCurrentUser: boolean;
}

/**
 * Achievement badge data
 */
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number; // 0-100 percentage
  criteria: string;
  /** Days on a row so far, and the days it takes */
  reached: number;
  goal: number;
}

/**
 * Household-wide statistics
 */
interface HouseholdStats {
  totalPoints: number;
  completionRate: number; // 0-100 percentage
  tasksCompletedThisWeek: number;
  totalTasksThisWeek: number;
  totalMembers: number;
}

/**
 * Progress Screen (Leaderboard & Achievements)
 *
 * As Stig approved it (ST-1067 v2, guide: Fremgang): the week's points, share done and chores
 * in the yellow top; «Ukens ledere» ranked by points; «Prestasjoner» with a ten-pill meter.
 * Navigation is handled by the parent MainLayout component.
 */
@Component({
  selector: 'app-progress',
  imports: [PageComponent, GroupLabel],
  templateUrl: './progress.html',
  styleUrl: './progress.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Progress implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly householdService = inject(HouseholdService);
  private readonly householdStore = inject(HouseholdStore);
  private readonly analyticsService = inject(AnalyticsService);

  // State signals
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly leaderboard = signal<LeaderboardEntry[]>([]);
  protected readonly achievements = signal<Achievement[]>([]);
  protected readonly householdStats = signal<HouseholdStats>({
    totalPoints: 0,
    completionRate: 0,
    tasksCompletedThisWeek: 0,
    totalTasksThisWeek: 0,
    totalMembers: 0,
  });

  /** «uke 42 – 12. til 18. oktober» under the title, and «uke 42» beside «Ukens ledere» */
  protected readonly weekLine = weekSubline(new Date());
  protected readonly weekLabel = $localize`:@@progress.weekLabel:uke ${isoWeek(new Date())}:week:`;
  protected readonly pillSlots = Array.from({ length: PILLS }, (_, i) => i);
  protected readonly householdName = signal<string>(
    $localize`:@@progress.defaultHouseholdName:Min familie`,
  );
  protected readonly householdId = signal<string | null>(null);
  protected readonly currentUserId = signal<string | null>(null);

  // Computed values
  protected readonly hasLeaderboard = computed(() => this.leaderboard().length > 0);
  protected readonly hasAchievements = computed(() => this.achievements().length > 0);

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  /**
   * Load all progress data from analytics API
   */
  protected async loadData(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);

      const user = this.authService.currentUser();
      if (!user) {
        this.error.set($localize`:@@progress.error.notLoggedIn:Du er ikke logget inn.`);
        return;
      }

      this.currentUserId.set(user.id);

      // Get user's households
      const households = await this.householdService.listHouseholds();
      if (households.length === 0) {
        this.error.set($localize`:@@progress.error.noHousehold:Fant ingen familie.`);
        return;
      }

      // Get active household from store (respects user's selection from switcher)
      let activeHouseholdId = this.householdStore.activeHouseholdId();

      // If no active household, auto-activate the first one
      if (!activeHouseholdId) {
        await this.householdStore.autoActivateHousehold();
        activeHouseholdId = this.householdStore.activeHouseholdId();
      }

      // Find the active household in the list (fallback to first if not found)
      const household = households.find((h) => h.id === activeHouseholdId) || households[0];

      this.householdId.set(household.id);
      this.householdName.set(household.name);

      // Active household is already set - don't overwrite it
      // (either from switcher or from autoActivateHousehold above)

      // Fetch analytics data from API
      const analytics = await this.analyticsService.getHouseholdAnalytics(household.id, 'week');

      // Transform analytics data into UI-ready formats
      this.loadLeaderboardFromAnalytics(analytics, user.id);
      this.loadAchievementsFromStreaks(analytics.streaks, user.id);
      this.loadHouseholdStatsFromAnalytics(analytics, analytics.childrenProgress.length);
    } catch (err) {
      console.error('Failed to load progress data:', err);
      this.error.set(
        $localize`:@@progress.error.loadFailed:Kunne ikke laste fremgangen. Prøv igjen.`,
      );
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Load weekly leaderboard from analytics API
   * Transforms streaks data into leaderboard format
   */
  private loadLeaderboardFromAnalytics(analytics: HouseholdAnalytics, currentUserId: string): void {
    // Create leaderboard from children progress data
    const entries: LeaderboardEntry[] = analytics.childrenProgress
      .map((child) => ({
        userId: child.childId,
        name: child.childName,
        points: child.totalPointsEarned,
        tasksCompleted: child.dailyData.reduce((sum, day) => sum + day.completedTasks, 0),
        rank: 0, // Will be set after sorting
        isCurrentUser: child.childId === currentUserId,
      }))
      .sort((a, b) => b.points - a.points)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    this.leaderboard.set(entries);
  }

  /**
   * Load achievements from analytics streaks data
   * Creates achievement badges based on streak milestones
   */
  private loadAchievementsFromStreaks(streaks: ChildStreak[], currentUserId: string): void {
    // Find current user's streak data
    const userStreak = streaks.find((s) => s.childId === currentUserId);
    const currentStreak = userStreak?.currentStreak ?? 0;
    const longestStreak = userStreak?.longestStreak ?? 0;

    const best = Math.max(currentStreak, longestStreak);
    const streakAchievement = (
      id: string,
      icon: string,
      days: number,
      name: string,
      description: string,
    ): Achievement => ({
      id,
      name,
      description,
      icon,
      unlocked: best >= days,
      progress: Math.min(100, Math.round((best / days) * 100)),
      criteria: $localize`:@@progress.achievement.criteria:${days}:days: dager på rad`,
      reached: Math.min(best, days),
      goal: days,
    });

    // Generate achievements based on streak milestones
    const achievements: Achievement[] = [
      streakAchievement(
        '1',
        '⭐',
        1,
        $localize`:@@progress.achievement.firstDay.name:God start`,
        $localize`:@@progress.achievement.firstDay.description:Gjør alle oppgavene én dag`,
      ),
      streakAchievement(
        '2',
        '🐦',
        5,
        $localize`:@@progress.achievement.fiveDays.name:Fem på rad`,
        $localize`:@@progress.achievement.fiveDays.description:Gjør alle oppgavene 5 dager på rad`,
      ),
      streakAchievement(
        '3',
        '🔥',
        7,
        $localize`:@@progress.achievement.week.name:Hele uka`,
        $localize`:@@progress.achievement.week.description:Gjør alle oppgavene 7 dager på rad`,
      ),
      streakAchievement(
        '4',
        '🏆',
        14,
        $localize`:@@progress.achievement.twoWeeks.name:Stø som fjell`,
        $localize`:@@progress.achievement.twoWeeks.description:Gjør alle oppgavene 14 dager på rad`,
      ),
      streakAchievement(
        '5',
        '💯',
        30,
        $localize`:@@progress.achievement.month.name:Månedsmester`,
        $localize`:@@progress.achievement.month.description:Gjør alle oppgavene 30 dager på rad`,
      ),
      streakAchievement(
        '6',
        '✨',
        60,
        $localize`:@@progress.achievement.legend.name:Legende`,
        $localize`:@@progress.achievement.legend.description:Gjør alle oppgavene 60 dager på rad`,
      ),
    ];

    this.achievements.set(achievements);
  }

  /**
   * Load household statistics from analytics API response
   */
  private loadHouseholdStatsFromAnalytics(
    analytics: HouseholdAnalytics,
    memberCount: number,
  ): void {
    const stats: HouseholdStats = {
      totalPoints: analytics.periodComparison.current.totalPoints,
      completionRate: analytics.periodComparison.current.completionRate,
      tasksCompletedThisWeek: analytics.periodComparison.current.completedTasks,
      totalTasksThisWeek: analytics.periodComparison.current.totalTasks,
      totalMembers: memberCount,
    };

    this.householdStats.set(stats);
  }

  /** Screen-reader name of an achievement card, with its state */
  protected achievementLabel(achievement: Achievement): string {
    return achievement.unlocked
      ? $localize`:@@progress.achievementUnlockedAriaLabel:${achievement.name}:name: – låst opp`
      : $localize`:@@progress.achievementLockedAriaLabel:${achievement.name}:name: – ikke låst opp ennå`;
  }

  /** Pills filled on the meter: all of them once it is unlocked */
  protected filledPills(achievement: Achievement): number {
    return achievement.unlocked ? PILLS : Math.floor(((achievement.progress ?? 0) / 100) * PILLS);
  }

  /** «3 av 5» beside the meter, «Låst opp» once it is reached */
  protected achievementCount(achievement: Achievement): string {
    return achievement.unlocked
      ? $localize`:@@progress.unlocked:Låst opp`
      : $localize`:@@progress.achievementCount:${achievement.reached}:reached: av ${achievement.goal}:goal:`;
  }
}
