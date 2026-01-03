import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import type { Child, HouseholdMemberResponse } from '@st44/types';
import { HouseholdStore } from './household.store';
import { ApiService } from '../services/api.service';
import { StorageService } from '../services/storage.service';
import type { HouseholdListItem } from '../services/household.service';

describe('HouseholdStore - Multi-household caching', () => {
  let store: HouseholdStore;
  let mockApiService: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mockStorageService: {
    getString: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  // Test data
  const mockHouseholds: HouseholdListItem[] = [
    {
      id: 'household-a',
      name: 'Family A',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      role: 'parent',
    },
    {
      id: 'household-b',
      name: 'Family B',
      createdAt: '2024-01-02',
      updatedAt: '2024-01-02',
      role: 'parent',
    },
  ];

  const mockChildrenA: Child[] = [
    {
      id: 'child-a1',
      householdId: 'household-a',
      name: 'Alice Smith',
      birthYear: 2015,
      userId: null,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'child-a2',
      householdId: 'household-a',
      name: 'Bob Smith',
      birthYear: 2017,
      userId: null,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  const mockChildrenB: Child[] = [
    {
      id: 'child-b1',
      householdId: 'household-b',
      name: 'Charlie Jones',
      birthYear: 2016,
      userId: null,
      createdAt: '2024-01-02',
      updatedAt: '2024-01-02',
    },
  ];

  const mockMembersA: HouseholdMemberResponse[] = [
    {
      userId: 'user-a1',
      email: 'parent-a@example.com',
      displayName: 'Parent A',
      role: 'parent',
      joinedAt: '2024-01-01',
      tasksCompleted: 10,
      totalTasks: 15,
      points: 100,
    },
  ];

  const mockMembersB: HouseholdMemberResponse[] = [
    {
      userId: 'user-b1',
      email: 'parent-b@example.com',
      displayName: 'Parent B',
      role: 'parent',
      joinedAt: '2024-01-02',
      tasksCompleted: 5,
      totalTasks: 8,
      points: 50,
    },
  ];

  beforeEach(() => {
    // Create mock services
    mockApiService = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    mockStorageService = {
      getString: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      remove: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        HouseholdStore,
        { provide: ApiService, useValue: mockApiService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    });

    store = TestBed.inject(HouseholdStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Per-household cache isolation', () => {
    it('should cache children per household independently', async () => {
      mockApiService.get.mockImplementation((url: string) => {
        if (url === '/households/household-a/children') {
          return Promise.resolve({ children: mockChildrenA });
        }
        if (url === '/households/household-b/children') {
          return Promise.resolve({ children: mockChildrenB });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      // Load children for both households
      await store.loadChildren('household-a');
      await store.loadChildren('household-b');

      // Verify isolation
      const childrenA = store.getChildrenForHousehold('household-a');
      const childrenB = store.getChildrenForHousehold('household-b');

      expect(childrenA).toHaveLength(2);
      expect(childrenB).toHaveLength(1);
      expect(childrenA[0].id).toBe('child-a1');
      expect(childrenB[0].id).toBe('child-b1');
      expect(childrenA).not.toEqual(childrenB);
    });

    it('should cache members per household independently', async () => {
      mockApiService.get.mockImplementation((url: string) => {
        if (url === '/households/household-a/members') {
          return Promise.resolve(mockMembersA);
        }
        if (url === '/households/household-b/members') {
          return Promise.resolve(mockMembersB);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      await store.loadMembers('household-a');
      await store.loadMembers('household-b');

      const membersA = store.getMembersForHousehold('household-a');
      const membersB = store.getMembersForHousehold('household-b');

      expect(membersA).toHaveLength(1);
      expect(membersB).toHaveLength(1);
      expect(membersA[0].email).toBe('parent-a@example.com');
      expect(membersB[0].email).toBe('parent-b@example.com');
      expect(membersA).not.toEqual(membersB);
    });

    it('should return empty array for non-existent household', () => {
      const children = store.getChildrenForHousehold('non-existent');
      const members = store.getMembersForHousehold('non-existent');

      expect(children).toEqual([]);
      expect(members).toEqual([]);
    });
  });

  describe('setActiveHousehold preserves caches', () => {
    it('should not clear cache when switching active household', async () => {
      mockApiService.get.mockImplementation((url: string) => {
        if (url === '/households/household-a/children') {
          return Promise.resolve({ children: mockChildrenA });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      // Load children for household A
      await store.loadChildren('household-a');

      // Switch to household B
      store.setActiveHousehold('household-b');

      // Cache for A should still exist
      const childrenA = store.getChildrenForHousehold('household-a');
      expect(childrenA).toHaveLength(2);
      expect(childrenA[0].id).toBe('child-a1');
    });

    it('should update active household signals when switching', async () => {
      mockApiService.get.mockImplementation((url: string) => {
        if (url === '/households') {
          return Promise.resolve(mockHouseholds);
        }
        if (url === '/households/household-a/children') {
          return Promise.resolve({ children: mockChildrenA });
        }
        if (url === '/households/household-b/children') {
          return Promise.resolve({ children: mockChildrenB });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      await store.loadHouseholds();
      await store.loadChildren('household-a');
      await store.loadChildren('household-b');

      // Set household A as active
      store.setActiveHousehold('household-a');
      expect(store.activeHouseholdId()).toBe('household-a');
      expect(store.children()).toHaveLength(2);

      // Switch to household B
      store.setActiveHousehold('household-b');
      expect(store.activeHouseholdId()).toBe('household-b');
      expect(store.children()).toHaveLength(1);
    });

    it('should persist active household to storage', () => {
      store.setActiveHousehold('household-a');

      expect(mockStorageService.set).toHaveBeenCalledWith('active_household_id', 'household-a');
    });

    it('should not update if same household is already active', () => {
      store.setActiveHousehold('household-a');
      vi.clearAllMocks();

      store.setActiveHousehold('household-a');

      expect(mockStorageService.set).not.toHaveBeenCalled();
    });
  });

  describe('Backward-compatible selectors', () => {
    it('should return active household children via children()', async () => {
      mockApiService.get.mockResolvedValue({ children: mockChildrenA });

      store.setActiveHousehold('household-a');
      await store.loadChildren('household-a');

      expect(store.children()).toEqual(mockChildrenA);
    });

    it('should return active household members via members()', async () => {
      mockApiService.get.mockResolvedValue(mockMembersA);

      store.setActiveHousehold('household-a');
      await store.loadMembers('household-a');

      expect(store.members()).toEqual(mockMembersA);
    });

    it('should return empty array when no active household', () => {
      expect(store.children()).toEqual([]);
      expect(store.members()).toEqual([]);
    });

    it('should return correct counts for active household', async () => {
      mockApiService.get.mockImplementation((url: string) => {
        if (url.includes('/children')) {
          return Promise.resolve({ children: mockChildrenA });
        }
        if (url.includes('/members')) {
          return Promise.resolve(mockMembersA);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      store.setActiveHousehold('household-a');
      await store.loadChildren('household-a');
      await store.loadMembers('household-a');

      expect(store.childrenCount()).toBe(2);
      expect(store.memberCount()).toBe(1);
    });

    it('should return 0 counts when no active household', () => {
      expect(store.childrenCount()).toBe(0);
      expect(store.memberCount()).toBe(0);
    });
  });

  describe('Mutation methods update correct household', () => {
    it('should add child to correct household cache', () => {
      const newChild: Child = {
        id: 'child-new',
        householdId: 'household-a',
        name: 'New Child',
        birthYear: 2018,
        userId: null,
        createdAt: '2024-01-03',
        updatedAt: '2024-01-03',
      };

      store.addChild('household-a', newChild);

      const childrenA = store.getChildrenForHousehold('household-a');
      const childrenB = store.getChildrenForHousehold('household-b');

      expect(childrenA).toContainEqual(newChild);
      expect(childrenB).not.toContainEqual(newChild);
    });

    it('should update child in correct household cache', async () => {
      mockApiService.get.mockResolvedValue({ children: mockChildrenA });
      await store.loadChildren('household-a');

      store.updateChild('household-a', 'child-a1', { name: 'Updated Alice' });

      const childrenA = store.getChildrenForHousehold('household-a');
      expect(childrenA[0].name).toBe('Updated Alice');
      expect(childrenA[0].id).toBe('child-a1');
    });

    it('should remove child from correct household cache', async () => {
      mockApiService.get.mockResolvedValue({ children: mockChildrenA });
      await store.loadChildren('household-a');

      store.removeChild('household-a', 'child-a1');

      const childrenA = store.getChildrenForHousehold('household-a');
      expect(childrenA).toHaveLength(1);
      expect(childrenA[0].id).toBe('child-a2');
    });

    it('should not affect other households when mutating', async () => {
      mockApiService.get.mockImplementation((url: string) => {
        if (url === '/households/household-a/children') {
          return Promise.resolve({ children: mockChildrenA });
        }
        if (url === '/households/household-b/children') {
          return Promise.resolve({ children: mockChildrenB });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      await store.loadChildren('household-a');
      await store.loadChildren('household-b');

      // Remove child from A
      store.removeChild('household-a', 'child-a1');

      // Verify B is unaffected
      const childrenB = store.getChildrenForHousehold('household-b');
      expect(childrenB).toHaveLength(1);
      expect(childrenB[0].id).toBe('child-b1');
    });
  });

  describe('In-flight request deduplication', () => {
    it('should prevent duplicate API calls for same household children', async () => {
      mockApiService.get.mockResolvedValue({ children: mockChildrenA });

      const promise1 = store.loadChildren('household-a');
      const promise2 = store.loadChildren('household-a');

      await Promise.all([promise1, promise2]);

      // API should only be called once
      expect(mockApiService.get).toHaveBeenCalledTimes(1);
      expect(mockApiService.get).toHaveBeenCalledWith('/households/household-a/children');
    });

    it('should prevent duplicate API calls for same household members', async () => {
      mockApiService.get.mockResolvedValue(mockMembersA);

      const promise1 = store.loadMembers('household-a');
      const promise2 = store.loadMembers('household-a');

      await Promise.all([promise1, promise2]);

      expect(mockApiService.get).toHaveBeenCalledTimes(1);
      expect(mockApiService.get).toHaveBeenCalledWith('/households/household-a/members');
    });

    it('should allow concurrent requests for different households', async () => {
      mockApiService.get.mockImplementation((url: string) => {
        if (url === '/households/household-a/children') {
          return Promise.resolve({ children: mockChildrenA });
        }
        if (url === '/households/household-b/children') {
          return Promise.resolve({ children: mockChildrenB });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      await Promise.all([store.loadChildren('household-a'), store.loadChildren('household-b')]);

      expect(mockApiService.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache TTL validation', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should use cache when TTL has not expired', async () => {
      mockApiService.get.mockResolvedValue({ children: mockChildrenA });

      // First load
      await store.loadChildren('household-a');
      expect(mockApiService.get).toHaveBeenCalledTimes(1);

      // Advance time by 4 minutes (TTL is 5 minutes)
      vi.advanceTimersByTime(4 * 60 * 1000);

      // Second load should use cache
      await store.loadChildren('household-a');
      expect(mockApiService.get).toHaveBeenCalledTimes(1); // Still 1, no new call
    });

    it('should fetch fresh data when TTL has expired', async () => {
      mockApiService.get.mockResolvedValue({ children: mockChildrenA });

      // First load
      await store.loadChildren('household-a');
      expect(mockApiService.get).toHaveBeenCalledTimes(1);

      // Advance time by 6 minutes (past 5 minute TTL)
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Second load should fetch fresh
      await store.loadChildren('household-a');
      expect(mockApiService.get).toHaveBeenCalledTimes(2);
    });

    it('should force refresh when forceRefresh option is true', async () => {
      mockApiService.get.mockResolvedValue({ children: mockChildrenA });

      // First load
      await store.loadChildren('household-a');
      expect(mockApiService.get).toHaveBeenCalledTimes(1);

      // Force refresh
      await store.loadChildren('household-a', { forceRefresh: true });
      expect(mockApiService.get).toHaveBeenCalledTimes(2);
    });

    it('should have independent TTLs per household', async () => {
      mockApiService.get.mockImplementation((url: string) => {
        if (url === '/households/household-a/children') {
          return Promise.resolve({ children: mockChildrenA });
        }
        if (url === '/households/household-b/children') {
          return Promise.resolve({ children: mockChildrenB });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      // Load household A
      await store.loadChildren('household-a');

      // Advance time by 3 minutes
      vi.advanceTimersByTime(3 * 60 * 1000);

      // Load household B (fresh)
      await store.loadChildren('household-b');

      // Advance time by 3 more minutes (A is now expired, B is not)
      vi.advanceTimersByTime(3 * 60 * 1000);

      vi.clearAllMocks();

      // Load both
      await store.loadChildren('household-a'); // Should fetch
      await store.loadChildren('household-b'); // Should use cache

      expect(mockApiService.get).toHaveBeenCalledTimes(1);
      expect(mockApiService.get).toHaveBeenCalledWith('/households/household-a/children');
    });
  });

  describe('loadHouseholds (global cache)', () => {
    it('should load households list', async () => {
      mockApiService.get.mockResolvedValue(mockHouseholds);

      const households = await store.loadHouseholds();

      expect(households).toEqual(mockHouseholds);
      expect(store.households()).toEqual(mockHouseholds);
    });

    it('should cache households list', async () => {
      mockApiService.get.mockResolvedValue(mockHouseholds);

      await store.loadHouseholds();
      await store.loadHouseholds(); // Second call

      expect(mockApiService.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Default parameter behavior', () => {
    it('should use active household when householdId not provided to loadChildren', async () => {
      mockApiService.get.mockResolvedValue({ children: mockChildrenA });

      store.setActiveHousehold('household-a');
      await store.loadChildren();

      expect(mockApiService.get).toHaveBeenCalledWith('/households/household-a/children');
    });

    it('should use active household when householdId not provided to loadMembers', async () => {
      mockApiService.get.mockResolvedValue(mockMembersA);

      store.setActiveHousehold('household-a');
      await store.loadMembers();

      expect(mockApiService.get).toHaveBeenCalledWith('/households/household-a/members');
    });

    it('should return empty array when no active household and no householdId provided', async () => {
      const children = await store.loadChildren();
      const members = await store.loadMembers();

      expect(children).toEqual([]);
      expect(members).toEqual([]);
      expect(mockApiService.get).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle API errors when loading children', async () => {
      mockApiService.get.mockRejectedValue(new Error('Network error'));

      await expect(store.loadChildren('household-a')).rejects.toThrow('Network error');

      expect(store.error()).toBe('Network error');
    });

    it('should handle API errors when loading members', async () => {
      mockApiService.get.mockRejectedValue(new Error('Server error'));

      await expect(store.loadMembers('household-a')).rejects.toThrow('Server error');

      expect(store.error()).toBe('Server error');
    });

    it('should clear loading state after error', async () => {
      mockApiService.get.mockRejectedValue(new Error('Error'));

      try {
        await store.loadChildren('household-a');
      } catch {
        // Expected error
      }

      expect(store.isLoadingChildren()).toBe(false);
    });
  });

  describe('Loading states', () => {
    it('should set loading state during children fetch', async () => {
      let loadingDuringFetch = false;

      mockApiService.get.mockImplementation(() => {
        loadingDuringFetch = store.isLoadingChildren();
        return Promise.resolve({ children: mockChildrenA });
      });

      await store.loadChildren('household-a');

      expect(loadingDuringFetch).toBe(true);
      expect(store.isLoadingChildren()).toBe(false);
    });

    it('should set loading state during members fetch', async () => {
      let loadingDuringFetch = false;

      mockApiService.get.mockImplementation(() => {
        loadingDuringFetch = store.isLoadingMembers();
        return Promise.resolve(mockMembersA);
      });

      await store.loadMembers('household-a');

      expect(loadingDuringFetch).toBe(true);
      expect(store.isLoadingMembers()).toBe(false);
    });

    it('should report isLoadingAny when any resource is loading', async () => {
      let anyLoading = false;

      mockApiService.get.mockImplementation(() => {
        anyLoading = store.isLoadingAny();
        return Promise.resolve({ children: mockChildrenA });
      });

      await store.loadChildren('household-a');

      expect(anyLoading).toBe(true);
      expect(store.isLoadingAny()).toBe(false);
    });
  });

  describe('invalidateAll', () => {
    it('should clear all cache timestamps', async () => {
      mockApiService.get.mockImplementation((url: string) => {
        if (url === '/households') {
          return Promise.resolve(mockHouseholds);
        }
        if (url.includes('/children')) {
          return Promise.resolve({ children: mockChildrenA });
        }
        if (url.includes('/members')) {
          return Promise.resolve(mockMembersA);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      // Load all data
      await store.loadHouseholds();
      await store.loadChildren('household-a');
      await store.loadMembers('household-a');

      vi.clearAllMocks();

      // Invalidate all
      store.invalidateAll();

      // Next loads should fetch fresh
      await store.loadHouseholds();
      await store.loadChildren('household-a');
      await store.loadMembers('household-a');

      expect(mockApiService.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', async () => {
      mockApiService.get.mockResolvedValue({ children: mockChildrenA });

      store.setActiveHousehold('household-a');
      await store.loadChildren('household-a');

      store.reset();

      expect(store.activeHouseholdId()).toBeNull();
      expect(store.children()).toEqual([]);
      expect(mockStorageService.remove).toHaveBeenCalledWith('active_household_id');
    });
  });

  describe('clearActiveHousehold', () => {
    it('should clear active household without clearing caches', async () => {
      mockApiService.get.mockResolvedValue({ children: mockChildrenA });

      store.setActiveHousehold('household-a');
      await store.loadChildren('household-a');

      store.clearActiveHousehold();

      expect(store.activeHouseholdId()).toBeNull();
      // Cache should still exist
      expect(store.getChildrenForHousehold('household-a')).toHaveLength(2);
    });
  });

  describe('Household management methods', () => {
    it('should add household to store', () => {
      const newHousehold: HouseholdListItem = {
        id: 'household-new',
        name: 'New Family',
        createdAt: '2024-01-03',
        updatedAt: '2024-01-03',
        role: 'admin',
      };

      store.addHousehold(newHousehold);

      expect(store.households()).toContainEqual(newHousehold);
    });

    it('should update household in store', async () => {
      mockApiService.get.mockResolvedValue(mockHouseholds);
      await store.loadHouseholds();

      store.updateHousehold('household-a', { name: 'Updated Family A' });

      const updated = store.households().find((h) => h.id === 'household-a');
      expect(updated?.name).toBe('Updated Family A');
    });

    it('should remove household from store', async () => {
      mockApiService.get.mockResolvedValue(mockHouseholds);
      await store.loadHouseholds();

      store.removeHousehold('household-a');

      expect(store.households()).toHaveLength(1);
      expect(store.households()[0].id).toBe('household-b');
    });
  });

  describe('autoActivateHousehold', () => {
    it('should activate first household when user has households', async () => {
      mockApiService.get.mockResolvedValue(mockHouseholds);

      await store.autoActivateHousehold();

      expect(store.activeHouseholdId()).toBe('household-a');
    });

    it('should keep current household if valid', async () => {
      mockApiService.get.mockResolvedValue(mockHouseholds);
      store.setActiveHousehold('household-b');

      await store.autoActivateHousehold();

      expect(store.activeHouseholdId()).toBe('household-b'); // Still B
    });

    it('should clear active household if no households exist', async () => {
      mockApiService.get.mockResolvedValue([]);

      await store.autoActivateHousehold();

      expect(store.activeHouseholdId()).toBeNull();
    });
  });

  describe('activeHousehold computed', () => {
    it('should return active household details', async () => {
      mockApiService.get.mockResolvedValue(mockHouseholds);
      await store.loadHouseholds();
      store.setActiveHousehold('household-a');

      const active = store.activeHousehold();

      expect(active?.id).toBe('household-a');
      expect(active?.name).toBe('Family A');
    });

    it('should return null when no active household', () => {
      expect(store.activeHousehold()).toBeNull();
    });
  });
});
