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
  // Members of the active household
  members: HouseholdMemberResponse[];
  // Children in the active household
  children: Child[];
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
  // Cache timestamps for invalidation
  lastFetched: {
    households: number | null;
    members: number | null;
    children: number | null;
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
  members: [],
  children: [],
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
  lastFetched: {
    households: null,
    members: null,
    children: null,
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
    members: null as Promise<HouseholdMemberResponse[]> | null,
    children: null as Promise<Child[]> | null,
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
  readonly members = computed(() => this.state().members);

  /** Children in the active household */
  readonly children = computed(() => this.state().children);

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
  readonly childrenCount = computed(() => this.state().children.length);

  /** Count of members in active household */
  readonly memberCount = computed(() => this.state().members.length);

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
   * Load members for the active household
   *
   * @param options.forceRefresh - Skip cache and fetch fresh data
   * @returns The loaded members
   */
  async loadMembers(options?: { forceRefresh?: boolean }): Promise<HouseholdMemberResponse[]> {
    const householdId = this.state().activeHouseholdId;
    if (!householdId) {
      return [];
    }

    // Check cache
    if (!options?.forceRefresh && this.isCacheValid('members')) {
      return this.state().members;
    }

    // Return pending request if one exists
    if (this.pendingRequests.members) {
      return this.pendingRequests.members;
    }

    // Set loading state
    this.updateState({ loading: { ...this.state().loading, members: true } });
    this.updateState({ errors: { ...this.state().errors, members: null } });

    try {
      const request = this.api.get<HouseholdMemberResponse[]>(`/households/${householdId}/members`);
      this.pendingRequests.members = request;

      const members = await request;

      this.updateState({
        members,
        loading: { ...this.state().loading, members: false },
        lastFetched: { ...this.state().lastFetched, members: Date.now() },
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
      this.pendingRequests.members = null;
    }
  }

  /**
   * Load children for the active household
   *
   * @param options.forceRefresh - Skip cache and fetch fresh data
   * @returns The loaded children
   */
  async loadChildren(options?: { forceRefresh?: boolean }): Promise<Child[]> {
    const householdId = this.state().activeHouseholdId;
    if (!householdId) {
      return [];
    }

    // Check cache
    if (!options?.forceRefresh && this.isCacheValid('children')) {
      return this.state().children;
    }

    // Return pending request if one exists
    if (this.pendingRequests.children) {
      return this.pendingRequests.children;
    }

    // Set loading state
    this.updateState({ loading: { ...this.state().loading, children: true } });
    this.updateState({ errors: { ...this.state().errors, children: null } });

    try {
      const request = this.api
        .get<{ children: Child[] }>(`/households/${householdId}/children`)
        .then((response) => response.children);
      this.pendingRequests.children = request;

      const children = await request;

      this.updateState({
        children,
        loading: { ...this.state().loading, children: false },
        lastFetched: { ...this.state().lastFetched, children: Date.now() },
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
      this.pendingRequests.children = null;
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
      this.loadMembers(options),
      this.loadChildren(options),
    ]);
  }

  /**
   * Set the active household and invalidate dependent caches
   *
   * @param householdId - The household ID to activate
   */
  setActiveHousehold(householdId: string): void {
    const currentId = this.state().activeHouseholdId;

    // If same household, no action needed
    if (currentId === householdId) {
      return;
    }

    // Update state and persist to storage
    this.updateState({
      activeHouseholdId: householdId,
      // Clear dependent data when switching households
      members: [],
      children: [],
      lastFetched: {
        ...this.state().lastFetched,
        members: null,
        children: null,
      },
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
      members: [],
      children: [],
    });
    this.storage.remove(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID);
  }

  /**
   * Add a child to the store (after creation)
   */
  addChild(child: Child): void {
    this.updateState({
      children: [...this.state().children, child],
    });
  }

  /**
   * Update a child in the store
   */
  updateChild(childId: string, updates: Partial<Child>): void {
    this.updateState({
      children: this.state().children.map((c) => (c.id === childId ? { ...c, ...updates } : c)),
    });
  }

  /**
   * Remove a child from the store
   */
  removeChild(childId: string): void {
    this.updateState({
      children: this.state().children.filter((c) => c.id !== childId),
    });
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
        members: null,
        children: null,
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

  private isCacheValid(key: 'households' | 'members' | 'children'): boolean {
    const lastFetched = this.state().lastFetched[key];
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
