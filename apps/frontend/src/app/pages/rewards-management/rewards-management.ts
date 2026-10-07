import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { REDEMPTION_UNDO_SECONDS } from '@st44/types';
import type { Reward, CreateRewardRequest, RewardRedemption } from '@st44/types';
import { RewardService } from '../../services/reward.service';
import { HouseholdService } from '../../services/household.service';
import { PageComponent } from '../../components/page/page';

/**
 * Rewards Management Component (Parent/Admin, sketch 06)
 *
 * Allows parents to:
 * - Answer reward requests: "Si ja", or "Si nei" with one sentence why
 * - Undo an answer for 5 minutes (the receipt replaces the request card)
 * - Mark a reward as given
 * - Create, edit, pause and delete rewards
 */
@Component({
  selector: 'app-rewards-management',
  imports: [DatePipe, FormsModule, PageComponent],
  templateUrl: './rewards-management.html',
  styleUrls: ['./rewards-management.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RewardsManagementComponent implements OnInit {
  private rewardService = inject(RewardService);
  private householdService = inject(HouseholdService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // Component state signals
  showCreateForm = signal(false);
  editingReward = signal<Reward | null>(null);
  selectedTab = signal<'requests' | 'rewards'>('requests');

  /** The request the parent is writing a "no" for, and the reason so far */
  rejectingId = signal<string | null>(null);
  rejectReason = signal('');
  /** The request an answer is being sent for */
  busyId = signal<string | null>(null);
  actionError = signal<string | null>(null);

  /** Ticks so the undo button disappears when the 5 minutes are over */
  now = signal(Date.now());
  /** Server clock minus this device's clock, learned from the last answer's decidedAt */
  clockOffset = signal(0);

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

  /** Waiting requests and fresh answers (shown as a receipt with "Angre") */
  waiting = computed(() =>
    this.redemptions().filter((r) => r.status === 'pending' || this.canUndo(r)),
  );
  /** Said yes, not given yet */
  toGive = computed(() =>
    this.redemptions().filter((r) => r.status === 'approved' && !this.canUndo(r)),
  );
  /** Given or said no, after the undo window */
  history = computed(() =>
    this.redemptions()
      .filter((r) => (r.status === 'fulfilled' || r.status === 'rejected') && !this.canUndo(r))
      .slice(0, 20),
  );

  ngOnInit(): void {
    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId) {
      this.router.navigate(['/household/create']);
      return;
    }

    this.rewardService.loadRewards(householdId).subscribe();
    this.rewardService.loadRedemptions(householdId).subscribe();

    const timer = setInterval(() => this.now.set(Date.now()), 10_000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  /** An answer can be undone for REDEMPTION_UNDO_SECONDS after it was given */
  canUndo(redemption: RewardRedemption): boolean {
    if (redemption.status !== 'approved' && redemption.status !== 'rejected') return false;
    if (!redemption.decidedAt) return false;
    const age = this.now() + this.clockOffset() - Date.parse(redemption.decidedAt);
    return age < REDEMPTION_UNDO_SECONDS * 1000;
  }

  // ===== Answering requests =====

  approve(redemption: RewardRedemption): void {
    this.send(redemption, (householdId) =>
      this.rewardService.approveRedemption(householdId, redemption.id),
    );
  }

  startReject(redemption: RewardRedemption): void {
    this.actionError.set(null);
    this.rejectReason.set('');
    this.rejectingId.set(redemption.id);
  }

  cancelReject(): void {
    this.rejectingId.set(null);
    this.rejectReason.set('');
  }

  confirmReject(redemption: RewardRedemption): void {
    const reason = this.rejectReason().trim();
    if (!reason) return;
    this.send(redemption, (householdId) =>
      this.rewardService.rejectRedemption(householdId, redemption.id, reason),
    );
  }

  undo(redemption: RewardRedemption): void {
    this.send(redemption, (householdId) =>
      this.rewardService.undoRedemption(householdId, redemption.id),
    );
  }

  fulfill(redemption: RewardRedemption): void {
    this.send(redemption, (householdId) =>
      this.rewardService.fulfillRedemption(householdId, redemption.id),
    );
  }

  private send(
    redemption: RewardRedemption,
    call: (householdId: string) => ReturnType<RewardService['approveRedemption']>,
  ): void {
    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId || this.busyId()) return;

    this.busyId.set(redemption.id);
    this.actionError.set(null);
    this.now.set(Date.now());

    call(householdId).subscribe({
      next: (answered) => {
        this.busyId.set(null);
        this.rejectingId.set(null);
        this.rejectReason.set('');
        this.now.set(Date.now());
        // The server just set decidedAt, so the difference is the clock skew
        if (answered?.decidedAt) {
          this.clockOffset.set(Date.parse(answered.decidedAt) - this.now());
        }
      },
      error: () => {
        this.busyId.set(null);
        this.actionError.set(
          $localize`:@@rewards.actionFailed:Det gikk ikke. Kanskje noen andre svarte først, eller tiden for å angre er ute. Last siden på nytt og prøv igjen.`,
        );
      },
    });
  }

  // ===== Managing rewards =====

  toggleCreateForm(): void {
    this.showCreateForm.update((v) => !v);
    if (!this.showCreateForm()) {
      this.resetForm();
    }
  }

  createReward(): void {
    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId) return;

    const form = this.rewardForm();
    if (!form.name || form.pointsCost <= 0) {
      alert($localize`:@@rewards.fillRequired:Skriv et navn og hvor mange poeng det koster.`);
      return;
    }

    this.rewardService.createReward(householdId, form).subscribe({
      next: () => {
        this.resetForm();
        this.showCreateForm.set(false);
      },
      error: () => {
        alert($localize`:@@rewards.createFailed:Belønningen ble ikke lagret. Prøv igjen.`);
      },
    });
  }

  startEdit(reward: Reward): void {
    this.editingReward.set(reward);
    this.rewardForm.set({
      name: reward.name,
      description: reward.description || '',
      pointsCost: reward.pointsCost,
      quantity: reward.quantity,
    });
  }

  saveEdit(): void {
    const householdId = this.householdService.getActiveHouseholdId();
    const editing = this.editingReward();
    if (!householdId || !editing) return;

    this.rewardService.updateReward(householdId, editing.id, this.rewardForm()).subscribe({
      next: () => {
        this.editingReward.set(null);
        this.resetForm();
      },
      error: () => {
        alert($localize`:@@rewards.updateFailed:Endringen ble ikke lagret. Prøv igjen.`);
      },
    });
  }

  cancelEdit(): void {
    this.editingReward.set(null);
    this.resetForm();
  }

  deleteReward(reward: Reward): void {
    if (!confirm($localize`:@@rewards.confirmDelete:Vil du slette «${reward.name}:rewardName:»?`)) {
      return;
    }

    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId) return;

    this.rewardService.deleteReward(householdId, reward.id).subscribe({
      error: () => {
        alert($localize`:@@rewards.deleteFailed:Belønningen ble ikke slettet. Prøv igjen.`);
      },
    });
  }

  toggleActive(reward: Reward): void {
    const householdId = this.householdService.getActiveHouseholdId();
    if (!householdId) return;

    this.rewardService.updateReward(householdId, reward.id, { active: !reward.active }).subscribe({
      error: () => {
        alert($localize`:@@rewards.updateFailed:Endringen ble ikke lagret. Prøv igjen.`);
      },
    });
  }

  private resetForm(): void {
    this.rewardForm.set({
      name: '',
      description: '',
      pointsCost: 50,
      quantity: null,
    });
  }

  switchTab(tab: 'requests' | 'rewards'): void {
    this.selectedTab.set(tab);
  }
}
