import '@angular/localize/init';
import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AnalyticsService } from '../../services/analytics.service';
import { TaskService, type MyTaskAssignment } from '../../services/task.service';
import { DashboardService, type ChildTask } from '../../services/dashboard.service';
import { RewardService } from '../../services/reward.service';
import { SingleTaskService } from '../../services/single-task.service';
import { AvailableTasksSectionComponent } from '../../components/available-tasks-section/available-tasks-section';
import { StreakCounter } from '../../components/streak-counter/streak-counter';
import { ProgressSummary } from '../../components/progress-summary/progress-summary';
import { DailyPointsChart } from '../../components/daily-points-chart/daily-points-chart';
import { NotificationSettings } from '../../components/notification-settings/notification-settings';
import { PageComponent } from '../../components/page/page';
import { ChoreRow } from '../../components/poeng/chore-row/chore-row';
import { GroupLabel } from '../../components/poeng/group-label/group-label';
import { PointsMeter } from '../../components/poeng/points-meter/points-meter';
import {
  TickMoment,
  type TickGoal,
  type TickNext,
} from '../../components/poeng/tick-moment/tick-moment';
import { capitalize, clockTime, dayWord, isoDay, longDate } from '../../utils/poeng-format';
import type { ChildAnalytics } from '@st44/types';

/** What the tick moment shows for the chore just ticked */
interface TickState {
  assignmentId: string;
  title: string;
  doneAt: string;
  points: number;
}

/**
 * Child's "Mine oppgaver" (Poeng screen 3, ST-777)
 *
 * The child's points total is the hero, then the yellow meter towards the next
 * reward, then yesterday's left-over chore (Forfalt) and today's chores, each
 * with its own yellow «Hak av». Ticking one opens the full-yellow tick moment
 * with an undo for 5 minutes.
 */
