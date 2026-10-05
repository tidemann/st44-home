import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, from, map, tap, catchError, throwError } from 'rxjs';
import { ApiService } from './api.service';

// Import shared types from @st44/types
import type {
  Reward,
  CreateRewardRequest,
  UpdateRewardRequest,
  RewardRedemption,
  ChildRewardsResponse,
  RedeemRewardResponse,
  ChildRedemptionsResponse,
} from '@st44/types';

// Extended reward type with availability info for child view
export interface ChildReward extends Reward {
  available: boolean;
  canAfford: boolean;
}

/**
 * Service for managing rewards and redemptions with signals-based state management
 *
 * This service provides:
 * - CRUD operations for rewards (parent)
 * - Redemption management (child and parent)
 * - Reactive state management using signals
 * - Loading and error state tracking
 * - Points balance tracking
 */
@Injectable({
  providedIn: 'root',
})
export class RewardService {
  private apiService = inject(ApiService);

  // Rewards state signals (private writable)
  private rewardsSignal = signal<Reward[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Redemptions state signals (private writable)
  private redemptionsSignal = signal<RewardRedemption[]>([]);
  private redemptionsLoadingSignal = signal<boolean>(false);
  private redemptionsErrorSignal = signal<string | null>(null);

  // Child rewards state signals (private writable)
  private childRewardsSignal = signal<ChildReward[]>([]);
  private pointsBalanceSignal = signal<number>(0);
  private childRewardsLoadingSignal = signal<boolean>(false);
  private childRewardsErrorSignal = signal<string | null>(null);
  private childRedemptionsSignal = signal<RewardRedemption[]>([]);

  // Public readonly signals for rewards
  public readonly rewards = this.rewardsSignal.asReadonly();
  public readonly loading = this.loadingSignal.asReadonly();
  public readonly error = this.errorSignal.asReadonly();

  // Public readonly signals for redemptions
  public readonly redemptions = this.redemptionsSignal.asReadonly();
  public readonly redemptionsLoading = this.redemptionsLoadingSignal.asReadonly();
  public readonly redemptionsError = this.redemptionsErrorSignal.asReadonly();

  // Public readonly signals for child rewards
  public readonly childRewards = this.childRewardsSignal.asReadonly();
  public readonly pointsBalance = this.pointsBalanceSignal.asReadonly();
  public readonly childRewardsLoading = this.childRewardsLoadingSignal.asReadonly();
  public readonly childRewardsError = this.childRewardsErrorSignal.asReadonly();
  public readonly childRedemptions = this.childRedemptionsSignal.asReadonly();

  // Computed signals for filtered reward lists
  public readonly activeRewards = computed(() => this.rewardsSignal().filter((r) => r.active));
  public readonly inactiveRewards = computed(() => this.rewardsSignal().filter((r) => !r.active));

  // Computed signals for filtered redemption lists
  public readonly pendingRedemptions = computed(() =>
    this.redemptionsSignal().filter((r) => r.status === 'pending'),
  );
  public readonly approvedRedemptions = computed(() =>
    this.redemptionsSignal().filter((r) => r.status === 'approved'),
  );
  public readonly fulfilledRedemptions = computed(() =>
    this.redemptionsSignal().filter((r) => r.status === 'fulfilled'),
  );

  /**
   * Load all rewards for a household
   */
  loadRewards(householdId: string, activeOnly = false): Observable<Reward[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const url = activeOnly
      ? `/households/${householdId}/rewards?active=true`
      : `/households/${householdId}/rewards`;

    return from(this.apiService.get<{ rewards: Reward[] }>(url)).pipe(
      map((response) => response.rewards),
      tap((rewards) => {
        this.rewardsSignal.set(rewards);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error.message || 'Failed to load rewards');
        this.loadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Create a new reward
   */
  createReward(householdId: string, request: CreateRewardRequest): Observable<Reward> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return from(this.apiService.post<Reward>(`/households/${householdId}/rewards`, request)).pipe(
      tap((reward) => {
        // Add to local state
        this.rewardsSignal.update((rewards) => [...rewards, reward]);
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error.message || 'Failed to create reward');
        this.loadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Update an existing reward
   */
  updateReward(
    householdId: string,
    rewardId: string,
    request: UpdateRewardRequest,
  ): Observable<Reward> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return from(
      this.apiService.put<Reward>(`/households/${householdId}/rewards/${rewardId}`, request),
    ).pipe(
      tap((updatedReward) => {
        // Update in local state
        this.rewardsSignal.update((rewards) =>
          rewards.map((r) => (r.id === rewardId ? updatedReward : r)),
        );
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error.message || 'Failed to update reward');
        this.loadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Delete a reward (soft delete)
   */
  deleteReward(householdId: string, rewardId: string): Observable<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return from(
      this.apiService.delete<{ success: boolean; message: string }>(
        `/households/${householdId}/rewards/${rewardId}`,
      ),
    ).pipe(
      map(() => undefined),
      tap(() => {
        // Remove from local state or mark as inactive
        this.rewardsSignal.update((rewards) => rewards.filter((r) => r.id !== rewardId));
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        this.errorSignal.set(error.message || 'Failed to delete reward');
        this.loadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Load redemptions for a household
   */
  loadRedemptions(householdId: string, status?: string): Observable<RewardRedemption[]> {
    this.redemptionsLoadingSignal.set(true);
    this.redemptionsErrorSignal.set(null);

    const url = status
      ? `/households/${householdId}/redemptions?status=${status}`
      : `/households/${householdId}/redemptions`;

    return from(this.apiService.get<{ redemptions: RewardRedemption[] }>(url)).pipe(
      map((response) => response.redemptions),
      tap((redemptions) => {
        this.redemptionsSignal.set(redemptions);
        this.redemptionsLoadingSignal.set(false);
      }),
      catchError((error) => {
        this.redemptionsErrorSignal.set(error.message || 'Failed to load redemptions');
        this.redemptionsLoadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Approve a redemption ("Si ja")
   */
  approveRedemption(householdId: string, redemptionId: string): Observable<RewardRedemption> {
    return this.answerRedemption(householdId, redemptionId, 'approve');
  }

  /**
   * Fulfill a redemption (the reward has been given)
   */
  fulfillRedemption(householdId: string, redemptionId: string): Observable<RewardRedemption> {
    return this.answerRedemption(householdId, redemptionId, 'fulfill');
  }

  /**
   * Reject a redemption ("Si nei"), with a reason the child sees
   */
  rejectRedemption(
    householdId: string,
    redemptionId: string,
    reason?: string,
  ): Observable<RewardRedemption> {
    return this.answerRedemption(householdId, redemptionId, 'reject', reason ? { reason } : {});
  }

  /**
   * Undo a yes or a no within REDEMPTION_UNDO_SECONDS; the request waits again
   */
  undoRedemption(householdId: string, redemptionId: string): Observable<RewardRedemption> {
    return this.answerRedemption(householdId, redemptionId, 'undo');
  }

  /**
   * Posts one answer and updates the request in place. The list does not go
   * into its loading state, so the card the parent tapped stays on screen.
   */
  private answerRedemption(
    householdId: string,
    redemptionId: string,
    action: 'approve' | 'fulfill' | 'reject' | 'undo',
    body: object = {},
  ): Observable<RewardRedemption> {
    this.redemptionsErrorSignal.set(null);

    return from(
      this.apiService.post<RewardRedemption>(
        `/households/${householdId}/redemptions/${redemptionId}/${action}`,
        body,
      ),
    ).pipe(
      tap((updatedRedemption) => {
        // The answer has no names; keep the ones from the list
        this.redemptionsSignal.update((redemptions) =>
          redemptions.map((r) => (r.id === redemptionId ? { ...r, ...updatedRedemption } : r)),
        );
      }),
      catchError((error) => {
        this.redemptionsErrorSignal.set(error.message || `Failed to ${action} redemption`);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Load the child's own reward requests, newest first
   */
  loadChildRedemptions(): Observable<RewardRedemption[]> {
    return from(this.apiService.get<ChildRedemptionsResponse>('/children/me/redemptions')).pipe(
      map((response) => response.redemptions),
      tap((redemptions) => this.childRedemptionsSignal.set(redemptions)),
    );
  }

  /**
   * Load available rewards and points balance for child
   */
  loadChildRewards(): Observable<ChildRewardsResponse> {
    this.childRewardsLoadingSignal.set(true);
    this.childRewardsErrorSignal.set(null);

    return from(this.apiService.get<ChildRewardsResponse>('/children/me/rewards')).pipe(
      tap((response) => {
        this.childRewardsSignal.set(response.rewards);
        this.pointsBalanceSignal.set(response.pointsBalance);
        this.childRewardsLoadingSignal.set(false);
      }),
      catchError((error) => {
        this.childRewardsErrorSignal.set(error.message || 'Failed to load rewards');
        this.childRewardsLoadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Redeem a reward (child)
   */
  redeemReward(rewardId: string): Observable<RedeemRewardResponse> {
    // No loading state and no page-wide error: the page stays as it is and the
    // caller shows what went wrong next to the reward
    return from(
      this.apiService.post<RedeemRewardResponse>(`/children/me/rewards/${rewardId}/redeem`, {}),
    ).pipe(
      tap((response) => {
        // Update points balance and put the new request first
        this.pointsBalanceSignal.set(response.newBalance);
        this.childRedemptionsSignal.update((redemptions) => [response.redemption, ...redemptions]);
      }),
    );
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.errorSignal.set(null);
    this.redemptionsErrorSignal.set(null);
    this.childRewardsErrorSignal.set(null);
  }
}
