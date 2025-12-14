import { Injectable, signal, inject } from '@angular/core';
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
  user_id: number;
  email: string;
  display_name: string | null;
  role: 'admin' | 'parent';
  joined_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class HouseholdService {
  private apiService = inject(ApiService);

  // Active household ID stored in localStorage
  private activeHouseholdId = signal<string | null>(this.getStoredHouseholdId());

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
    const response = await this.apiService.get<{ households: Household[] }>('/households');
    return response.households;
  }

  async getHousehold(id: string): Promise<Household> {
    return this.apiService.get<Household>(`/households/${id}`);
  }

  async updateHousehold(id: string, name: string): Promise<Household> {
    return this.apiService.put<Household>(`/households/${id}`, { name });
  }

  async getHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
    const response = await this.apiService.get<{ members: HouseholdMember[] }>(
      `/households/${householdId}/members`,
    );
    return response.members;
  }
}
