import { Injectable, inject, signal, computed } from '@angular/core';
import type { Child, HouseholdMemberResponse } from '@st44/types';
import { ApiService } from '../services/api.service';
import { StorageService } from '../services/storage.service';
import { STORAGE_KEYS } from '../services/storage-keys';
import type { HouseholdListItem } from '../services/household.service';

/**
 * Household state shape
 */
interface HouseholdState {
  // List of all households the user has access to
  households: HouseholdListItem[];
  // Current active household details
  activeHouseholdId: string | null;
  // Per-household caches (Map<householdId, data>)
  membersByHousehold: Map<string, HouseholdMemberResponse[]>;
  childrenByHousehold: Map<string, Child[]>;
  // Loading states
  loading: {
    households: boolean;
    members: boolean;
    children: boolean;
  };
  // Error states
  errors: {
    households: string | null;
    members: string | null;
    children: string | null;
  };
  // Per-household cache timestamps
  lastFetchedByHousehold: {
    members: Map<string, number>;
    children: Map<string, number>;
  };
  // Global cache timestamp for households list
  lastFetched: {
    households: number | null;
  };
}

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Initial state
 */
const initialState: HouseholdState = {
  households: [],
  activeHouseholdId: null,
  membersByHousehold: new Map(),
  childrenByHousehold: new Map(),
  loading: {
    households: false,
    members: false,
    children: false,
  },
  errors: {
    households: null,
    members: null,
    children: null,
  },
  lastFetchedByHousehold: {
    members: new Map(),
    children: new Map(),
  },
  lastFetched: {
    households: null,
  },
};

/**
 * Centralized store for household-related state
 *
 * This store provides:
 * - Single source of truth for households, members, and children
 * - Request deduplication (prevents simultaneous duplicate API calls)
 * - Automatic caching with TTL
 * - Reactive updates across all components
 * - Coordinated loading/error states
 *
 * @example
 * // In a component
 * store = inject(HouseholdStore);
 *
 * // Read state reactively
 * households = this.store.households;
 * activeHousehold = this.store.activeHousehold;
 * children = this.store.children;
 * isLoading = this.store.isLoadingAny;
 *
 * // Load data (with automatic caching)
 * await this.store.loadHouseholds();
 *
 * // Force refresh
 * await this.store.loadHouseholds({ forceRefresh: true });
 */
@Injectable({
  providedIn: 'root',
})
export class HouseholdStore {
  private readonly api = inject(ApiService);
  private readonly storage = inject(StorageService);

  // Internal state signal
  private readonly state = signal<HouseholdState>({
    ...initialState,
    activeHouseholdId: this.getStoredHouseholdId(),
  });

  // In-flight request tracking to prevent duplicate requests
  private pendingRequests = {
    households: null as Promise<HouseholdListItem[]> | null,
    // Per-household request tracking
    membersByHousehold: new Map<string, Promise<HouseholdMemberResponse[]>>(),
    childrenByHousehold: new Map<string, Promise<Child[]>>(),
  };

  // ============================================
  // PUBLIC SELECTORS (read-only computed signals)
  // ============================================

  /** All households the user has access to */
  readonly households = computed(() => this.state().households);

  /** Current active household ID */
  readonly activeHouseholdId = computed(() => this.state().activeHouseholdId);

  /** Current active household details (if loaded) */
  readonly activeHousehold = computed(() => {
    const id = this.state().activeHouseholdId;
    if (!id) return null;
    return this.state().households.find((h) => h.id === id) ?? null;
  });

  /** Members of the active household */
  readonly members = computed(() => {
    const id = this.state().activeHouseholdId;
    if (!id) return [];
    return this.state().membersByHousehold.get(id) ?? [];
  });

  /** Children in the active household */
  readonly children = computed(() => {
    const id = this.state().activeHouseholdId;
    if (!id) return [];
    return this.state().childrenByHousehold.get(id) ?? [];
  });

  /** Whether any data is currently loading */
  readonly isLoadingAny = computed(() => {
    const { loading } = this.state();
    return loading.households || loading.members || loading.children;
  });

  /** Whether households are loading */
  readonly isLoadingHouseholds = computed(() => this.state().loading.households);

