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
import { TurnService, nextInTurn, turnChild } from '../../services/turn.service';
import { SingleTaskService } from '../../services/single-task.service';
import { AvailableTasksSectionComponent } from '../../components/available-tasks-section/available-tasks-section';
import { StreakCounter } from '../../components/streak-counter/streak-counter';
import { ProgressSummary } from '../../components/progress-summary/progress-summary';
import { LoadingRows } from '../../components/poeng/loading-rows/loading-rows';
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
import {
  capitalize,
  clockTime,
  dayWord,
  deadlineWord,
  doneWhen,
  isoDay,
  longDate,
} from '../../utils/poeng-format';
import { summarizeSubtasks } from '@st44/types';
import { hasSubtasks, leftLine, waitingLine } from '../../utils/subtask-lines';
import {
  SubtaskChoreModal,
  type SubtaskChore,
} from '../../components/modals/subtask-chore-modal/subtask-chore-modal';
import type { ChildAnalytics, TaskTurn } from '@st44/types';
import { isDesktopSignal } from '../../utils/desktop-query';

/** What the tick moment shows for the chore just ticked */
interface TickState {
  assignmentId: string;
  title: string;
  doneAt: string;
  points: number;
  /** «Etter tur» (ST-2075): the child the turn went to */
  turnTo?: string | null;
}

/**
 * Child's "Mine oppgaver" (Poeng screen 3, ST-777)
 *
 * The child's points total is the hero, then the yellow meter towards the next
 * reward, then yesterday's left-over chore (Forfalt) and today's chores, each
 * with its own yellow «Ferdig». Ticking one opens the full-yellow tick moment
 * with an undo for 5 minutes.
 */
