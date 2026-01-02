import { Injectable, computed, inject } from '@angular/core';
import type { Household, CreateHouseholdRequest, UpdateHouseholdRequest } from '@st44/types';
import { ApiService } from './api.service';
import { HouseholdStore } from '../stores/household.store';

/**
 * Enriched Household response from list/get endpoints
 * Contains base Household fields plus computed/aggregated fields
 */
export interface HouseholdListItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  role: 'admin' | 'parent' | 'child'; // User's role in this household
  memberCount?: number;
  childrenCount?: number;
  adminCount?: number; // Number of admins in the household
}

/**
 * Re-export HouseholdMemberResponse from @st44/types for consumers
 */
export type { HouseholdMemberResponse } from '@st44/types';

/**
 * Service for managing households
 *
 * This service now delegates state management to HouseholdStore
 * while still providing:
 * - CRUD operations for households
 * - Active household state management (via store)
 * - Backwards-compatible API for existing consumers
 *
 * @see HouseholdStore for centralized state management
 */
@Injectable({
  providedIn: 'root',
})
export class HouseholdService {
  private readonly apiService = inject(ApiService);
  private readonly store = inject(HouseholdStore);

  /**
   * Computed signal exposing the active household ID (read-only)
   * Components can use this for reactive updates when household changes
   * @deprecated Use HouseholdStore.activeHouseholdId instead
   */
  activeHousehold$ = computed(() => this.store.activeHouseholdId());

  /**
   * Get the current active household ID
   * @deprecated Use HouseholdStore.activeHouseholdId() instead
   */
  getActiveHouseholdId(): string | null {
    return this.store.activeHouseholdId();
  }

  /**
   * Set the active household
   * @deprecated Use HouseholdStore.setActiveHousehold() instead
   */
  setActiveHousehold(householdId: string): void {
    this.store.setActiveHousehold(householdId);
  }

  /**
   * Create a new household
   */
  async createHousehold(name: string): Promise<Household> {
    const household = await this.apiService.post<Household>('/households', {
      name,
    } satisfies CreateHouseholdRequest);

    // Update store with new household
    this.store.addHousehold({
      ...household,
      role: 'parent' as const, // Creator is always parent
    });

    return household;
  }

  /**
   * List all households the user has access to
   * Uses cached data from HouseholdStore when available
   */
  async listHouseholds(): Promise<HouseholdListItem[]> {
    return this.store.loadHouseholds();
  }

  /**
   * Get a specific household by ID
   */
  async getHousehold(id: string): Promise<HouseholdListItem> {
    // Check store cache first
    const cachedHouseholds = this.store.households();
    const cached = cachedHouseholds.find((h) => h.id === id);
    if (cached) {
      return cached;
    }

    // Fallback to API
    return this.apiService.get<HouseholdListItem>(`/households/${id}`);
  }

  /**
   * Update an existing household
   */
  async updateHousehold(id: string, name: string): Promise<Household> {
    const household = await this.apiService.put<Household>(`/households/${id}`, {
      name,
    } satisfies UpdateHouseholdRequest);

    // Update store
    this.store.updateHousehold(id, { name });

    return household;
  }

  /**
   * Get members of a household
   * Uses cached data from HouseholdStore when available (for active household)
   */
  async getHouseholdMembers(
    householdId: string,
  ): Promise<import('@st44/types').HouseholdMemberResponse[]> {
    // If requesting active household members, use store
    if (householdId === this.store.activeHouseholdId()) {
      return this.store.loadMembers();
    }

    // Otherwise, fallback to API
    return this.apiService.get<import('@st44/types').HouseholdMemberResponse[]>(
      `/households/${householdId}/members`,
    );
  }

  /**
   * Auto-activate a household for the current user
   * @deprecated Use HouseholdStore.autoActivateHousehold() instead
   */
  async autoActivateHousehold(): Promise<void> {
    return this.store.autoActivateHousehold();
  }

  /**
   * Leave a household (remove current user from membership)
   * @throws Error if user is the only admin
   */
  async leaveHousehold(householdId: string): Promise<void> {
    await this.apiService.delete(`/households/${householdId}/members/me`);
    this.store.removeHousehold(householdId);

    // If leaving active household, switch to another
    if (this.store.activeHouseholdId() === householdId) {
      await this.store.autoActivateHousehold();
    }
  }

  /**
   * Delete a household permanently (admin only)
   * This will cascade delete all related data (members, children, tasks, rewards)
   */
  async deleteHousehold(householdId: string): Promise<void> {
    await this.apiService.delete(`/households/${householdId}`);
    this.store.removeHousehold(householdId);

    // If deleting active household, switch to another
    if (this.store.activeHouseholdId() === householdId) {
      await this.store.autoActivateHousehold();
    }
  }
}