  /** Whether members are loading */
  readonly isLoadingMembers = computed(() => this.state().loading.members);

  /** Whether children are loading */
  readonly isLoadingChildren = computed(() => this.state().loading.children);

  /** Combined error message (first error found) */
  readonly error = computed(() => {
    const { errors } = this.state();
    return errors.households || errors.members || errors.children;
  });

  /** Whether user has any households */
  readonly hasHouseholds = computed(() => this.state().households.length > 0);

  /** Count of children in active household */
  readonly childrenCount = computed(() => {
    const id = this.state().activeHouseholdId;
    if (!id) return 0;
    return this.state().childrenByHousehold.get(id)?.length ?? 0;
  });

  /** Count of members in active household */
  readonly memberCount = computed(() => {
    const id = this.state().activeHouseholdId;
    if (!id) return 0;
    return this.state().membersByHousehold.get(id)?.length ?? 0;
  });

  /**
   * Get children for a specific household (not necessarily active)
   * Useful when displaying multiple households simultaneously
   */
  getChildrenForHousehold(householdId: string): Child[] {
    return this.state().childrenByHousehold.get(householdId) ?? [];
  }

  /**
   * Get members for a specific household (not necessarily active)
   * Useful when displaying multiple households simultaneously
   */
  getMembersForHousehold(householdId: string): HouseholdMemberResponse[] {
    return this.state().membersByHousehold.get(householdId) ?? [];
  }

  // ============================================
  // PUBLIC ACTIONS
  // ============================================

  /**
   * Load households list with automatic caching
   *
   * @param options.forceRefresh - Skip cache and fetch fresh data
   * @returns The loaded households
   */
  async loadHouseholds(options?: { forceRefresh?: boolean }): Promise<HouseholdListItem[]> {
    // Check cache
    if (!options?.forceRefresh && this.isCacheValid('households')) {
      return this.state().households;
    }

    // Return pending request if one exists (request deduplication)
    if (this.pendingRequests.households) {
      return this.pendingRequests.households;
    }

    // Set loading state
    this.updateState({ loading: { ...this.state().loading, households: true } });
    this.updateState({ errors: { ...this.state().errors, households: null } });

    try {
      // Create and track the request
      const request = this.api.get<HouseholdListItem[]>('/households');
      this.pendingRequests.households = request;

      const households = await request;

      // Update state
      this.updateState({
        households,
        loading: { ...this.state().loading, households: false },
        lastFetched: { ...this.state().lastFetched, households: Date.now() },
      });

      return households;
    } catch (error) {
      this.updateState({
        loading: { ...this.state().loading, households: false },
        errors: {
          ...this.state().errors,
          households: error instanceof Error ? error.message : 'Failed to load households',
        },
      });
      throw error;
    } finally {
      this.pendingRequests.households = null;
    }
  }

  /**
   * Load members for a specific household (or active household if not specified)
   *
   * @param householdId - The household ID to load members for (optional, defaults to active)
   * @param options.forceRefresh - Skip cache and fetch fresh data
   * @returns The loaded members
   */
  async loadMembers(
    householdId?: string,
    options?: { forceRefresh?: boolean },
  ): Promise<HouseholdMemberResponse[]> {
    // Default to active household if not specified
    const targetHouseholdId = householdId ?? this.state().activeHouseholdId;
    if (!targetHouseholdId) {
      return [];
    }

    // Check cache for this specific household
    if (!options?.forceRefresh && this.isCacheValidForHousehold('members', targetHouseholdId)) {
      return this.state().membersByHousehold.get(targetHouseholdId) ?? [];
    }

    // Return pending request if one exists for this household
    const pendingRequest = this.pendingRequests.membersByHousehold.get(targetHouseholdId);
    if (pendingRequest) {
      return pendingRequest;
    }

    // Set loading state
    this.updateState({ loading: { ...this.state().loading, members: true } });
    this.updateState({ errors: { ...this.state().errors, members: null } });

    try {
      const request = this.api.get<HouseholdMemberResponse[]>(
        `/households/${targetHouseholdId}/members`,
      );
      this.pendingRequests.membersByHousehold.set(targetHouseholdId, request);

      const members = await request;

      // Update cache for this household
      const newMap = new Map(this.state().membersByHousehold);
      newMap.set(targetHouseholdId, members);

      const newTimestamps = new Map(this.state().lastFetchedByHousehold.members);
      newTimestamps.set(targetHouseholdId, Date.now());

      this.updateState({
        membersByHousehold: newMap,
        loading: { ...this.state().loading, members: false },
        lastFetchedByHousehold: {
          ...this.state().lastFetchedByHousehold,
          members: newTimestamps,
        },
      });

      return members;
    } catch (error) {
      this.updateState({
        loading: { ...this.state().loading, members: false },
        errors: {
          ...this.state().errors,
          members: error instanceof Error ? error.message : 'Failed to load members',
        },
      });
      throw error;
    } finally {
      this.pendingRequests.membersByHousehold.delete(targetHouseholdId);
    }
  }

