import { Injectable, inject } from '@angular/core';
import type { Child, CreateChildRequest, UpdateChildRequest } from '@st44/types';
import { ApiService } from './api.service';

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
 */
@Injectable({
  providedIn: 'root',
})
export class ChildrenService {
  private api = inject(ApiService);

  /**
   * List all children in a household
   */
  async listChildren(householdId: string): Promise<Child[]> {
    const response = await this.api.get<ListChildrenResponse>(
      `/households/${householdId}/children`,
    );
    return response.children;
  }

  /**
   * Add a new child to a household
   */
  async createChild(householdId: string, data: CreateChildRequest): Promise<Child> {
    return this.api.post<Child>(`/households/${householdId}/children`, data);
  }

  /**
   * Update an existing child
   */
  async updateChild(
    householdId: string,
    childId: string,
    data: UpdateChildRequest,
  ): Promise<Child> {
    return this.api.put<Child>(`/households/${householdId}/children/${childId}`, data);
  }

  /**
   * Delete a child from a household
   */
  async deleteChild(householdId: string, childId: string): Promise<DeleteChildResponse> {
    return this.api.delete<DeleteChildResponse>(`/households/${householdId}/children/${childId}`);
  }
}
