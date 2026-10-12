import '@angular/localize/init';
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  TaskFormModal,
  type TaskFormData,
} from '../../components/modals/task-form-modal/task-form-modal';
import { FailedTasksSectionComponent } from '../../components/failed-tasks-section/failed-tasks-section';
import { PageComponent } from '../../components/page/page';
import { ChoreRow } from '../../components/poeng/chore-row/chore-row';
import { GroupLabel } from '../../components/poeng/group-label/group-label';
import { ChildPointsCard } from '../../components/poeng/child-points-card/child-points-card';
import type { ChoreState } from '../../components/poeng/chore-meter/chore-meter';
import { TaskService } from '../../services/task.service';
import { ChildrenService } from '../../services/children.service';
import { AuthService } from '../../services/auth.service';
import { HouseholdService } from '../../services/household.service';
import { HouseholdStore } from '../../stores/household.store';
import { HouseholdDayService } from '../../services/household-day.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { HttpErrorResponse } from '@angular/common/http';
import { isDesktopSignal } from '../../utils/desktop-query';
import { capitalize, clockTime, dayWord, isoDay, longDate } from '../../utils/poeng-format';
import type { Task, Assignment, Child, HouseholdMemberResponse } from '@st44/types';

/** Child cards beside the title from 1024 px (desktop A); more go on one "+N barn til" tile */
export const DESKTOP_MAX_CHILD_CARDS = 4;

/** One child card on the family home */
interface ChildSummary {
  id: string;
  name: string;
  points: number;
  chores: ChoreState[];
}

/**
 * Child cards per row, so the cards always fill the row (ST-864):
 * 1, 2 or 3 children in one row, 4 as 2 + 2, 5 or more in rows of 3.
 * A shorter last row stretches its cards (see `.kids` in home.css).
 */
export function childCardColumns(count: number): number {
  if (count === 4) return 2;
  return Math.max(1, Math.min(count, 3));
}

/**
 * "Hjemme" — the family's home (Poeng screen 1, ST-777)
 *
 * Each child's points across the top, then what is overdue (with «Minn på»),
 * then what is left today. Navigation is handled by the parent MainLayout.
 */
