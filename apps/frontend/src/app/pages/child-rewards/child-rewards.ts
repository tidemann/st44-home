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
import { PageComponent } from '../../components/page/page';
import { RewardCard } from '../../components/poeng/reward-card/reward-card';
import { GroupLabel } from '../../components/poeng/group-label/group-label';
import { capitalize, dayWord, isoDay } from '../../utils/poeng-format';

/**
 * Child Rewards Component (Poeng screen 5, ST-777; first built as sketch 05)
 *
 * Allows children to:
 * - See their points balance
 * - Browse rewards; what they cannot afford yet says how many points are missing
 * - Ask for a reward, after a confirmation that says a parent has to say yes
 * - See their requests: waiting, yes, or no with the parent's reason
 */
@Component({
  selector: 'app-child-rewards',
  imports: [Modal, PageComponent, RewardCard, GroupLabel],
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

  /** Rewards with a request waiting for an answer: their card says so instead of «Spør mor» */
  waitingRewardIds = computed(() => new Set(this.waiting().map((r) => r.rewardId)));

  /** "3 av 5 kan hentes nå" */
  subtitle = computed(() => {
    const rewards = this.childRewards();
    const ready = rewards.filter((r) => r.available && r.canAfford).length;
    return $localize`:@@childRewards.subtitle:${ready}:ready: av ${rewards.length}:total: kan hentes nå`;
  });

  balanceLabel = computed(
    () => $localize`:@@childRewards.balanceAria:${this.pointsBalance()}:points: poeng å bruke`,
  );

  /** "Hentet før": requests a parent said yes to */
  collected = computed(() =>
    this.answered().filter((r) => r.status === 'approved' || r.status === 'fulfilled'),
  );

  /** Requests a parent said no to, with the reason */
  refused = computed(() => this.answered().filter((r) => r.status === 'rejected'));

  /** "Lørdag – Mor sa ja" */
  historyMeta(redemption: RewardRedemption): string {
    const at = redemption.decidedAt ?? redemption.redeemedAt;
    const day = capitalize(dayWord(isoDay(0, new Date(at))));
    const who = redemption.decidedByName;
    if (redemption.status === 'rejected') {
      return who
        ? $localize`:@@childRewards.historyNoBy:${day}:day: – ${who}:who: sa nei`
        : $localize`:@@childRewards.historyNo:${day}:day: – Nei denne gangen`;
    }
    return who
      ? $localize`:@@childRewards.historyYesBy:${day}:day: – ${who}:who: sa ja`
      : $localize`:@@childRewards.historyYes:${day}:day: – Ja`;
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
