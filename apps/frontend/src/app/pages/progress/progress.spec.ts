import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Progress } from './progress';
import { AuthService } from '../../services/auth.service';
import { HouseholdService } from '../../services/household.service';
import { AnalyticsService } from '../../services/analytics.service';
import { HouseholdStore } from '../../stores/household.store';
import type { HouseholdAnalytics } from '@st44/types';

describe('Progress', () => {
  let component: Progress;
  let fixture: ComponentFixture<Progress>;
  let mockAuthService: { currentUser: ReturnType<typeof vi.fn> };
  let mockHouseholdService: { listHouseholds: ReturnType<typeof vi.fn> };
  let mockAnalyticsService: { getHouseholdAnalytics: ReturnType<typeof vi.fn> };
  let mockHouseholdStore: {
    activeHouseholdId: ReturnType<typeof vi.fn>;
    autoActivateHousehold: ReturnType<typeof vi.fn>;
  };

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'parent' as const,
    createdAt: new Date().toISOString(),
  };

  const mockHousehold = {
    id: 'test-household-id',
    name: 'Test Family',
    createdBy: 'test-user-id',
    createdAt: new Date().toISOString(),
  };

  const mockAnalytics: HouseholdAnalytics = {
    householdId: 'test-household-id',
    period: 'week',
    periodComparison: {
      current: {
        totalTasks: 20,
        completedTasks: 15,
        completionRate: 75,
        totalPoints: 150,
      },
      previous: {
        totalTasks: 18,
        completedTasks: 12,
        completionRate: 67,
        totalPoints: 120,
      },
      change: {
        completionRateDelta: 8,
        pointsDelta: 30,
        tasksDelta: 2,
      },
    },
    childrenProgress: [
      {
        childId: 'child-1',
        childName: 'Sarah',
        dailyData: [
          {
            date: new Date().toISOString().split('T')[0],
            totalTasks: 5,
            completedTasks: 4,
            completionRate: 80,
            pointsEarned: 40,
          },
        ],
        totalPointsEarned: 100,
        averageCompletionRate: 80,
      },
      {
        childId: 'test-user-id',
        childName: 'You',
        dailyData: [
          {
            date: new Date().toISOString().split('T')[0],
            totalTasks: 5,
            completedTasks: 3,
            completionRate: 60,
            pointsEarned: 30,
          },
        ],
        totalPointsEarned: 50,
        averageCompletionRate: 60,
      },
    ],
    streaks: [
      {
        childId: 'child-1',
        childName: 'Sarah',
        currentStreak: 7,
        longestStreak: 14,
        lastCompletionDate: new Date().toISOString().split('T')[0],
      },
      {
        childId: 'test-user-id',
        childName: 'You',
        currentStreak: 3,
        longestStreak: 5,
        lastCompletionDate: new Date().toISOString().split('T')[0],
      },
    ],
    taskPopularity: [
      {
        taskId: 'task-1',
        taskName: 'Clean Room',
        totalAssignments: 10,
        completedCount: 8,
        completionRate: 80,
        averagePoints: 10,
      },
    ],
    generatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    mockAuthService = {
      currentUser: vi.fn().mockReturnValue(mockUser),
    };

    mockHouseholdService = {
      listHouseholds: vi.fn().mockResolvedValue([mockHousehold]),
    };

    mockAnalyticsService = {
      getHouseholdAnalytics: vi.fn().mockResolvedValue(mockAnalytics),
    };

    mockHouseholdStore = {
      activeHouseholdId: vi.fn().mockReturnValue('test-household-id'),
      autoActivateHousehold: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [Progress],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: HouseholdService, useValue: mockHouseholdService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        { provide: HouseholdStore, useValue: mockHouseholdStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Progress);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should load data on init', async () => {
      const loadDataSpy = vi
        .spyOn(component as unknown as { loadData: () => Promise<void> }, 'loadData')
        .mockResolvedValue(undefined);

      await component.ngOnInit();

      expect(loadDataSpy).toHaveBeenCalled();
    });

    it('should start with loading false to prevent flicker', () => {
      expect(component['loading']()).toBe(false);
    });
  });

  describe('loadData', () => {
    it('should load household and progress data', async () => {
      await component['loadData']();

      expect(mockHouseholdService.listHouseholds).toHaveBeenCalled();
      expect(mockAnalyticsService.getHouseholdAnalytics).toHaveBeenCalledWith(
        'test-household-id',
        'week',
      );
      expect(component['householdName']()).toBe('Test Family');
      expect(component['currentUserId']()).toBe('test-user-id');
      expect(component['loading']()).toBe(false);
    });

    it('should set error when user is not authenticated', async () => {
      mockAuthService.currentUser.mockReturnValue(null);

      await component['loadData']();

      expect(component['error']()).toBe('Du er ikke logget inn.');
      expect(component['loading']()).toBe(false);
    });

    it('should set error when no household found', async () => {
      mockHouseholdService.listHouseholds.mockResolvedValue([]);

      await component['loadData']();

      expect(component['error']()).toBe('Fant ingen familie.');
      expect(component['loading']()).toBe(false);
    });

    it('should handle load errors gracefully', async () => {
      mockAnalyticsService.getHouseholdAnalytics.mockRejectedValue(new Error('Network error'));

      await component['loadData']();

      expect(component['error']()).toBe('Kunne ikke laste fremgangen. Prøv igjen.');
      expect(component['loading']()).toBe(false);
    });
  });

  describe('leaderboard', () => {
    beforeEach(async () => {
      await component['loadData']();
    });

    it('should load leaderboard data', () => {
      const leaderboard = component['leaderboard']();
      expect(leaderboard.length).toBeGreaterThan(0);
    });

    it('should mark current user in leaderboard', () => {
      const leaderboard = component['leaderboard']();
      const currentUserEntry = leaderboard.find((entry) => entry.isCurrentUser);
      expect(currentUserEntry).toBeDefined();
      expect(currentUserEntry?.userId).toBe('test-user-id');
    });

    it('should compute hasLeaderboard correctly', () => {
      expect(component['hasLeaderboard']()).toBe(true);
    });

    it('should rank entries correctly', () => {
      const leaderboard = component['leaderboard']();
      // Mock data has 2 children: Sarah (100 points, rank 1) and You (50 points, rank 2)
      expect(leaderboard.length).toBe(2);
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[0].name).toBe('Sarah');
      expect(leaderboard[1].rank).toBe(2);
      expect(leaderboard[1].name).toBe('You');
    });
  });

  describe('achievements', () => {
    beforeEach(async () => {
      await component['loadData']();
    });

    it('should load achievements data', () => {
      const achievements = component['achievements']();
      expect(achievements.length).toBeGreaterThan(0);
      expect(achievements.length).toBe(6); // 6 streak-based achievements
    });

    it('should compute hasAchievements correctly', () => {
      expect(component['hasAchievements']()).toBe(true);
    });

    it('should include both unlocked and locked achievements based on streaks', () => {
      const achievements = component['achievements']();
      const unlocked = achievements.filter((a) => a.unlocked);
      const locked = achievements.filter((a) => !a.unlocked);

      // Based on mock data: user has longestStreak of 5
      // Should unlock: God start (1), Fem på rad (5)
      expect(unlocked.length).toBe(2);
      expect(locked.length).toBe(4);
    });

    it('should name and describe every achievement in Norwegian', () => {
      const achievements = component['achievements']();
      expect(achievements.map((a) => a.name)).toEqual([
        'God start',
        'Fem på rad',
        'Hele uka',
        'Stø som fjell',
        'Månedsmester',
        'Legende',
      ]);
      expect(achievements[2].description).toBe('Gjør alle oppgavene 7 dager på rad');
    });

    it('should give Norwegian aria labels on the page', async () => {
      fixture.detectChanges(); // ngOnInit loads again
      await component['loadData']();
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      const labels = Array.from(el.querySelectorAll('[aria-label]')).map(
        (node) => node.getAttribute('aria-label') ?? '',
      );
      expect(labels.length).toBeGreaterThan(0);
      for (const label of labels) {
        expect(label).not.toMatch(/Unlocked|Locked|Progress|percent|points|Total|Rate|Tasks/);
      }
      expect(labels).toContain('God start – låst opp');
      expect(labels).toContain('Hele uka – ikke låst opp ennå');
    });

    it('should have progress values for all achievements', () => {
      const achievements = component['achievements']();

      achievements.forEach((achievement) => {
        expect(achievement.progress).toBeDefined();
        expect(achievement.progress).toBeGreaterThanOrEqual(0);
        expect(achievement.progress).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('household stats', () => {
    beforeEach(async () => {
      await component['loadData']();
    });

    it('should load household stats from analytics API', () => {
      const stats = component['householdStats']();
      // Values from mockAnalytics.periodComparison.current
      expect(stats.totalPoints).toBe(150);
      expect(stats.completionRate).toBe(75);
      expect(stats.tasksCompletedThisWeek).toBe(15);
      expect(stats.totalMembers).toBe(2); // 2 children in mockAnalytics.childrenProgress
    });
  });

  describe('achievement meter (ST-1067)', () => {
    const achievement = (progress: number, reached: number, goal: number, unlocked = false) => ({
      id: 'a',
      name: 'Fem på rad',
      description: '',
      icon: '',
      unlocked,
      progress,
      criteria: '',
      reached,
      goal,
    });

    it('fills a tenth of the ten pills per tenth of the way, rounded down', () => {
      expect(component['filledPills'](achievement(60, 3, 5))).toBe(6);
      expect(component['filledPills'](achievement(14, 1, 7))).toBe(1);
      expect(component['filledPills'](achievement(0, 0, 5))).toBe(0);
    });

    it('fills every pill once it is unlocked', () => {
      expect(component['filledPills'](achievement(100, 5, 5, true))).toBe(10);
    });

    it('counts «3 av 5», and says «Låst opp» once reached', () => {
      expect(component['achievementCount'](achievement(60, 3, 5))).toBe('3 av 5');
      expect(component['achievementCount'](achievement(100, 5, 5, true))).toBe('Låst opp');
    });
  });

  describe('edge cases', () => {
    it('should handle empty leaderboard', () => {
      component['leaderboard'].set([]);
      expect(component['hasLeaderboard']()).toBe(false);
    });

    it('should handle empty achievements', () => {
      component['achievements'].set([]);
      expect(component['hasAchievements']()).toBe(false);
    });

    it('should handle zero household stats', () => {
      component['householdStats'].set({
        totalPoints: 0,
        completionRate: 0,
        tasksCompletedThisWeek: 0,
        totalTasksThisWeek: 0,
        totalMembers: 0,
      });

      const stats = component['householdStats']();
      expect(stats.totalPoints).toBe(0);
      expect(stats.completionRate).toBe(0);
    });
  });

  describe('component state', () => {
    it('should clear error on successful load', async () => {
      component['error'].set('Previous error');
      await component['loadData']();
      expect(component['error']()).toBeNull();
    });

    it('should set loading state during data fetch', async () => {
      const loadPromise = component['loadData']();
      expect(component['loading']()).toBe(true);
      await loadPromise;
      expect(component['loading']()).toBe(false);
    });
  });
});
