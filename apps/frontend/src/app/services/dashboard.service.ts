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
 * Child's individual task from my-tasks endpoint
 */
export interface ChildTask {
  id: string;
  taskName: string;
  taskDescription: string;
  points: number;
  date: string;
  status: 'pending' | 'completed';
  completedAt: string | null;
}

/**
 * Response from /api/children/my-tasks endpoint
 */
export interface MyTasksResponse {
  tasks: ChildTask[];
  totalPointsToday: number;
  completedPoints: number;
  childName: string;
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

  /**
   * Fetch child's tasks for today or specified date
   * Used by child dashboard to show assigned tasks and points
   *
   * @param householdId - Optional household ID (uses current household if not provided)
   * @param date - Optional date in YYYY-MM-DD format (defaults to today)
   * @returns Promise<MyTasksResponse> - Child's tasks, points, and name
   * @throws Error if user is not a child or child profile not found
   */
  async getMyTasks(householdId?: string, date?: string): Promise<MyTasksResponse> {
    const params = new URLSearchParams();
    if (householdId) {
      params.set('householdId', householdId);
    }
    if (date) {
      params.set('date', date);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.api.get<MyTasksResponse>(`/children/my-tasks${query}`);
  }
}
