import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RewardService } from '../../services/reward.service';
import { AuthService } from '../../services/auth.service';
import type { Reward, CreateRewardRequest } from '@st44/types';

/**
 * Rewards Management Component (Parent/Admin)
 *
 * Allows parents to:
 * - View all rewards
 * - Create new rewards
 * - Edit existing rewards
 * - Delete rewards
 * - View and manage redemptions
 */
@Component({
  selector: 'app-rewards-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rewards-management.html',
  styleUrls: ['./rewards-management.css'],
})
export class RewardsManagementComponent implements OnInit {
  private rewardService = inject(RewardService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Component state signals
  showCreateForm = signal(false);
  editingReward = signal<Reward | null>(null);
  selectedTab = signal<'rewards' | 'redemptions'>('rewards');

  // Form state
  rewardForm = signal<CreateRewardRequest>({
    name: '',
    description: '',
    pointsCost: 50,
    quantity: null,
  });

  // Service signals (exposed for template)
  rewards = this.rewardService.rewards;
  loading = this.rewardService.loading;
  error = this.rewardService.error;
  redemptions = this.rewardService.redemptions;
  redemptionsLoading = this.rewardService.redemptionsLoading;
  pendingRedemptions = this.rewardService.pendingRedemptions;

  ngOnInit(): void {
    const householdId = this.authService.householdId();
    if (!householdId) {
      this.router.navigate(['/login']);
      return;
    }

    // Load rewards and redemptions
    this.rewardService.loadRewards(householdId).subscribe();
    this.rewardService.loadRedemptions(householdId).subscribe();
  }

  /**
   * Toggle create form visibility
   */
  toggleCreateForm(): void {
    this.showCreateForm.update((v) => !v);
    if (!this.showCreateForm()) {
      this.resetForm();
    }
  }

  /**
   * Create a new reward
   */
  createReward(): void {
    const householdId = this.authService.householdId();
    if (!householdId) return;

    const form = this.rewardForm();
    if (!form.name || form.pointsCost <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    this.rewardService.createReward(householdId, form).subscribe({
      next: () => {
        this.resetForm();
        this.showCreateForm.set(false);
      },
      error: (err) => {
        alert(`Failed to create reward: ${err.message}`);
      },
    });
  }

  /**
   * Start editing a reward
   */
  startEdit(reward: Reward): void {
    this.editingReward.set(reward);
    this.rewardForm.set({
      name: reward.name,
      description: reward.description || '',
      pointsCost: reward.pointsCost,
      quantity: reward.quantity,
    });
  }

  /**
   * Save edited reward
   */
  saveEdit(): void {
    const householdId = this.authService.householdId();
    const editing = this.editingReward();
    if (!householdId || !editing) return;

    this.rewardService.updateReward(householdId, editing.id, this.rewardForm()).subscribe({
      next: () => {
        this.editingReward.set(null);
        this.resetForm();
      },
      error: (err) => {
        alert(`Failed to update reward: ${err.message}`);
      },
    });
  }

  /**
   * Cancel editing
   */
  cancelEdit(): void {
    this.editingReward.set(null);
    this.resetForm();
  }

  /**
   * Delete a reward
   */
  deleteReward(reward: Reward): void {
    if (!confirm(`Are you sure you want to delete "${reward.name}"?`)) return;

    const householdId = this.authService.householdId();
    if (!householdId) return;

    this.rewardService.deleteReward(householdId, reward.id).subscribe({
      error: (err) => {
        alert(`Failed to delete reward: ${err.message}`);
      },
    });
  }

  /**
   * Toggle reward active status
   */
  toggleActive(reward: Reward): void {
    const householdId = this.authService.householdId();
    if (!householdId) return;

    this.rewardService.updateReward(householdId, reward.id, { active: !reward.active }).subscribe({
      error: (err) => {
        alert(`Failed to update reward: ${err.message}`);
      },
    });
  }

  /**
   * Approve a redemption
   */
  approveRedemption(redemptionId: string): void {
    const householdId = this.authService.householdId();
    if (!householdId) return;

    this.rewardService.approveRedemption(householdId, redemptionId).subscribe({
      error: (err) => {
        alert(`Failed to approve redemption: ${err.message}`);
      },
    });
  }

  /**
   * Fulfill a redemption
   */
  fulfillRedemption(redemptionId: string): void {
    const householdId = this.authService.householdId();
    if (!householdId) return;

    this.rewardService.fulfillRedemption(householdId, redemptionId).subscribe({
      error: (err) => {
        alert(`Failed to fulfill redemption: ${err.message}`);
      },
    });
  }

  /**
   * Reject a redemption
   */
  rejectRedemption(redemptionId: string): void {
    if (!confirm('Are you sure you want to reject this redemption?')) return;

    const householdId = this.authService.householdId();
    if (!householdId) return;

    this.rewardService.rejectRedemption(householdId, redemptionId).subscribe({
      error: (err) => {
        alert(`Failed to reject redemption: ${err.message}`);
      },
    });
  }

  /**
   * Reset form to initial state
   */
  private resetForm(): void {
    this.rewardForm.set({
      name: '',
      description: '',
      pointsCost: 50,
      quantity: null,
    });
  }

  /**
   * Switch tabs
   */
  switchTab(tab: 'rewards' | 'redemptions'): void {
    this.selectedTab.set(tab);
  }
}
