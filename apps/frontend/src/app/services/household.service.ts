import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface Household {
  id: string;
  name: string;
  role: 'admin' | 'parent';
  memberCount?: number;
  childrenCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface HouseholdMember {
  user_id: string;
  email: string;
  display_name: string | null;
  role: 'admin' | 'parent';
  joined_at: string;
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
    return this.apiService.post<Household>('/households', { name });
  }

  async listHouseholds(): Promise<Household[]> {
    return this.apiService.get<Household[]>('/households');
  }

  async getHousehold(id: string): Promise<Household> {
    return this.apiService.get<Household>(`/households/${id}`);
  }

  async updateHousehold(id: string, name: string): Promise<Household> {
    return this.apiService.put<Household>(`/households/${id}`, { name });
  }

  async getHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
    return this.apiService.get<HouseholdMember[]>(
      `/households/${householdId}/members`,
    );
  }
}