@Component({
  selector: 'app-child-dashboard',
  imports: [
    PageComponent,
    ChoreRow,
    GroupLabel,
    PointsMeter,
    TickMoment,
    AvailableTasksSectionComponent,
    StreakCounter,
    ProgressSummary,
    DailyPointsChart,
    NotificationSettings,
  ],
  templateUrl: './child-dashboard.html',
  styleUrl: './child-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildDashboardComponent implements OnInit {
  private router = inject(Router);
  private analyticsService = inject(AnalyticsService);
  private taskService = inject(TaskService);
  private dashboardService = inject(DashboardService);
  private rewardService = inject(RewardService);
  private singleTaskService = inject(SingleTaskService);

  // Local state
  analytics = signal<ChildAnalytics | null>(null);
  errorMessage = signal('');
  completingTasks = signal<Set<string>>(new Set());
  /** Yesterday's chores that were never ticked */
  overdueTasks = signal<ChildTask[]>([]);
  tick = signal<TickState | null>(null);
  undoBusy = signal(false);
  undoError = signal<string | null>(null);

  // Use TaskService signals directly for reactive updates
  isLoading = this.taskService.myTasksLoading;
  childName = this.taskService.myTasksChildName;
  tasks = this.taskService.myTasks;
  balance = this.rewardService.pointsBalance;

  protected readonly today = longDate();

  hasTasks = computed(() => this.tasks().length > 0 || this.overdueTasks().length > 0);
  pendingTasks = computed(() => this.tasks().filter((t) => t.status === 'pending'));
  completedTasks = computed(() => this.tasks().filter((t) => t.status === 'completed'));
  hasAvailableTasks = computed(() => this.singleTaskService.availableTasks().length > 0);

  /** The cheapest reward still out of reach: what the meter counts towards */
  goal = computed(() => {
    const balance = this.balance();
    const ahead = this.rewardService
      .childRewards()
      .filter((r) => r.available && r.pointsCost > balance)
      .sort((a, b) => a.pointsCost - b.pointsCost);
    return ahead[0] ?? null;
  });

  goalShare = computed(() => {
    const goal = this.goal();
    return goal ? this.balance() / goal.pointsCost : 0;
  });

  pointsLabel = computed(
    () => $localize`:@@childDashboard.pointsAria:${this.balance()}:points: poeng`,
  );

  /** The tick moment's meter, after this chore's points landed */
  tickGoal = computed<TickGoal | null>(() => {
    const goal = this.goal();
    return goal ? { name: goal.name, cost: goal.pointsCost, balance: this.balance() } : null;
  });

  /** The next open chore, for the inset on the tick moment */
  tickNext = computed<TickNext | null>(() => {
    const current = this.tick()?.assignmentId;
    const next = [...this.overdueTasks(), ...this.pendingTasks()].find((t) => t.id !== current);
    if (!next) return null;
    return {
      title: next.taskName,
      meta: $localize`:@@childDashboard.nextMeta:Neste – ${dayWord(next.date)}:day:`,
      points: next.points,
    };
  });

  async ngOnInit() {
    await this.loadMyTasks();
  }

  async loadMyTasks() {
    this.errorMessage.set('');

    try {
      // Today's chores via TaskService (updates signals), yesterday's left-overs,
      // the balance and rewards for the meter, and analytics, in parallel
      await Promise.all([
        firstValueFrom(this.taskService.getMyTasks(undefined, isoDay())),
        this.loadOverdue(),
        firstValueFrom(this.rewardService.loadChildRewards()).catch((err) =>
          console.error('Failed to load points balance:', err),
        ),
        this.analyticsService.getChildAnalytics('week').then((data) => this.analytics.set(data)),
      ]);
    } catch (error: unknown) {
      const httpError = error as { status?: number };

      if (httpError?.status === 401) {
        await this.router.navigate(['/child-login']);
        return;
      } else if (httpError?.status === 403) {
        this.errorMessage.set(
          $localize`:@@childDashboard.errNotChild:Denne siden er bare for barn.`,
        );
      } else if (httpError?.status === 404) {
        this.errorMessage.set(
          $localize`:@@childDashboard.errNoProfile:Vi fant ikke profilen din. Spør en voksen om hjelp.`,
        );
      } else {
        this.errorMessage.set(
          $localize`:@@childDashboard.errLoad:Vi fikk ikke hentet oppgavene dine nå. Prøv igjen!`,
        );
      }
    }
  }

  /** Yesterday's chores still open; a failure here only hides the group */
  private async loadOverdue(): Promise<void> {
    try {
      const yesterday = await this.dashboardService.getMyTasks(isoDay(-1));
      this.overdueTasks.set(yesterday.tasks.filter((t) => t.status === 'pending'));
    } catch (err) {
      console.error('Failed to load overdue tasks:', err);
      this.overdueTasks.set([]);
    }
  }

  async onMarkDone(task: MyTaskAssignment | ChildTask) {
    // Add to completing set to show loading state on the button
    this.completingTasks.update((set) => new Set(set).add(task.id));

    try {
      // Complete task - signal updates automatically via optimistic update
      const result = await this.taskService.completeTask(task.id);
      this.overdueTasks.update((list) => list.filter((t) => t.id !== task.id));
      this.undoError.set(null);
      this.tick.set({
        assignmentId: task.id,
        title: task.taskName,
        doneAt: clockTime(result?.completion?.completedAt ?? new Date()),
        points: result?.completion?.pointsEarned ?? task.points,
      });
      this.refreshBalance();
    } catch (error) {
      console.error('Failed to complete task:', error);
      this.errorMessage.set(
        $localize`:@@childDashboard.errMarkDone:Kunne ikke hake av oppgaven. Prøv igjen.`,
      );
    } finally {
      // Remove from completing set
      this.completingTasks.update((set) => {
        const newSet = new Set(set);
        newSet.delete(task.id);
        return newSet;
      });
    }
  }

  /** «Angre»: take the tick back while the server still allows it */
  async onUndo(): Promise<void> {
    const tick = this.tick();
    if (!tick || this.undoBusy()) return;

    this.undoBusy.set(true);
    this.undoError.set(null);
    try {
      await this.taskService.uncompleteTask(tick.assignmentId);
      this.tick.set(null);
      // An undone chore from yesterday goes back under Forfalt
      await this.loadOverdue();
      this.refreshBalance();
    } catch (err) {
      this.undoError.set(undoErrorText(err));
    } finally {
      this.undoBusy.set(false);
    }
  }

  onTickClosed(): void {
    if (this.undoBusy()) return;
    this.tick.set(null);
  }

  isCompleting(taskId: string): boolean {
    return this.completingTasks().has(taskId);
  }

  /** "Forfalt i går" */
  overdueMeta(task: ChildTask): string {
    return $localize`:@@childDashboard.overdueMeta:Forfalt ${dayWord(task.date)}:day:`;
  }

  /** "I dag – 10 poeng" */
  openMeta(task: MyTaskAssignment): string {
    return $localize`:@@childDashboard.openMeta:${capitalize(dayWord(task.date))}:day: – ${task.points}:points: poeng`;
  }

  /** "Gjort 15.30 – 10 poeng" */
  doneMeta(task: MyTaskAssignment): string {
    const at = task.completedAt ? ` ${clockTime(task.completedAt)}` : '';
    return $localize`:@@childDashboard.doneMeta:Gjort${at}:at: – ${task.points}:points: poeng`;
  }

  hakAvLabel(task: { taskName: string }): string {
    return $localize`:@@childDashboard.hakAvAria:Hak av ${task.taskName}:title:`;
  }

  private refreshBalance(): void {
    this.rewardService.loadChildRewards().subscribe({
      error: (err) => console.error('Failed to refresh points balance:', err),
    });
  }
}

/** Why «Angre» did not go through, in words a child understands */
function undoErrorText(err: unknown): string {
  if (err instanceof HttpErrorResponse && err.status === 409) {
    const body = err.error as { error?: string; message?: string } | null;
    const message = `${body?.error ?? ''} ${body?.message ?? ''}`;
    if (/spent|brukt/i.test(message)) {
      return $localize`:@@childDashboard.undoSpent:Poengene er alt brukt, så denne kan ikke angres.`;
    }
    return $localize`:@@childDashboard.undoTooLate:Det er for sent å angre denne nå.`;
  }
  return $localize`:@@childDashboard.undoFailed:Det gikk ikke å angre. Prøv igjen.`;
}
