import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import type { HouseholdAnalytics, ChildAnalytics, AnalyticsPeriod } from '@st44/types';

/**
 * Analytics Service
 *
 * Provides methods to retrieve analytics and reporting data
 * from the backend API for both households and individual children.
 */
@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly api = inject(ApiService);

  /**
   * Fetch analytics for a household
   *
   * Returns comprehensive analytics including:
   * - Period comparison (current vs previous)
   * - Children progress history with daily data
   * - Streak tracking for each child
   * - Task popularity metrics
   *
   * @param householdId - The household ID to fetch analytics for
   * @param period - Time period for analytics ('week', 'month', or 'all')
   * @returns Promise<HouseholdAnalytics> - Complete analytics data
   * @throws Error if household not found or user not a member
   */
  async getHouseholdAnalytics(
    householdId: string,
    period: AnalyticsPeriod = 'week',
  ): Promise<HouseholdAnalytics> {
    const params = new URLSearchParams();
    if (period) {
      params.set('period', period);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.api.get<HouseholdAnalytics>(`/households/${householdId}/analytics${query}`);
  }

  /**
   * Fetch analytics for the authenticated child
   *
   * Returns child-specific analytics including:
   * - Current and longest streaks
   * - Week and month progress summaries
   * - Daily points history
   *
   * @param period - Time period for analytics ('week', 'month', or 'all')
   * @returns Promise<ChildAnalytics> - Child analytics data
   * @throws Error if user is not a child or child profile not found
   */
  async getChildAnalytics(period: AnalyticsPeriod = 'week'): Promise<ChildAnalytics> {
    const params = new URLSearchParams();
    if (period) {
      params.set('period', period);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.api.get<ChildAnalytics>(`/children/me/analytics${query}`);
  }
}
