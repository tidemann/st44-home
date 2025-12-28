import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { BottomNav } from '../../components/navigation/bottom-nav/bottom-nav';
import { SidebarNav } from '../../components/navigation/sidebar-nav/sidebar-nav';
import { AuthService } from '../../services/auth.service';
import { HouseholdService } from '../../services/household.service';
import { AnalyticsService } from '../../services/analytics.service';
import type { SidebarUser } from '../../components/navigation/sidebar-nav/sidebar-nav';
import type { HouseholdAnalytics, ChildStreak } from '@st44/types';

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
}

/**
 * Household-wide statistics
 */
interface HouseholdStats {
  totalPoints: number;
  completionRate: number; // 0-100 percentage
  tasksCompletedThisWeek: number;
  totalMembers: number;
}

/**
 * Progress Screen (Leaderboard & Achievements)
 *
 * Displays gamification features:
 * - Weekly leaderboard with rankings and medals (🥇🥈🥉)
 * - Current user highlighted in leaderboard
 * - Achievement badges (unlocked/locked states with progress)
 * - Household-level statistics
 *
 * Design matches the "Diddit!" playful aesthetic from UX redesign.
 * Friendly, non-competitive design that celebrates everyone's progress.
 */
@Component({
  selector: 'app-progress',
  imports: [BottomNav, SidebarNav],
  templateUrl: './progress.html',
  styleUrl: './progress.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Progress implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly householdService = inject(HouseholdService);
  private readonly analyticsService = inject(AnalyticsService);

  // State signals
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly leaderboard = signal<LeaderboardEntry[]>([]);
  protected readonly achievements = signal<Achievement[]>([]);
  protected readonly householdStats = signal<HouseholdStats>({
    totalPoints: 0,
    completionRate: 0,
    tasksCompletedThisWeek: 0,
    totalMembers: 0,
  });
  protected readonly householdName = signal<string>('My Family');
  protected readonly currentUserId = signal<string | null>(null);

  // Navigation state
  protected readonly activeScreen = signal<'home' | 'tasks' | 'family' | 'progress'>('progress');

  // Computed values
  protected readonly sidebarUser = computed<SidebarUser>(() => {
    const user = this.authService.currentUser();
    return {
      name: user?.email.split('@')[0] || 'User',
      avatar: '',
      household: this.householdName(),
    };
  });

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
        this.error.set('User not authenticated');
        return;
      }

      this.currentUserId.set(user.id);

      // Get user's household
      const households = await this.householdService.listHouseholds();
      if (households.length === 0) {
        this.error.set('No household found');
        return;
      }

      const household = households[0];
      this.householdName.set(household.name);

      // Fetch analytics data from API
      const analytics = await this.analyticsService.getHouseholdAnalytics(household.id, 'week');

      // Transform analytics data into UI-ready formats
      this.loadLeaderboardFromAnalytics(analytics, user.id);
      this.loadAchievementsFromStreaks(analytics.streaks, user.id);
      this.loadHouseholdStatsFromAnalytics(analytics, analytics.childrenProgress.length);
    } catch (err) {
      console.error('Failed to load progress data:', err);
      this.error.set('Failed to load progress. Please try again.');
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

    // Generate achievements based on streak milestones
    const achievements: Achievement[] = [
      {
        id: '1',
        name: 'Getting Started',
        description: 'Complete all tasks for 1 day',
        icon: '⭐',
        unlocked: currentStreak >= 1 || longestStreak >= 1,
        progress: Math.min(100, (Math.max(currentStreak, longestStreak) / 1) * 100),
        criteria: '1 day streak',
      },
      {
        id: '2',
        name: 'Early Bird',
        description: 'Complete all tasks 5 days in a row',
        icon: '🐦',
        unlocked: longestStreak >= 5,
        progress: Math.min(100, (longestStreak / 5) * 100),
        criteria: '5 day streak',
      },
      {
        id: '3',
        name: 'Week Warrior',
        description: '7 day completion streak',
        icon: '🔥',
        unlocked: longestStreak >= 7,
        progress: Math.min(100, (longestStreak / 7) * 100),
        criteria: '7 day streak',
      },
      {
        id: '4',
        name: 'Consistent Champion',
        description: '14 day completion streak',
        icon: '🏆',
        unlocked: longestStreak >= 14,
        progress: Math.min(100, (longestStreak / 14) * 100),
        criteria: '14 day streak',
      },
      {
        id: '5',
        name: 'Streak Master',
        description: '30 day completion streak',
        icon: '💯',
        unlocked: longestStreak >= 30,
        progress: Math.min(100, (longestStreak / 30) * 100),
        criteria: '30 day streak',
      },
      {
        id: '6',
        name: 'Legend',
        description: '60 day completion streak',
        icon: '🌟',
        unlocked: longestStreak >= 60,
        progress: Math.min(100, (longestStreak / 60) * 100),
        criteria: '60 day streak',
      },
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
      totalMembers: memberCount,
    };

    this.householdStats.set(stats);
  }

  /**
   * Get medal emoji for leaderboard rank
   */
  protected getMedalForRank(rank: number): string {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `${rank}️⃣`;
    }
  }

  /**
   * Handle navigation between screens
   */
  protected onNavigate(screen: 'home' | 'tasks' | 'family' | 'progress'): void {
    this.activeScreen.set(screen);
    // TODO: Implement routing to different screens
  }
}
