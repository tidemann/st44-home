import { Injectable, signal, computed, inject } from '@angular/core';
import type {
  Household,
  CreateHouseholdRequest,
  UpdateHouseholdRequest,
  HouseholdMemberResponse,
} from '@st44/types';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { STORAGE_KEYS } from './storage-keys';

/**
 * Enriched Household response from list/get endpoints
 * Contains base Household fields plus computed/aggregated fields
 */
export interface HouseholdListItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  role: 'parent' | 'child'; // User's role in this household
  memberCount?: number;
  childrenCount?: number;
}

/**
 * Re-export HouseholdMemberResponse from @st44/types for consumers
 * This type matches the GET /households/:id/members response
 */
export type { HouseholdMemberResponse };

/**
 * Service for managing households and household state
 *
 * This service provides:
 * - CRUD operations for households
 * - Active household state management with signals
 * - localStorage persistence for active household
 * - Reactive updates across components
 */
@Injectable({
  providedIn: 'root',
})
export class HouseholdService {
  private readonly apiService = inject(ApiService);
  private readonly storage = inject(StorageService);

  // Active household ID stored in localStorage
  private activeHouseholdId = signal<string | null>(this.getStoredHouseholdId());

  /**
   * Computed signal exposing the active household ID (read-only)
   * Components can use this for reactive updates when household changes
   */
  activeHousehold$ = computed(() => this.activeHouseholdId());

  getActiveHouseholdId() {
    return this.activeHouseholdId();
  }

  setActiveHousehold(householdId: string): void {
    this.activeHouseholdId.set(householdId);
    this.storage.set(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID, householdId);
  }

  private getStoredHouseholdId(): string | null {
    return this.storage.getString(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID);
  }

  async createHousehold(name: string): Promise<Household> {
    return this.apiService.post<Household>('/households', {
      name,
    } satisfies CreateHouseholdRequest);
  }

  async listHouseholds(): Promise<HouseholdListItem[]> {
    return this.apiService.get<HouseholdListItem[]>('/households');
  }

  async getHousehold(id: string): Promise<HouseholdListItem> {
    return this.apiService.get<HouseholdListItem>(`/households/${id}`);
  }

  async updateHousehold(id: string, name: string): Promise<Household> {
    return this.apiService.put<Household>(`/households/${id}`, {
      name,
    } satisfies UpdateHouseholdRequest);
  }

  async getHouseholdMembers(householdId: string): Promise<HouseholdMemberResponse[]> {
    return this.apiService.get<HouseholdMemberResponse[]>(`/households/${householdId}/members`);
  }

  /**
   * Auto-activate a household for the current user
   * Logic:
   * 1. If household is already active and exists, keep it
   * 2. If user has one household, activate it
   * 3. If user has multiple households, activate the first one
   *
   * Call this after login to ensure user always has an active household context.
   */
  async autoActivateHousehold(): Promise<void> {
    const storedId = this.getStoredHouseholdId();
    const households = await this.listHouseholds();

    if (households.length === 0) {
      // No households - clear any stale active household
      this.activeHouseholdId.set(null);
      this.storage.remove(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID);
      return;
    }

    // Check if stored household is still valid
    if (storedId) {
      const isValid = households.some((h) => h.id === storedId);
      if (isValid) {
        // Stored household is valid, keep it
        this.activeHouseholdId.set(storedId);
        return;
      }
    }

    // Set first household as active
    const firstHousehold = households[0];
    this.setActiveHousehold(firstHousehold.id);
  }
}
