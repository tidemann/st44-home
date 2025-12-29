import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RewardService, ChildReward } from '../../services/reward.service';

/**
 * Child Rewards Store Component
 *
 * Allows children to:
 * - View their current points balance
 * - Browse available rewards
 * - Redeem rewards with their points
 */
@Component({
  selector: 'app-child-rewards',
  imports: [CommonModule],
  templateUrl: './child-rewards.html',
  styleUrls: ['./child-rewards.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildRewards implements OnInit {
  private rewardService = inject(RewardService);
  private router = inject(Router);

  // Local component state
  redeemingRewardId = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Service signals (exposed for template)
  childRewards = this.rewardService.childRewards;
  pointsBalance = this.rewardService.pointsBalance;
  loading = this.rewardService.childRewardsLoading;
  error = this.rewardService.childRewardsError;

  ngOnInit(): void {
    this.rewardService.loadChildRewards().subscribe({
      error: (err) => {
        console.error('Failed to load rewards:', err);
      },
    });
  }

  /**
   * Redeem a reward
   */
  redeemReward(reward: ChildReward): void {
    if (!reward.canAfford || !reward.available) {
      return;
    }

    if (!confirm(`Redeem "${reward.name}" for ${reward.pointsCost} points?`)) {
      return;
    }

    this.redeemingRewardId.set(reward.id);
    this.successMessage.set(null);

    this.rewardService.redeemReward(reward.id).subscribe({
      next: (response) => {
        this.redeemingRewardId.set(null);
        this.successMessage.set(
          `Redeemed "${reward.name}"! Your new balance is ${response.newBalance} points.`,
        );
        // Reload rewards to update canAfford status
        this.rewardService.loadChildRewards().subscribe();
        // Clear success message after 5 seconds
        setTimeout(() => this.successMessage.set(null), 5000);
      },
      error: (err) => {
        this.redeemingRewardId.set(null);
        alert(`Failed to redeem reward: ${err.message || 'Unknown error'}`);
      },
    });
  }

  /**
   * Navigate back to dashboard
   */
  goBack(): void {
    this.router.navigate(['/my-tasks']);
  }
}