@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    PageComponent,
    ChoreRow,
    GroupLabel,
    ChildPointsCard,
    TaskFormModal,
    FailedTasksSectionComponent,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly childrenService = inject(ChildrenService);
  private readonly authService = inject(AuthService);
  private readonly householdService = inject(HouseholdService);
  private readonly householdStore = inject(HouseholdStore);
  private readonly householdDay = inject(HouseholdDayService);
  private readonly push = inject(PushNotificationService);

  // State signals
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Today's open chores ("Igjen i dag") */
  protected readonly todayTasks = signal<Assignment[]>([]);
  /** Today's chores already done */
  protected readonly doneToday = signal<Assignment[]>([]);
  /** Open chores from earlier days ("Forfalt") */
  protected readonly overdueTasks = signal<Assignment[]>([]);
  protected readonly upcomingTasks = signal<Assignment[]>([]);
  protected readonly members = signal<HouseholdMemberResponse[]>([]);
  protected readonly children = signal<Child[]>([]);
  protected readonly householdId = signal<string | null>(null);
  protected readonly completingId = signal<string | null>(null);

  // Modal state
  protected readonly createTaskOpen = signal(false);
  protected readonly editTaskOpen = signal(false);
  protected readonly selectedTask = signal<Task | null>(null);

  // «Minn på» (ST-686): parents push a reminder for one open chore
  protected readonly canRemind = computed(() => !this.authService.hasRole('child'));
  protected readonly remindingId = signal<string | null>(null);
  protected readonly remindMessage = signal<string | null>(null);

  protected readonly hasTodayTasks = computed(() => this.todayTasks().length > 0);
  protected readonly hasUpcomingTasks = computed(() => this.upcomingTasks().length > 0);

  /** "tirsdag 6. oktober – 3 av 7 gjort" */
  protected readonly subtitle = computed(() => {
    const done = this.doneToday().length;
    const total = done + this.todayTasks().length + this.overdueTasks().length;
    const date = longDate();
    return total > 0
      ? $localize`:@@home.subtitle:${date}:date: – ${done}:done: av ${total}:total: gjort`
      : date;
  });

  /** "4 oppgaver – 40 poeng" */
  protected readonly leftToday = computed(() => {
    const open = this.todayTasks();
    const points = open.reduce((sum, a) => sum + (a.points ?? 0), 0);
    return $localize`:@@home.leftToday:${open.length}:count: oppgaver – ${points}:points: poeng`;
  });

  /** One card per child: points total and a chore meter (done, open, late) */
  protected readonly childSummaries = computed<ChildSummary[]>(() => {
    const all = [
      ...this.doneToday().map((a) => [a, 'done'] as const),
      ...this.todayTasks().map((a) => [a, 'open'] as const),
      ...this.overdueTasks().map((a) => [a, 'late'] as const),
    ];
    return (
      this.members()
        .filter((m) => m.role === 'child')
        // One card per name, even if a child shows up both as a login and as a profile
        .filter((m, i, list) => list.findIndex((x) => x.displayName === m.displayName) === i)
        .map((m) => ({
          id: m.userId,
          name: m.displayName || '',
          points: m.points,
          chores: all
            // A child with a login is listed under the user id, so the name is the safe match
            .filter(([a]) => a.childId === m.userId || a.childName === m.displayName)
            .map(([, state]) => state),
        }))
    );
  });

  protected readonly kidColumns = computed(() => childCardColumns(this.childSummaries().length));

  /** 1024 px and wider: desktop A */
  protected readonly desktop = isDesktopSignal();

  /** Every child on the phone; at most four beside the title on desktop */
  protected readonly shownChildren = computed(() =>
    this.desktop()
      ? this.childSummaries().slice(0, DESKTOP_MAX_CHILD_CARDS)
      : this.childSummaries(),
  );

  /** Desktop A shows at most four child cards; the rest are counted on a "+N barn til" tile */
  protected readonly moreChildren = computed(() =>
    Math.max(0, this.childSummaries().length - DESKTOP_MAX_CHILD_CARDS),
  );

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  /**
   * Load all data for the home screen
   */
  protected async loadData(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);

      const user = this.authService.currentUser();
      if (!user) {
        this.error.set('User not authenticated');
        return;
      }

      // Get user's households
      const households = await this.householdService.listHouseholds();
      if (households.length === 0) {
        this.error.set('No household found');
        return;
      }

      // Get active household from store (respects user's selection from switcher)
      let activeHouseholdId = this.householdStore.activeHouseholdId();

      // If no active household, auto-activate the first one
      if (!activeHouseholdId) {
        await this.householdStore.autoActivateHousehold();
        activeHouseholdId = this.householdStore.activeHouseholdId();
      }

      // Find the active household in the list (fallback to first if not found)
      const household = households.find((h) => h.id === activeHouseholdId) || households[0];
      this.householdId.set(household.id);

      // Children (for the edit modal), the day, the points and tomorrow, in parallel
      const [childrenData] = await Promise.all([
        this.childrenService.listChildren(household.id),
        this.loadDay(household.id),
        this.loadMembers(household.id),
        this.loadUpcomingTasks(household.id),
      ]);

      this.children.set(childrenData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      this.error.set('Failed to load dashboard. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  /** Today's chores and what is left over from the week */
  private async loadDay(householdId: string): Promise<void> {
    const day = await this.householdDay.load(householdId);
    this.todayTasks.set(day.today.filter((a) => a.status === 'pending'));
    this.doneToday.set(day.today.filter((a) => a.status === 'completed'));
    this.overdueTasks.set(day.overdue);
  }

  /** Each child's points total; the cards stay empty if this fails */
  private async loadMembers(householdId: string): Promise<void> {
    try {
      this.members.set(await this.householdService.getHouseholdMembers(householdId));
    } catch (err) {
      console.error('Failed to load points:', err);
    }
  }

  /**
   * Load tomorrow's open chores ("Kommende")
   */
  private async loadUpcomingTasks(householdId: string): Promise<void> {
    try {
      const assignments = await firstValueFrom(
        this.taskService.getHouseholdAssignments(householdId, {
          date: isoDay(1),
          days: 1,
          status: 'pending',
        }),
      );
      this.upcomingTasks.set(assignments.slice(0, 3));
    } catch (err) {
      console.error('Failed to load upcoming tasks:', err);
    }
  }

  /** "Mathea – i dag" / "Jonas – forfalt i går" */
  protected rowMeta(a: Assignment, overdue = false): string {
    const who = a.childName || $localize`:@@home.anyone:Alle`;
    return overdue
      ? $localize`:@@home.overdueMeta:${who}:who: – forfalt ${dayWord(a.date)}:day:`
      : $localize`:@@home.openMeta:${who}:who: – ${dayWord(a.date)}:day:`;
  }

  /** "Emma – gjort 16.10" for "Gjort i dag" */
  protected doneMeta(a: Assignment): string {
    const who = a.childName || $localize`:@@home.anyone:Alle`;
    const at = a.completedAt ? ` ${clockTime(a.completedAt)}` : '';
    return $localize`:@@home.doneMeta:${who}:who: – gjort${at}:at:`;
  }

  /** "Mathea – i morgen" for "Kommende" */
  protected upcomingMeta(a: Assignment): string {
    const who = a.childName || $localize`:@@home.anyone:Alle`;
    return $localize`:@@home.upcomingMeta:${who}:who: – i morgen`;
  }

  protected pointsText(a: Assignment): string {
    return a.points != null ? $localize`:@@home.points:${a.points}:points: p` : '';
  }

  protected remindLabel(a: Assignment): string {
    return $localize`:@@home.remindAria:Minn ${a.childName ?? ''}:name: på ${a.title}:title:`;
  }

  /**
   * Handle task completion (a parent may still tick a chore off here)
   */
  protected async onCompleteTask(taskId: string): Promise<void> {
    this.completingId.set(taskId);
    try {
      await this.taskService.completeTask(taskId);

      const done =
        this.todayTasks().find((t) => t.id === taskId) ??
        this.overdueTasks().find((t) => t.id === taskId);
      this.todayTasks.update((tasks) => tasks.filter((t) => t.id !== taskId));
      this.overdueTasks.update((tasks) => tasks.filter((t) => t.id !== taskId));
      if (done && done.date === isoDay()) {
        this.doneToday.update((tasks) => [...tasks, { ...done, status: 'completed' }]);
      }

      // The child's points total moved
      const household = this.householdId();
      if (household) void this.loadMembers(household);
    } catch (err) {
      console.error('Failed to complete task:', err);
      this.error.set('Failed to complete task. Please try again.');
    } finally {
      this.completingId.set(null);
    }
  }

  /**
   * «Minn på»: send the reminder for one open chore to the child's phone now
   */
  protected async onRemind(assignmentId: string): Promise<void> {
    const assignment = [...this.overdueTasks(), ...this.todayTasks()].find(
      (t) => t.id === assignmentId,
    );
    const name = assignment?.childName || $localize`:@@home.remindFallbackName:Barnet`;
    this.remindingId.set(assignmentId);
    this.remindMessage.set(null);
    try {
      const sent = await this.push.remind(assignmentId);
      this.remindMessage.set(
        sent > 0
          ? $localize`:@@home.remindSent:Påminnelse sendt til ${name}:name:.`
          : $localize`:@@home.remindNoPhone:${name}:name: har ikke slått på varsler på telefonen ennå.`,
      );
    } catch (err) {
      this.remindMessage.set(remindError(err));
    } finally {
      this.remindingId.set(null);
    }
  }

  /**
   * Handle task edit - open edit modal with task data
   *
   * The rows on this page are assignments, so the row hands us the
   * assignment id; the task template lives under the assignment's taskId
   * (ST-691: asking for the assignment id gave a 404).
   */
  protected onEditTask(assignmentId: string): void {
    const householdIdValue = this.householdId();
    if (!householdIdValue) return;

    const assignment = [
      ...this.overdueTasks(),
      ...this.todayTasks(),
      ...this.doneToday(),
      ...this.upcomingTasks(),
    ].find((a) => a.id === assignmentId);
    if (!assignment) return;

    this.taskService.getTask(householdIdValue, assignment.taskId).subscribe({
      next: (task) => {
        this.selectedTask.set(task);
        this.editTaskOpen.set(true);
      },
      error: (err) => {
        console.error('Failed to load task:', err);
        this.error.set('Failed to load task details.');
      },
    });
  }

  /**
   * Handle task update from edit modal
   */
  protected onTaskUpdated(data: TaskFormData): void {
    const task = this.selectedTask();
    const householdIdValue = this.householdId();
    if (!task || !householdIdValue) return;

    this.taskService.updateTask(householdIdValue, task.id, data).subscribe({
      next: () => {
        this.editTaskOpen.set(false);
        this.selectedTask.set(null);
        // Reload data to reflect changes
        this.loadData();
      },
      error: (err) => {
        console.error('Failed to update task:', err);
        this.error.set('Failed to update task. Please try again.');
      },
    });
  }

  /**
   * Handle task deletion from edit modal
   */
  protected onTaskDeleted(): void {
    const task = this.selectedTask();
    const householdIdValue = this.householdId();
    if (!task || !householdIdValue) return;

    this.taskService.deleteTask(householdIdValue, task.id).subscribe({
      next: () => {
        this.editTaskOpen.set(false);
        this.selectedTask.set(null);
        // Reload data to reflect changes
        this.loadData();
      },
      error: (err) => {
        console.error('Failed to delete task:', err);
        this.error.set('Failed to delete task. Please try again.');
      },
    });
  }

  /** "+ Ny oppgave" (desktop A, under the left column) */
  protected openCreateTask(): void {
    this.createTaskOpen.set(true);
  }

  protected closeCreateTask(): void {
    this.createTaskOpen.set(false);
  }

  /** Create the chore, then reload so it shows up in its column */
  protected onTaskCreated(data: TaskFormData): void {
    const householdIdValue = this.householdId();
    if (!householdIdValue) return;

    this.taskService
      .createTask(householdIdValue, {
        name: data.name,
        description: data.description,
        points: data.points,
        ruleType: data.ruleType,
        ruleConfig: data.ruleConfig,
      })
      .subscribe({
        next: () => {
          this.createTaskOpen.set(false);
          this.loadData();
        },
        error: (err) => {
          console.error('Failed to create task:', err);
          this.error.set('Failed to create task. Please try again.');
        },
      });
  }

  /**
   * Close edit task modal
   */
  protected closeEditTask(): void {
    this.editTaskOpen.set(false);
    this.selectedTask.set(null);
  }

  protected readonly capitalize = capitalize;
}

/** Why «Minn på» did not go out, in words a parent understands */
function remindError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const conflict = (err.error as { details?: { conflictField?: string } } | null)?.details
      ?.conflictField;
    if (conflict === 'status') {
      return $localize`:@@home.remindNotOpen:Oppgaven er ikke åpen lenger.`;
    }
    if (err.status === 400) {
      return $localize`:@@home.remindServerOff:Påminnelser er ikke slått på i Diddit ennå.`;
    }
  }
  return $localize`:@@home.remindFailed:Kunne ikke sende påminnelsen. Prøv igjen.`;
}