  /**
   * Load children for a specific household (or active household if not specified)
   *
   * @param householdId - The household ID to load children for (optional, defaults to active)
   * @param options.forceRefresh - Skip cache and fetch fresh data
   * @returns The loaded children
   */
  async loadChildren(householdId?: string, options?: { forceRefresh?: boolean }): Promise<Child[]> {
    // Default to active household if not specified
    const targetHouseholdId = householdId ?? this.state().activeHouseholdId;
    if (!targetHouseholdId) {
      return [];
    }

    // Check cache for this specific household
    if (!options?.forceRefresh && this.isCacheValidForHousehold('children', targetHouseholdId)) {
      return this.state().childrenByHousehold.get(targetHouseholdId) ?? [];
    }

    // Return pending request if one exists for this household
    const pendingRequest = this.pendingRequests.childrenByHousehold.get(targetHouseholdId);
    if (pendingRequest) {
      return pendingRequest;
    }

    // Set loading state
    this.updateState({ loading: { ...this.state().loading, children: true } });
    this.updateState({ errors: { ...this.state().errors, children: null } });

    try {
      const request = this.api
        .get<{ children: Child[] }>(`/households/${targetHouseholdId}/children`)
        .then((response) => response.children);
      this.pendingRequests.childrenByHousehold.set(targetHouseholdId, request);

      const children = await request;

      // Update cache for this household
      const newMap = new Map(this.state().childrenByHousehold);
      newMap.set(targetHouseholdId, children);

      const newTimestamps = new Map(this.state().lastFetchedByHousehold.children);
      newTimestamps.set(targetHouseholdId, Date.now());

      this.updateState({
        childrenByHousehold: newMap,
        loading: { ...this.state().loading, children: false },
        lastFetchedByHousehold: {
          ...this.state().lastFetchedByHousehold,
          children: newTimestamps,
        },
      });

      return children;
    } catch (error) {
      this.updateState({
        loading: { ...this.state().loading, children: false },
        errors: {
          ...this.state().errors,
          children: error instanceof Error ? error.message : 'Failed to load children',
        },
      });
      throw error;
    } finally {
      this.pendingRequests.childrenByHousehold.delete(targetHouseholdId);
    }
  }

  /**
   * Load all household context data in parallel
   *
   * @param options.forceRefresh - Skip cache and fetch fresh data
   */
  async loadHouseholdContext(options?: { forceRefresh?: boolean }): Promise<void> {
    await Promise.all([
      this.loadHouseholds(options),
      this.loadMembers(undefined, options),
      this.loadChildren(undefined, options),
    ]);
  }

  /**
   * Set the active household
   *
   * Preserves all household caches - switching between households is fast
   * because each household's data remains cached independently
   *
   * @param householdId - The household ID to activate
   */
  setActiveHousehold(householdId: string): void {
    const currentId = this.state().activeHouseholdId;

    // If same household, no action needed
    if (currentId === householdId) {
      return;
    }

    // Just update active ID - keep all caches intact
    this.updateState({
      activeHouseholdId: householdId,
    });

    this.storage.set(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID, householdId);
  }

