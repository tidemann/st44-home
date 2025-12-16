import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

/**
 * Child statistics for dashboard
 */
export interface ChildStats {
  id: string;
  name: string;
  tasksCompleted: number;
  tasksTotal: number;
  completionRate: number;
}

/**
 * Week summary statistics
 */
export interface WeekSummary {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
}

/**
 * Dashboard summary response from API
 */
export interface DashboardSummary {
  household: {
    id: string;
    name: string;
  };
  weekSummary: WeekSummary;
  children: ChildStats[];
}

/**
 * Service for fetching dashboard data
 *
 * Provides methods to retrieve parent and child dashboard data
 * from the backend API.
 */
@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly api = inject(ApiService);

  /**
   * Fetch dashboard summary for a household
   * Used by parent dashboard to show week summary and children stats
   *
   * @param householdId - The household ID to fetch dashboard for
   * @returns Promise<DashboardSummary> - Dashboard data including week summary and children
   * @throws Error if household not found or user not a member
   */
  async getDashboard(householdId: string): Promise<DashboardSummary> {
    return this.api.get<DashboardSummary>(`/households/${householdId}/dashboard`);
  }
}
