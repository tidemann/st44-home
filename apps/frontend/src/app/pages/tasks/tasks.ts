import '@angular/localize/init';
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TaskService } from '../../services/task.service';
import { ChildrenService } from '../../services/children.service';
import { HouseholdDayService } from '../../services/household-day.service';
import { StorageService } from '../../services/storage.service';
import { STORAGE_KEYS } from '../../services/storage-keys';
import {
  TaskFormModal,
  type TaskFormData,
} from '../../components/modals/task-form-modal/task-form-modal';
import { ReassignTaskModal } from '../../components/modals/reassign-task-modal/reassign-task-modal';
import { PageComponent } from '../../components/page/page';
import { ChoreRow } from '../../components/poeng/chore-row/chore-row';
import { GroupLabel } from '../../components/poeng/group-label/group-label';
import { capitalize, clockTime, dayWord } from '../../utils/poeng-format';
import type { Task, Child, Assignment } from '@st44/types';

/**
 * "Oppgaver" — the parent's task list (Poeng screen 2, ST-777)
 *
 * Child chips, then the day in three groups: «Forfalt», «I dag», «Gjort i dag».
 * Below the picture, «Alle oppgaver» keeps every task template reachable for
 * editing, also the ones not due today. «+ Ny oppgave» is pinned above the nav.
 *
 * With one child selected, open rows offer «Bytt» (reassign), as the old
 * "By person" view did. Navigation is handled by the parent MainLayout.
 */
