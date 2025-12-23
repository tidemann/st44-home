import { Injectable, signal, computed, inject } from '@angular/core';
import type { Household, CreateHouseholdRequest, UpdateHouseholdRequest } from '@st44/types';
import { ApiService } from './api.service';

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
 * Household member interface matching backend response
 * TODO: Migrate to @st44/types when HouseholdMember response schema added
 */
export interface HouseholdMember {
  userId: string;
  email: string;
  displayName: string | null;
  role: 'parent' | 'child';
  joinedAt: string;
}

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
  private apiService = inject(ApiService);

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
    localStorage.setItem('activeHouseholdId', householdId);
  }

  private getStoredHouseholdId(): string | null {
    return localStorage.getItem('activeHouseholdId');
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

  async getHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
    return this.apiService.get<HouseholdMember[]>(`/households/${householdId}/members`);
  }
}