  /**
   * Auto-activate a household for the current user
   *
   * Logic:
   * 1. If household is already active and exists, keep it
   * 2. If user has one household, activate it
   * 3. If user has multiple households, activate the first one
   */
  async autoActivateHousehold(): Promise<void> {
    const households = await this.loadHouseholds();

    if (households.length === 0) {
      this.clearActiveHousehold();
      return;
    }

    const storedId = this.state().activeHouseholdId;

    // Check if stored household is still valid
    if (storedId) {
      const isValid = households.some((h) => h.id === storedId);
      if (isValid) {
        return; // Keep current
      }
    }

    // Set first household as active
    this.setActiveHousehold(households[0].id);
  }

  /**
   * Clear the active household
   */
  clearActiveHousehold(): void {
    this.updateState({
      activeHouseholdId: null,
    });
    this.storage.remove(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID);
  }

  /**
   * Add a child to the store (after creation)
   *
   * @param householdId - The household this child belongs to
   * @param child - The child to add
   */
  addChild(householdId: string, child: Child): void {
    const newMap = new Map(this.state().childrenByHousehold);
    const current = newMap.get(householdId) ?? [];
    newMap.set(householdId, [...current, child]);
    this.updateState({ childrenByHousehold: newMap });
  }

  /**
   * Update a child in the store
   *
   * @param householdId - The household this child belongs to
   * @param childId - The child ID to update
   * @param updates - Partial child data to merge
   */
  updateChild(householdId: string, childId: string, updates: Partial<Child>): void {
    const newMap = new Map(this.state().childrenByHousehold);
    const current = newMap.get(householdId) ?? [];
    newMap.set(
      householdId,
      current.map((c) => (c.id === childId ? { ...c, ...updates } : c)),
    );
    this.updateState({ childrenByHousehold: newMap });
  }

  /**
   * Remove a child from the store
   *
   * @param householdId - The household this child belongs to
   * @param childId - The child ID to remove
   */
  removeChild(householdId: string, childId: string): void {
    const newMap = new Map(this.state().childrenByHousehold);
    const current = newMap.get(householdId) ?? [];
    newMap.set(
      householdId,
      current.filter((c) => c.id !== childId),
    );
    this.updateState({ childrenByHousehold: newMap });
  }

  /**
   * Add a household to the store (after creation)
   */
  addHousehold(household: HouseholdListItem): void {
    this.updateState({
      households: [...this.state().households, household],
    });
  }

  /**
   * Update a household in the store
   */
  updateHousehold(householdId: string, updates: Partial<HouseholdListItem>): void {
    this.updateState({
      households: this.state().households.map((h) =>
        h.id === householdId ? { ...h, ...updates } : h,
      ),
    });
  }

  /**
   * Remove a household from the store (after leave/delete)
   */
  removeHousehold(householdId: string): void {
    this.updateState({
      households: this.state().households.filter((h) => h.id !== householdId),
    });
  }

  /**
   * Invalidate all caches (force refresh on next load)
   */
  invalidateAll(): void {
    this.updateState({
      lastFetched: {
        households: null,
      },
      lastFetchedByHousehold: {
        members: new Map(),
        children: new Map(),
      },
    });
  }

  /**
   * Reset store to initial state (for logout)
   */
  reset(): void {
    this.state.set({
      ...initialState,
      activeHouseholdId: null,
    });
    this.storage.remove(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private getStoredHouseholdId(): string | null {
    return this.storage.getString(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID);
  }

  /**
   * Check if cache is valid for households list
   * (Members and children use per-household caching via isCacheValidForHousehold)
   */
  private isCacheValid(key: 'households'): boolean {
    const lastFetched = this.state().lastFetched[key];
    if (!lastFetched) return false;
    return Date.now() - lastFetched < CACHE_TTL;
  }

  /**
   * Check if cache is valid for a specific household
   *
   * @param key - The cache type to check
   * @param householdId - The household ID to check cache for
   * @returns true if cache exists and is within TTL
   */
  private isCacheValidForHousehold(key: 'members' | 'children', householdId: string): boolean {
    const lastFetched = this.state().lastFetchedByHousehold[key].get(householdId);
    if (!lastFetched) return false;
    return Date.now() - lastFetched < CACHE_TTL;
  }

  private updateState(partialState: Partial<HouseholdState>): void {
    this.state.update((current) => ({
      ...current,
      ...partialState,
    }));
  }
}
