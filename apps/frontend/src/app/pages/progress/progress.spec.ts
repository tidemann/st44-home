import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Progress } from './progress';
import { AuthService } from '../../services/auth.service';
import { HouseholdService } from '../../services/household.service';

describe('Progress', () => {
  let component: Progress;
  let fixture: ComponentFixture<Progress>;
  let mockAuthService: { currentUser: ReturnType<typeof vi.fn> };
  let mockHouseholdService: { listHouseholds: ReturnType<typeof vi.fn> };

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

  beforeEach(async () => {
    mockAuthService = {
      currentUser: vi.fn().mockReturnValue(mockUser),
    };

    mockHouseholdService = {
      listHouseholds: vi.fn().mockResolvedValue([mockHousehold]),
    };

    await TestBed.configureTestingModule({
      imports: [Progress],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: HouseholdService, useValue: mockHouseholdService },
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

    it('should set loading to true initially', () => {
      expect(component['loading']()).toBe(true);
    });

    it('should set active screen to progress', () => {
      expect(component['activeScreen']()).toBe('progress');
    });
  });

  describe('loadData', () => {
    it('should load household and progress data', async () => {
      await component['loadData']();

      expect(mockHouseholdService.listHouseholds).toHaveBeenCalled();
      expect(component['householdName']()).toBe('Test Family');
      expect(component['currentUserId']()).toBe('test-user-id');
      expect(component['loading']()).toBe(false);
    });

    it('should set error when user is not authenticated', async () => {
      mockAuthService.currentUser.mockReturnValue(null);

      await component['loadData']();

      expect(component['error']()).toBe('User not authenticated');
      expect(component['loading']()).toBe(false);
    });

    it('should set error when no household found', async () => {
      mockHouseholdService.listHouseholds.mockResolvedValue([]);

      await component['loadData']();

      expect(component['error']()).toBe('No household found');
      expect(component['loading']()).toBe(false);
    });

    it('should handle load errors gracefully', async () => {
      mockHouseholdService.listHouseholds.mockRejectedValue(new Error('Network error'));

      await component['loadData']();

      expect(component['error']()).toBe('Failed to load progress. Please try again.');
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
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[1].rank).toBe(2);
      expect(leaderboard[2].rank).toBe(3);
    });
  });

  describe('achievements', () => {
    beforeEach(async () => {
      await component['loadData']();
    });

    it('should load achievements data', () => {
      const achievements = component['achievements']();
      expect(achievements.length).toBeGreaterThan(0);
    });

    it('should compute hasAchievements correctly', () => {
      expect(component['hasAchievements']()).toBe(true);
    });

    it('should include both unlocked and locked achievements', () => {
      const achievements = component['achievements']();
      const unlocked = achievements.filter((a) => a.unlocked);
      const locked = achievements.filter((a) => !a.unlocked);

      expect(unlocked.length).toBeGreaterThan(0);
      expect(locked.length).toBeGreaterThan(0);
    });

    it('should have progress values for locked achievements', () => {
      const achievements = component['achievements']();
      const locked = achievements.filter((a) => !a.unlocked);

      locked.forEach((achievement) => {
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

    it('should load household stats', () => {
      const stats = component['householdStats']();
      expect(stats.totalPoints).toBeGreaterThan(0);
      expect(stats.completionRate).toBeGreaterThanOrEqual(0);
      expect(stats.completionRate).toBeLessThanOrEqual(100);
      expect(stats.tasksCompletedThisWeek).toBeGreaterThanOrEqual(0);
      expect(stats.totalMembers).toBeGreaterThan(0);
    });
  });

  describe('getMedalForRank', () => {
    it('should return gold medal for rank 1', () => {
      expect(component['getMedalForRank'](1)).toBe('🥇');
    });

    it('should return silver medal for rank 2', () => {
      expect(component['getMedalForRank'](2)).toBe('🥈');
    });

    it('should return bronze medal for rank 3', () => {
      expect(component['getMedalForRank'](3)).toBe('🥉');
    });

    it('should return number emoji for rank 4+', () => {
      expect(component['getMedalForRank'](4)).toBe('4️⃣');
      expect(component['getMedalForRank'](5)).toBe('5️⃣');
    });
  });

  describe('navigation', () => {
    it('should update active screen on navigate', () => {
      component['onNavigate']('home');
      expect(component['activeScreen']()).toBe('home');

      component['onNavigate']('tasks');
      expect(component['activeScreen']()).toBe('tasks');

      component['onNavigate']('family');
      expect(component['activeScreen']()).toBe('family');

      component['onNavigate']('progress');
      expect(component['activeScreen']()).toBe('progress');
    });
  });

  describe('sidebarUser computed', () => {
    it('should compute sidebar user from current user', () => {
      const sidebarUser = component['sidebarUser']();
      expect(sidebarUser.name).toBe('test');
      expect(sidebarUser.avatar).toBe('');
      expect(sidebarUser.household).toBe('My Family');
    });

    it('should update when household name changes', async () => {
      await component['loadData']();
      const sidebarUser = component['sidebarUser']();
      expect(sidebarUser.household).toBe('Test Family');
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