@Component({
  selector: 'app-tasks',
  imports: [TaskFormModal, ReassignTaskModal, PageComponent, ChoreRow, GroupLabel],
  templateUrl: './tasks.html',
  styleUrl: './tasks.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tasks implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly childrenService = inject(ChildrenService);
  private readonly householdDay = inject(HouseholdDayService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Every chore for today, open and done */
  private readonly today = signal<Assignment[]>([]);
  /** Open chores from earlier days */
  private readonly overdue = signal<Assignment[]>([]);
  protected readonly children = signal<Child[]>([]);
  /** Active task templates («Alle oppgaver») */
  protected readonly templates = computed(() => this.taskService.tasks().filter((t) => t.active));

  /** The selected child chip; null is «Alle» */
  protected readonly selectedChildId = signal<string | null>(null);
  protected readonly completingId = signal<string | null>(null);

  // Modals
  protected readonly createOpen = signal(false);
  protected readonly editOpen = signal(false);
  protected readonly editingTask = signal<Task | null>(null);
  protected readonly reassignOpen = signal(false);
  protected readonly reassigning = signal<Assignment | null>(null);

  protected readonly householdId = computed(
    () => this.storage.getString(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID) || '',
  );

  private readonly selectedChild = computed(
    () => this.children().find((c) => c.id === this.selectedChildId()) ?? null,
  );

  /** Keep only the selected child's chores (all of them under «Alle») */
  private readonly forChild = (list: Assignment[]): Assignment[] => {
    const child = this.selectedChild();
    if (!child) return list;
    // A child with a login can be listed under the user id, so the name is the safe match
    return list.filter((a) => a.childId === child.id || a.childName === child.name);
  };

  protected readonly overdueRows = computed(() => this.forChild(this.overdue()));
  protected readonly openRows = computed(() =>
    this.forChild(this.today()).filter((a) => a.status === 'pending'),
  );
  protected readonly doneRows = computed(() =>
    this.forChild(this.today()).filter((a) => a.status === 'completed'),
  );

  /** "7 i dag – 1 forfalt" */
  protected readonly subtitle = computed(() => {
    const late = this.overdueRows().length;
    const total = late + this.openRows().length + this.doneRows().length;
    return late > 0
      ? $localize`:@@tasks.subtitleLate:${total}:total: i dag – ${late}:late: forfalt`
      : $localize`:@@tasks.subtitle:${total}:total: i dag`;
  });

  protected readonly hasDay = computed(
    () => this.overdueRows().length + this.openRows().length + this.doneRows().length > 0,
  );

  /** With one child selected, open rows offer «Bytt» */
  protected readonly canReassign = computed(() => this.selectedChildId() !== null);

  ngOnInit(): void {
    const child = this.route.snapshot.queryParams['child'] as string | undefined;
    if (child) this.selectedChildId.set(child);
    void this.loadTasks();
  }

  /** The day, the children for the chips and every template, in parallel */
  protected async loadTasks(): Promise<void> {
    const household = this.householdId();
    if (!household) {
      this.error.set($localize`:@@tasks.noHousehold:Ingen husstand valgt`);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    try {
      const [day, children] = await Promise.all([
        this.householdDay.load(household),
        this.childrenService.listChildren(household),
        firstValueFrom(this.taskService.getTasks(household, true)),
      ]);
      this.today.set(day.today);
      this.overdue.set(day.overdue);
      this.children.set(children);
    } catch (err) {
      console.error('Load tasks error:', err);
      this.error.set($localize`:@@tasks.loadFailed:Kunne ikke laste oppgavene`);
    } finally {
      this.loading.set(false);
    }
  }

  /** Chip tap: «Alle» (null) or one child; kept in the URL so it survives a reload */
  protected onSelectChild(childId: string | null): void {
    if (this.selectedChildId() === childId) return;
    this.selectedChildId.set(childId);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { child: childId, filter: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** "Jonas – Forfalt i går" */
  protected overdueMeta(a: Assignment): string {
    return $localize`:@@tasks.overdueMeta:${this.who(a)}:who: – Forfalt ${dayWord(a.date)}:day:`;
  }

  /** "Mathea – I dag" */
  protected openMeta(a: Assignment): string {
    return $localize`:@@tasks.openMeta:${this.who(a)}:who: – ${capitalize(dayWord(a.date))}:day:`;
  }

  /** "Emma – Gjort 16.10" */
  protected doneMeta(a: Assignment): string {
    const at = a.completedAt ? ` ${clockTime(a.completedAt)}` : '';
    return $localize`:@@tasks.doneMeta:${this.who(a)}:who: – Gjort${at}:at:`;
  }

  /** "Gjentas" / "Én gang" for a template row */
  protected templateMeta(t: Task): string {
    return t.ruleType === 'single'
      ? $localize`:@@tasks.ruleOnce:Én gang`
      : $localize`:@@tasks.ruleRepeat:Gjentas`;
  }

  protected points(value: number | undefined): string {
    return value != null ? $localize`:@@tasks.points:${value}:points: p` : '';
  }

  private who(a: Assignment): string {
    return a.childName || $localize`:@@tasks.anyone:Alle`;
  }

  /** A parent may tick a chore off for the child */
  protected async onComplete(a: Assignment): Promise<void> {
    this.completingId.set(a.id);
    try {
      await this.taskService.completeTask(a.id);
      const done = { ...a, status: 'completed' as const, completedAt: new Date().toISOString() };
      this.overdue.update((list) => list.filter((x) => x.id !== a.id));
      this.today.update((list) =>
        list.some((x) => x.id === a.id) ? list.map((x) => (x.id === a.id ? done : x)) : list,
      );
    } catch (err) {
      console.error('Complete task error:', err);
      this.error.set($localize`:@@tasks.completeFailed:Kunne ikke hake av oppgaven`);
    } finally {
      this.completingId.set(null);
    }
  }

  /** Row tap: edit the task template behind the chore */
  protected onEdit(taskId: string): void {
    const task = this.taskService.tasks().find((t) => t.id === taskId);
    if (task) {
      this.editingTask.set(task);
      this.editOpen.set(true);
      return;
    }
    // Not in the active list (e.g. switched off since): fetch it
    this.taskService.getTask(this.householdId(), taskId).subscribe({
      next: (t) => {
        this.editingTask.set(t);
        this.editOpen.set(true);
      },
      error: (err) => console.error('Load task error:', err),
    });
  }

  protected onTaskUpdate(data: TaskFormData): void {
    const task = this.editingTask();
    if (!task) return;
    this.taskService.updateTask(this.householdId(), task.id, data).subscribe({
      next: () => {
        this.closeEdit();
        void this.loadTasks();
      },
      error: (err) => {
        console.error('Update task error:', err);
        this.error.set($localize`:@@tasks.updateFailed:Kunne ikke lagre oppgaven`);
      },
    });
  }

  protected onTaskDelete(): void {
    const task = this.editingTask();
    if (!task) return;
    this.taskService.deleteTask(this.householdId(), task.id).subscribe({
      next: () => {
        this.closeEdit();
        void this.loadTasks();
      },
      error: (err) => {
        console.error('Delete task error:', err);
        this.error.set($localize`:@@tasks.deleteFailed:Kunne ikke slette oppgaven`);
      },
    });
  }

  protected closeEdit(): void {
    this.editOpen.set(false);
    this.editingTask.set(null);
  }

  /** «+ Ny oppgave» */
  protected onCreate(data: TaskFormData): void {
    this.taskService
      .createTask(this.householdId(), {
        name: data.name,
        description: data.description,
        points: data.points,
        ruleType: data.ruleType,
        ruleConfig: data.ruleConfig,
      })
      .subscribe({
        next: () => {
          this.createOpen.set(false);
          void this.loadTasks();
        },
        error: (err) => console.error('Create task error:', err),
      });
  }

  /** «Bytt»: give an open chore to another child */
  protected onReassign(a: Assignment): void {
    this.reassigning.set(a);
    this.reassignOpen.set(true);
  }

  protected onReassignConfirm(newChildId: string): void {
    const a = this.reassigning();
    if (!a) return;
    this.taskService.reassignTask(a.id, newChildId).subscribe({
      next: () => {
        this.closeReassign();
        void this.loadTasks();
      },
      error: (err) => {
        console.error('Reassign task error:', err);
        this.error.set($localize`:@@tasks.reassignFailed:Kunne ikke bytte hvem som har oppgaven`);
      },
    });
  }

  protected closeReassign(): void {
    this.reassignOpen.set(false);
    this.reassigning.set(null);
  }
}