@Component({
  selector: 'app-child-dashboard',
  imports: [
    PageComponent,
    LoadingRows,
    ChoreRow,
    GroupLabel,
    PointsMeter,
    TickMoment,
    AvailableTasksSectionComponent,
    StreakCounter,
    ProgressSummary,
    DailyPointsChart,
    NotificationSettings,
    SubtaskChoreModal,
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
  private turnService = inject(TurnService);

  // Local state
  analytics = signal<ChildAnalytics | null>(null);
  errorMessage = signal('');
  completingTasks = signal<Set<string>>(new Set());
  /** Yesterday's chores that were never ticked */
  overdueTasks = signal<ChildTask[]>([]);
  tick = signal<TickState | null>(null);
  /** The chore with sub-tasks whose popup is open (ST-2074) */
  openedChore = signal<SubtaskChore | null>(null);
  protected readonly hasSubtasks = hasSubtasks;
  undoBusy = signal(false);
  undoError = signal<string | null>(null);

  // Use TaskService signals directly for reactive updates
  isLoading = this.taskService.myTasksLoading;
  childName = this.taskService.myTasksChildName;
  tasks = this.taskService.myTasks;
  balance = this.rewardService.pointsBalance;

  /** The first rewards answer, which the meter needs; later refreshes keep the band as it is */
  private rewardsLoading = signal(true);
  /** The band (title, hero, meter) waits for both the tasks and the rewards (ST-1839) */
  bandLoading = computed(() => this.isLoading() || this.rewardsLoading());

  protected readonly today = longDate();

  /** 1024 px and wider: desktop A, done chores move to their own column */
  protected readonly desktop = isDesktopSignal();

  /** «Etter tur» chores (ST-2075) and which child is signed in */
  turns = signal<TaskTurn[]>([]);
  myChildId = signal<string | null>(null);
  /** «Din tur»: the child's own turns, a normal row with the normal tick */
  myTurns = computed(() =>
    this.turns().filter((t) => t.assignmentId && t.turnChildId === this.myChildId()),
  );
  /** «Etter tur»: chores the child is in the order of, someone else's turn; no tick */
  otherTurns = computed(() =>
    this.turns().filter(
      (t) =>
        t.turnChildId !== this.myChildId() && t.order.some((c) => c.childId === this.myChildId()),
    ),
  );

  hasTasks = computed(
    () =>
      this.tasks().length > 0 ||
      this.overdueTasks().length > 0 ||
      this.myTurns().length > 0 ||
      this.otherTurns().length > 0,
  );
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
    // A chore sent to a parent (ST-2074) is not next: there is nothing left to do on it
    const next = [...this.overdueTasks(), ...this.pendingTasks()].find(
      (t) => t.id !== current && !t.submittedAt,
    );
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
        firstValueFrom(this.taskService.getMyTasks(undefined, isoDay(), undefined, true)),
        this.loadOverdue(),
        this.loadTurns(),
        firstValueFrom(this.rewardService.loadChildRewards())
          .catch((err) => console.error('Failed to load points balance:', err))
          .finally(() => this.rewardsLoading.set(false)),
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

  /** «Etter tur» chores; a failure here only hides the groups */
  private async loadTurns(): Promise<void> {
    try {
      const { turns, myChildId } = await this.turnService.myTurns();
      this.turns.set(turns);
      this.myChildId.set(myChildId);
    } catch (err) {
      console.error('Failed to load turns:', err);
      this.turns.set([]);
    }
  }

  /** The tick on «Din tur»: the same as a scan, the turn moves on (ST-2075) */
  async onTurnDone(turn: TaskTurn): Promise<void> {
    const id = turn.assignmentId;
    if (!id) return;
    this.completingTasks.update((set) => new Set(set).add(id));
    try {
      const result = await this.taskService.completeTask(id);
      this.undoError.set(null);
      this.tick.set({
        assignmentId: id,
        title: turn.name,
        doneAt: clockTime(result?.completion?.completedAt ?? new Date()),
        points: result?.completion?.pointsEarned ?? turn.points,
        turnTo: result?.turn?.nextChildName ?? nextInTurn(turn)?.name ?? null,
      });
      this.refreshBalance();
      await this.loadTurns();
    } catch (error) {
      console.error('Failed to complete turn:', error);
      this.errorMessage.set(
        $localize`:@@childDashboard.errMarkDone:Kunne ikke merke oppgaven som ferdig. Prøv igjen.`,
      );
    } finally {
      this.completingTasks.update((set) => {
        const newSet = new Set(set);
        newSet.delete(id);
        return newSet;
      });
    }
  }

  /** «neste: Jonas · 5 poeng» */
  myTurnMeta(turn: TaskTurn): string {
    const next = nextInTurn(turn)?.name ?? '';
    return $localize`:@@childDashboard.myTurnMeta:neste: ${next}:next: · ${turn.points}:points: poeng`;
  }

  /** The name before «har turen» */
  turnHolder(turn: TaskTurn): string {
    return turnChild(turn)?.name ?? '';
  }

  /** «har turen · du er nestemann», or «har turen · neste: Emma» */
  otherTurnMeta(turn: TaskTurn): string {
    const next = nextInTurn(turn);
    return next?.childId === this.myChildId()
      ? $localize`:@@childDashboard.turnYouNext:har turen · du er nestemann`
      : $localize`:@@childDashboard.turnNext:har turen · neste: ${next?.name ?? ''}:next:`;
  }

  turnPoints(turn: TaskTurn): string {
    return $localize`:@@childDashboard.turnPoints:${turn.points}:points: p`;
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
        points:
          result?.completion?.pointsEarned ??
          (hasSubtasks(task) ? summarizeSubtasks(task.subtasks!).earned : task.points),
      });
      this.refreshBalance();
    } catch (error) {
      console.error('Failed to complete task:', error);
      this.errorMessage.set(
        $localize`:@@childDashboard.errMarkDone:Kunne ikke merke oppgaven som ferdig. Prøv igjen.`,
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
      // An undone chore from yesterday goes back under Forfalt; an undone turn comes back
      await Promise.all([this.loadOverdue(), this.loadTurns()]);
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

  /** "I dag – 10 poeng"; a weekly chore "Frist søndag – 5 poeng", on the day "Frist i dag" */
  openMeta(task: MyTaskAssignment): string {
    if (task.ruleType === 'weekly_rotation') {
      return $localize`:@@childDashboard.deadlineMeta:Frist ${deadlineWord(task.date)}:day: – ${task.points}:points: poeng`;
    }
    return $localize`:@@childDashboard.openMeta:${capitalize(dayWord(task.date))}:day: – ${task.points}:points: poeng`;
  }

  /** "Gjort 15.30 – 10 poeng" */
  doneMeta(task: MyTaskAssignment): string {
    const at = task.completedAt ? ` ${doneWhen(task.completedAt)}` : '';
    return $localize`:@@childDashboard.doneMeta:Gjort${at}:at: – ${task.points}:points: poeng`;
  }

  /** The count line under a chore with sub-tasks: what is left, or that it waits for a parent */
  subtaskNote(task: MyTaskAssignment | ChildTask): { text: string; tone: 'plain' } | null {
    const subtasks = task.subtasks ?? [];
    if (subtasks.length === 0) return null;
    return { text: task.submittedAt ? waitingLine(subtasks) : leftLine(subtasks), tone: 'plain' };
  }

  /** Points a done chore gave: with sub-tasks, the done ones only */
  earned(task: MyTaskAssignment): number {
    return hasSubtasks(task) ? summarizeSubtasks(task.subtasks!).earned : task.points;
  }

  openLabel(task: { taskName: string }): string {
    return $localize`:@@childDashboard.openAria:Åpne ${task.taskName}:title:`;
  }

  openChore(task: MyTaskAssignment | ChildTask): void {
    this.openedChore.set({ id: task.id, taskName: task.taskName, subtasks: task.subtasks ?? [] });
  }

  /** «Ferdig» with every sub-task ticked: the usual done tap and tick moment */
  async onFinishChore(chore: SubtaskChore): Promise<void> {
    this.openedChore.set(null);
    const task = [...this.overdueTasks(), ...this.tasks()].find((t) => t.id === chore.id);
    if (task) await this.onMarkDone({ ...task, subtasks: chore.subtasks });
  }

  /** Sent to a parent: the row waits, with no button */
  onSubmitted(chore: SubtaskChore): void {
    this.openedChore.set(null);
    const submittedAt = new Date().toISOString();
    this.overdueTasks.update((list) =>
      list.map((t) => (t.id === chore.id ? { ...t, subtasks: chore.subtasks, submittedAt } : t)),
    );
  }

  hakAvLabel(task: { taskName: string }): string {
    return $localize`:@@childDashboard.hakAvAria:Merk som ferdig: ${task.taskName}:title:`;
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
