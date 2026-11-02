import '@angular/localize/init';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ScanResult } from '@st44/types';
import { PageComponent } from '../../components/page/page';
import { TickMoment, type TickGoal } from '../../components/poeng/tick-moment/tick-moment';
import { TurnService } from '../../services/turn.service';
import { TaskService } from '../../services/task.service';
import { RewardService } from '../../services/reward.service';
import { AuthService } from '../../services/auth.service';
import { clockTime } from '../../utils/poeng-format';

type ScanState =
  | { kind: 'loading' }
  | { kind: 'done'; result: Extract<ScanResult, { result: 'done' }> }
  | { kind: 'notYours'; result: Extract<ScanResult, { result: 'not_your_turn' }> }
  | { kind: 'unknown' }
  | { kind: 'failed' };

/** «Emmas tur», «Jonas' tur»: Norwegian genitive of a name */
export function possessive(name: string): string {
  return /[sxz]$/i.test(name) ? `${name}'` : `${name}s`;
}

/**
 * What the phone shows after the camera or the NFC sticker opened the chore's link
 * (ST-2075, drawings 7 and 8 on ST-2066). The child whose turn it is: the tick moment,
 * «Skannet 16.48», the points and who has the turn now; the same as the tick in the app.
 * Anyone else: «Det er Emmas tur», and nothing changes.
 */
@Component({
  selector: 'app-scan-page',
  imports: [PageComponent, TickMoment],
  templateUrl: './scan.html',
  styleUrl: './scan.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly turnService = inject(TurnService);
  private readonly taskService = inject(TaskService);
  private readonly rewardService = inject(RewardService);
  private readonly authService = inject(AuthService);

  protected readonly state = signal<ScanState>({ kind: 'loading' });
  protected readonly undoBusy = signal(false);
  protected readonly undoError = signal<string | null>(null);

  private readonly balance = this.rewardService.pointsBalance;

  /** The reward the meter counts towards, after this chore's points landed */
  protected readonly goal = computed<TickGoal | null>(() => {
    const balance = this.balance();
    const ahead = this.rewardService
      .childRewards()
      .filter((r) => r.available && r.pointsCost > balance)
      .sort((a, b) => a.pointsCost - b.pointsCost)[0];
    return ahead ? { name: ahead.name, cost: ahead.pointsCost, balance } : null;
  });

  protected readonly childName = computed(() => this.authService.currentUser()?.firstName ?? '');

  async ngOnInit(): Promise<void> {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    try {
      const result = await this.turnService.scan(code);
      if (result.result === 'done') {
        this.state.set({ kind: 'done', result });
        if (this.authService.getUserRole() === 'child') this.refreshRewards();
      } else {
        this.state.set({ kind: 'notYours', result });
      }
    } catch (err) {
      const notFound = err instanceof HttpErrorResponse && err.status === 404;
      this.state.set({ kind: notFound ? 'unknown' : 'failed' });
    }
  }

  protected doneAt(iso: string): string {
    return clockTime(iso);
  }

  protected turnTitle(result: Extract<ScanResult, { result: 'not_your_turn' }>): string {
    const name = result.turnChildName ?? '';
    return $localize`:@@scan.theirTurn:Det er ${possessive(name)}:name: tur`;
  }

  protected turnBody(result: Extract<ScanResult, { result: 'not_your_turn' }>): string {
    const name = result.turnChildName ?? '';
    return $localize`:@@scan.theyTick:${name}:name: haker den av når oppgaven er gjort.`;
  }

  protected youNext(result: Extract<ScanResult, { result: 'not_your_turn' }>): string {
    const name = result.turnChildName ?? '';
    return $localize`:@@scan.youNext:Du er nestemann etter ${name}:name:.`;
  }

  protected subtitle(result: { points: number }): string {
    return $localize`:@@scan.subtitle:Etter tur · ${result.points}:points: poeng`;
  }

  /** «Angre»: the same undo as after the tick in the app; the turn comes back */
  protected async onUndo(): Promise<void> {
    const state = this.state();
    if (state.kind !== 'done' || this.undoBusy()) return;
    this.undoBusy.set(true);
    this.undoError.set(null);
    try {
      await this.taskService.uncompleteTask(state.result.assignmentId);
      await this.goToMyTasks();
    } catch (err) {
      this.undoError.set(
        err instanceof HttpErrorResponse && err.status === 409
          ? $localize`:@@childDashboard.undoTooLate:Det er for sent å angre denne nå.`
          : $localize`:@@childDashboard.undoFailed:Det gikk ikke å angre. Prøv igjen.`,
      );
    } finally {
      this.undoBusy.set(false);
    }
  }

  protected async goToMyTasks(): Promise<void> {
    await this.router.navigate([
      this.authService.getUserRole() === 'child' ? '/my-tasks' : '/tasks',
    ]);
  }

  private refreshRewards(): void {
    firstValueFrom(this.rewardService.loadChildRewards()).catch((err) =>
      console.error('Failed to load points balance:', err),
    );
  }
}
