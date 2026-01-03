import { Injectable, inject } from '@angular/core';
import type { Child, CreateChildRequest, UpdateChildRequest } from '@st44/types';
import { ApiService } from './api.service';
import { HouseholdStore } from '../stores/household.store';

/**
 * List children API response wrapper
 * Backend returns { children: Child[] }
 */
export interface ListChildrenResponse {
  children: Child[];
}

/**
 * Delete child API response
 * Backend returns { success: boolean, message: string }
 */
export interface DeleteChildResponse {
  success: boolean;
  message: string;
}

/**
 * Service for managing children in households
 *
 * This service now integrates with HouseholdStore for caching
 * and centralized state management of children data.
 *
 * @see HouseholdStore for centralized state management
 */
@Injectable({
  providedIn: 'root',
})
export class ChildrenService {
  private api = inject(ApiService);
  private store = inject(HouseholdStore);

  /**
   * List all children in a household
   * Uses cached data from HouseholdStore (supports any household, not just active)
   */
  async listChildren(householdId: string): Promise<Child[]> {
    return this.store.loadChildren(householdId);
  }

  /**
   * Add a new child to a household
   */
  async createChild(householdId: string, data: CreateChildRequest): Promise<Child> {
    const child = await this.api.post<Child>(`/households/${householdId}/children`, data);
    this.store.addChild(householdId, child);
    return child;
  }

  /**
   * Update an existing child
   */
  async updateChild(
    householdId: string,
    childId: string,
    data: UpdateChildRequest,
  ): Promise<Child> {
    const child = await this.api.put<Child>(`/households/${householdId}/children/${childId}`, data);
    this.store.updateChild(householdId, childId, child);
    return child;
  }

  /**
   * Delete a child from a household
   */
  async deleteChild(householdId: string, childId: string): Promise<DeleteChildResponse> {
    const response = await this.api.delete<DeleteChildResponse>(
      `/households/${householdId}/children/${childId}`,
    );
    this.store.removeChild(householdId, childId);
    return response;
  }

  /**
   * Create a user account for a child
   * Links the child profile to a new user account with 'child' role
   */
  async createChildAccount(
    householdId: string,
    childId: string,
    email: string,
    password: string,
  ): Promise<Child> {
    const child = await this.api.post<Child>(
      `/households/${householdId}/children/${childId}/create-account`,
      {
        email,
        password,
      },
    );
    this.store.updateChild(householdId, childId, child);
    return child;
  }
}
