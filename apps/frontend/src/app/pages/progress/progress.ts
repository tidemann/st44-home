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
import type { SidebarUser } from '../../components/navigation/sidebar-nav/sidebar-nav';

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
   * Load all progress data
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

      // Load progress data in parallel
      await Promise.all([
        this.loadLeaderboard(household.id, user.id),
        this.loadAchievements(user.id),
        this.loadHouseholdStats(household.id),
      ]);
    } catch (err) {
      console.error('Failed to load progress data:', err);
      this.error.set('Failed to load progress. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Load weekly leaderboard
   * TODO: Replace mock data with API call when backend endpoint is ready (#197)
   */
  private async loadLeaderboard(householdId: string, currentUserId: string): Promise<void> {
    // Mock data for now
    const mockLeaderboard: LeaderboardEntry[] = [
      {
        userId: '1',
        name: 'Sarah',
        points: 125,
        tasksCompleted: 12,
        rank: 1,
        isCurrentUser: false,
      },
      {
        userId: '2',
        name: 'Marcus',
        points: 98,
        tasksCompleted: 9,
        rank: 2,
        isCurrentUser: false,
      },
      {
        userId: currentUserId,
        name: 'You',
        points: 87,
        tasksCompleted: 11,
        rank: 3,
        isCurrentUser: true,
      },
      {
        userId: '3',
        name: 'Jordan',
        points: 56,
        tasksCompleted: 7,
        rank: 4,
        isCurrentUser: false,
      },
    ];

    this.leaderboard.set(mockLeaderboard);

    // TODO: Actual API call
    // const response = await fetch(`/api/stats/leaderboard?period=week&householdId=${householdId}`);
    // const data = await response.json();
    // this.leaderboard.set(data.leaderboard.map(entry => ({
    //   ...entry,
    //   isCurrentUser: entry.userId === currentUserId
    // })));
  }

  /**
   * Load user achievements
   * TODO: Replace mock data with API call when backend endpoint is ready (#197)
   * @param _userId - User ID for achievement lookup (unused in mock, will be used in API call)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async loadAchievements(_userId: string): Promise<void> {
    // Mock data for now
    const mockAchievements: Achievement[] = [
      {
        id: '1',
        name: 'Early Bird',
        description: 'Complete tasks 5 days in a row',
        icon: '⭐',
        unlocked: true,
        progress: 100,
        criteria: '5 day streak',
      },
      {
        id: '2',
        name: 'Streak Master',
        description: '30 day completion streak',
        icon: '🔥',
        unlocked: false,
        progress: 40,
        criteria: '30 day streak',
      },
      {
        id: '3',
        name: 'Century Club',
        description: '100 tasks completed',
        icon: '🌟',
        unlocked: false,
        progress: 67,
        criteria: '100 tasks',
      },
      {
        id: '4',
        name: 'Team Player',
        description: "Helped with others' tasks 10 times",
        icon: '🤝',
        unlocked: true,
        progress: 100,
        criteria: '10 assists',
      },
      {
        id: '5',
        name: 'Perfect Week',
        description: 'Complete all assigned tasks in a week',
        icon: '💯',
        unlocked: false,
        progress: 20,
        criteria: 'All tasks this week',
      },
      {
        id: '6',
        name: 'Morning Champion',
        description: 'Complete 20 morning tasks before 9 AM',
        icon: '☀️',
        unlocked: false,
        progress: 0,
        criteria: '20 morning tasks',
      },
    ];

    this.achievements.set(mockAchievements);

    // TODO: Actual API call
    // const response = await fetch(`/api/stats/achievements?userId=${userId}`);
    // const data = await response.json();
    // this.achievements.set(data.achievements);
  }

  /**
   * Load household statistics
   * TODO: Replace mock data with API call when backend endpoint is ready (#197)
   * @param _householdId - Household ID for stats lookup (unused in mock, will be used in API call)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async loadHouseholdStats(_householdId: string): Promise<void> {
    // Mock data for now
    const mockStats: HouseholdStats = {
      totalPoints: 366,
      completionRate: 78,
      tasksCompletedThisWeek: 39,
      totalMembers: 4,
    };

    this.householdStats.set(mockStats);

    // TODO: Actual API call
    // const response = await fetch(`/api/stats/household?householdId=${householdId}`);
    // const data = await response.json();
    // this.householdStats.set(data.stats);
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
