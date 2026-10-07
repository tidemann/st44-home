import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import type { RewardRedemption } from '@st44/types';
import { RewardService, ChildReward } from '../../services/reward.service';
import { Modal } from '../../components/modals/modal/modal';

/**
 * Child Rewards Component ("Mine belønninger", sketch 05)
 *
 * Allows children to:
 * - See their points balance
 * - Browse rewards; what they cannot afford yet says how many points are missing
 * - Ask for a reward, after a confirmation that says a parent has to say yes
 * - See their requests: waiting, yes, or no with the parent's reason
 */
@Component({
  selector: 'app-child-rewards',
  imports: [Modal],
  templateUrl: './child-rewards.html',
  styleUrls: ['./child-rewards.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildRewards implements OnInit {
  private rewardService = inject(RewardService);
  private successTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.successTimer));
  }

  // Local component state
  confirming = signal<ChildReward | null>(null);
  asking = signal(false);
  askError = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Service signals (exposed for template)
  childRewards = this.rewardService.childRewards;
  pointsBalance = this.rewardService.pointsBalance;
  loading = this.rewardService.childRewardsLoading;
  error = this.rewardService.childRewardsError;
  redemptions = this.rewardService.childRedemptions;

  /** Requests a parent has not answered yet */
  waiting = computed(() => this.redemptions().filter((r) => r.status === 'pending'));
  /** The latest answered requests */
  answered = computed(() =>
    this.redemptions()
      .filter((r) => r.status !== 'pending')
      .slice(0, 10),
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.rewardService.loadChildRewards().subscribe({
      error: (err) => console.error('Failed to load rewards:', err),
    });
    this.rewardService.loadChildRedemptions().subscribe({
      error: (err) => console.error('Failed to load reward requests:', err),
    });
  }

  /** Points the child still needs for this reward */
  missing(reward: ChildReward): number {
    return Math.max(reward.pointsCost - this.pointsBalance(), 0);
  }

  /** The reward's name for a request (a new request comes back without it) */
  rewardName(redemption: RewardRedemption): string {
    return (
      redemption.rewardName ??
      this.childRewards().find((r) => r.id === redemption.rewardId)?.name ??
      ''
    );
  }

  /** Open the confirmation sheet */
  ask(reward: ChildReward): void {
    if (!reward.canAfford || !reward.available) return;
    this.askError.set(null);
    this.confirming.set(reward);
  }

  closeSheet(): void {
    if (this.asking()) return;
    this.confirming.set(null);
    this.askError.set(null);
  }

  /** Send the request; a parent answers it */
  confirmAsk(): void {
    const reward = this.confirming();
    if (!reward || this.asking()) return;

    this.asking.set(true);
    this.askError.set(null);

    this.rewardService.redeemReward(reward.id).subscribe({
      next: () => {
        this.asking.set(false);
        this.confirming.set(null);
        this.successMessage.set(
          $localize`:@@childRewards.askedMessage:Du har bedt om «${reward.name}:rewardName:». Nå må en voksen svare.`,
        );
        // canAfford changes for the other rewards
        this.rewardService.loadChildRewards().subscribe();
        // A second ask restarts the 6 seconds for its own message
        clearTimeout(this.successTimer);
        this.successTimer = setTimeout(() => this.successMessage.set(null), 6000);
      },
      error: () => {
        this.asking.set(false);
        this.askError.set(
          $localize`:@@childRewards.askFailed:Det gikk ikke å sende ønsket. Prøv igjen om litt.`,
        );
      },
    });
  }
}
