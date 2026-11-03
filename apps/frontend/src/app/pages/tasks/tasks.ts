import '@angular/localize/init';
import {
  Component,
  ChangeDetectionStrategy,
  Injector,
  afterNextRender,
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
import { Modal } from '../../components/modals/modal/modal';
import { PageComponent } from '../../components/page/page';
import { ChoreRow } from '../../components/poeng/chore-row/chore-row';
import { GroupLabel } from '../../components/poeng/group-label/group-label';
import { EmptyGroup } from '../../components/poeng/empty-group/empty-group';
import { TurnPopup, type TurnPopupView } from '../../components/turn-popup/turn-popup';
import { TurnService, nextInTurn, turnChild } from '../../services/turn.service';
import { HouseholdStore } from '../../stores/household.store';
import { capitalize, clockTime, dayWord, doneWhen } from '../../utils/poeng-format';
import { hasNoChildrenLeft } from '../../utils/task-children';
import {
  summarizeSubtasks,
  type Task,
  type Child,
  type Assignment,
  type TaskTurn,
} from '@st44/types';
import { SubtaskReviewModal } from '../../components/modals/subtask-review-modal/subtask-review-modal';
import { doneLine, hasSubtasks, sentLine } from '../../utils/subtask-lines';

/** "tre oppgaver" as drawn (ST-1343); digits from 13 up */
const COUNT_WORDS = [
  '',
  'én',
  'to',
  'tre',
  'fire',
  'fem',
  'seks',
  'sju',
  'åtte',
  'ni',
  'ti',
  'elleve',
  'tolv',
];

/**
 * "Oppgaver" — the parent's task list (Poeng screen 2, ST-777)
 *
 * Child chips, then the day in three groups: «Forfalt», «I dag», «Gjort i dag».
 * Below the picture, «Alle oppgaver» keeps every task template reachable for
 * editing, also the ones not due today. «+ Ny oppgave» is pinned above the nav.
 *
 * With one child selected, open rows offer «Bytt» (reassign), as the old
 * "By person" view did. Navigation is handled by the parent MainLayout.
 *
 * Select mode (ST-1343, ST-1391): «Velg» on «Alle oppgaver», or a 500 ms touch press
 * on any row with a live template, shows the templates only, each a checkbox.
 * «Slett n» asks once, deletes in one call and leaves a receipt in the page.
 */
@Component({
  selector: 'app-tasks',
  imports: [
    TaskFormModal,
    ReassignTaskModal,
    Modal,
    PageComponent,
    ChoreRow,
    GroupLabel,
    EmptyGroup,
    TurnPopup,
    SubtaskReviewModal,
  ],
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
  private readonly injector = inject(Injector);
  private readonly turnService = inject(TurnService);
  private readonly householdStore = inject(HouseholdStore);

  protected readonly pageTitle = $localize`:@@tasks.pageTitle:Oppgaver`;

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Every chore for today, open and done */
  private readonly today = signal<Assignment[]>([]);
  /** Open chores from earlier days */
  private readonly overdue = signal<Assignment[]>([]);
  protected readonly children = signal<Child[]>([]);
  /** Active task templates («Alle oppgaver») */
  protected readonly templates = computed(() => this.taskService.tasks().filter((t) => t.active));
  /** Recurring tasks whose chosen children were all deleted: no new days until edited */
  protected readonly noChildTasks = computed(() =>
    this.templates().filter((t) => hasNoChildrenLeft(t, this.children())),
  );

  /** The selected child chip; null is «Alle» */
  protected readonly selectedChildId = signal<string | null>(null);
  protected readonly completingId = signal<string | null>(null);

  // Modals
  protected readonly createOpen = signal(false);
  protected readonly editOpen = signal(false);
  protected readonly editingTask = signal<Task | null>(null);
  protected readonly reassignOpen = signal(false);
  protected readonly reassigning = signal<Assignment | null>(null);

  // Select mode (ST-1343)
  protected readonly selecting = signal(false);
  /** Chosen template ids */
  protected readonly chosen = signal<ReadonlySet<string>>(new Set());
  protected readonly confirmOpen = signal(false);
  protected readonly deleting = signal(false);
  /** «3 oppgaver slettet», shown over «Alle oppgaver» after a delete */
  protected readonly receipt = signal<string | null>(null);
  /** Some of them did not go: what is left chosen is what failed */
  protected readonly failure = signal<{ failed: number; asked: number } | null>(null);

  protected readonly householdId = computed(
    () => this.storage.getString(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID) || '',
  );

  /** «Etter tur» chores (ST-2075): their own group, since they have no day */
  private readonly turns = signal<TaskTurn[]>([]);
  protected readonly turnRows = computed(() => {
    const child = this.selectedChildId();
    return child
      ? this.turns().filter((t) => t.order.some((c) => c.childId === child))
      : this.turns();
  });
  /** The open «Etter tur» popup: history, «Flytt turen» or «Skannekode» */
  protected readonly turnPopup = signal<TaskTurn | null>(null);
  protected readonly turnView = signal<TurnPopupView>('history');
  protected readonly householdName = computed(
    () => this.householdStore.activeHousehold()?.name ?? '',
  );

  protected turnHolder(t: TaskTurn): string {
    return turnChild(t)?.name ?? '';
  }

  /** «har turen · neste: Jonas» */
  protected turnMeta(t: TaskTurn): string {
    return $localize`:@@tasks.turnMeta:har turen · neste: ${nextInTurn(t)?.name ?? ''}:next:`;
  }

  protected openTurn(t: TaskTurn, view: TurnPopupView = 'history'): void {
    this.turnView.set(view);
    this.turnPopup.set(t);
  }

  protected onTurnChanged(t: TaskTurn): void {
    this.turns.update((list) => list.map((x) => (x.taskId === t.taskId ? t : x)));
    this.openTurn(t);
  }

  /** «Vis koden» in the edit form */
  protected onShowCode(): void {
    const id = this.editingTask()?.id;
    const turn = this.turns().find((t) => t.taskId === id);
    this.closeEdit();
    if (turn) this.openTurn(turn, 'code');
  }

  private async loadTurns(household: string): Promise<void> {
    this.turns.set(await this.turnService.turns(household).catch(() => []));
  }

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

  /** Sent by the child with sub-tasks not all done (ST-2074): waiting for a parent */
  private readonly sent = (a: Assignment): boolean => a.status === 'pending' && !!a.submittedAt;

  protected readonly overdueRows = computed(() =>
    this.forChild(this.overdue()).filter((a) => !this.sent(a)),
  );
  /** «Venter på godkjenning», under «Forfalt» (ST-2042 sheet 5) */
  protected readonly waitingRows = computed(() =>
    this.forChild([...this.overdue(), ...this.today()]).filter(this.sent),
  );
  protected readonly openRows = computed(() =>
    this.forChild(this.today()).filter((a) => a.status === 'pending' && !this.sent(a)),
  );
  protected readonly doneRows = computed(() =>
    this.forChild(this.today()).filter((a) => a.status === 'completed'),
  );

  /** "7 i dag – 1 forfalt" */
  protected readonly subtitle = computed(() => {
    const late = this.overdueRows().length;
    const total =
      late + this.waitingRows().length + this.openRows().length + this.doneRows().length;
    return late > 0
      ? $localize`:@@tasks.subtitleLate:${total}:total: i dag – ${late}:late: forfalt`
      : $localize`:@@tasks.subtitle:${total}:total: i dag`;
  });

  protected readonly hasDay = computed(
    () =>
      this.overdueRows().length +
        this.waitingRows().length +
        this.openRows().length +
        this.doneRows().length >
      0,
  );

  /** The approval popup of a chore with sub-tasks (ST-2042 sheet 4) */
  protected readonly reviewing = signal<Assignment | null>(null);
  protected readonly reviewError = signal<string | null>(null);

  /** With one child selected, open rows offer «Bytt» */
  protected readonly canReassign = computed(() => this.selectedChildId() !== null);

  /** Templates a long press can tick: only a row with a live template behind it answers */
  private readonly liveIds = computed(() => new Set(this.templates().map((t) => t.id)));

  /** Only templates still in the list count, also after a re-read */
  protected readonly chosenCount = computed(() => this.chosenTasks().length);
  protected readonly allChosen = computed(
    () => this.templates().length > 0 && this.chosenCount() === this.templates().length,
  );

  /** «Velg oppgaver» with nothing chosen, then «3 valgt» */
  protected readonly selectTitle = computed(() => {
    const n = this.chosenCount();
    return n === 0
      ? $localize`:@@tasks.selectTitleEmpty:Velg oppgaver`
      : $localize`:@@tasks.selectTitleCount:${n}:n: valgt`;
  });

  /** Desktop strip: «3 av 8 valgt» */
  protected readonly selectSummary = computed(
    () =>
      $localize`:@@tasks.selectSummary:${this.chosenCount()}:n: av ${this.templates().length}:total: valgt`,
  );

  protected readonly deleteLabel = computed(() => {
    const n = this.chosenCount();
    return n === 0
      ? $localize`:@@tasks.bulkDeleteNone:Slett`
      : $localize`:@@tasks.bulkDelete:Slett ${n}:n:`;
  });

  /** Desktop strip spells it out as d1 draws it: «Slett 3 oppgaver», «Slett 1 oppgave» */
  protected readonly deleteLabelLong = computed(() => {
    const n = this.chosenCount();
    return n === 1
      ? $localize`:@@tasks.bulkDeleteLongOne:Slett 1 oppgave`
      : $localize`:@@tasks.bulkDeleteLong:Slett ${n}:n: oppgaver`;
  });

  /** The chosen templates in list order, for the confirm */
  private readonly chosenTasks = computed(() =>
    this.templates().filter((t) => this.chosen().has(t.id)),
  );

  protected readonly confirmTitle = computed(() => {
    const n = this.chosenCount();
    return n === 1
      ? $localize`:@@tasks.bulkConfirmTitleOne:Slette 1 oppgave?`
      : $localize`:@@tasks.bulkConfirmTitle:Slette ${n}:n: oppgaver?`;
  });

  protected readonly confirmBody = computed(() => {
    const n = this.chosenCount();
    if (n === 1) {
      return $localize`:@@tasks.bulkConfirmBodyOne:Oppgaven forsvinner for hele familien. Poeng som alt er gitt, blir stående. Dette kan ikke angres.`;
    }
    const count = COUNT_WORDS[n] ?? String(n);
    return $localize`:@@tasks.bulkConfirmBody:De ${count}:n: oppgavene forsvinner for hele familien. Poeng som alt er gitt, blir stående. Dette kan ikke angres.`;
  });

  /** Up to three names, then «+ 20 til» */
  protected readonly confirmNames = computed(() =>
    this.chosenTasks()
      .slice(0, 3)
      .map((t) => t.name),
  );
  protected readonly confirmMore = computed(() => {
    const rest = this.chosenCount() - 3;
    return rest > 0 ? $localize`:@@tasks.bulkConfirmMore:+ ${rest}:n: til` : '';
  });

  protected readonly failureTitle = computed(() => {
    const f = this.failure();
    if (!f) return '';
    return f.failed === f.asked
      ? $localize`:@@tasks.bulkNoneDeleted:Ingen av oppgavene ble slettet`
      : $localize`:@@tasks.bulkPartial:${f.failed}:failed: av ${f.asked}:asked: ble ikke slettet`;
  });

  ngOnInit(): void {
    const child = this.route.snapshot.queryParams['child'] as string | undefined;
    if (child) this.selectedChildId.set(child);
    void this.loadTasks();
  }

  /**
   * The day, the children for the chips and every template, in parallel.
   * `quiet` re-reads without the loading state, so the list stays where it is
   */
  protected async loadTasks(quiet = false): Promise<void> {
    const household = this.householdId();
    if (!household) {
      this.error.set($localize`:@@tasks.noHousehold:Ingen husstand valgt`);
      return;
    }

    if (!quiet) this.loading.set(true);
    this.error.set(null);
    try {
      const [day, children] = await Promise.all([
        this.householdDay.load(household),
        this.childrenService.listChildren(household),
        firstValueFrom(this.taskService.getTasks(household, true)),
        this.loadTurns(household),
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

  /** "Mathea – I dag"; a weekly chore "Emma – Frist søndag", on the day "Frist i dag" (ST-2143) */
  protected openMeta(a: Assignment): string {
    if (a.ruleType === 'weekly_rotation') {
      return $localize`:@@tasks.deadlineMeta:${this.who(a)}:who: – Frist ${dayWord(a.date)}:day:`;
    }
    return $localize`:@@tasks.openMeta:${this.who(a)}:who: – ${capitalize(dayWord(a.date))}:day:`;
  }

  /** "Emma – ferdig 17.20": sent with sub-tasks, waiting for a parent */
  protected waitingMeta(a: Assignment): string {
    const at = a.submittedAt ? clockTime(a.submittedAt) : '';
    return $localize`:@@tasks.waitingMeta:${this.who(a)}:who: – ferdig ${at}:at:`;
  }

  /** The count line under a chore with sub-tasks */
  protected subtaskNote(a: Assignment): { text: string; tone: 'plain' } | null {
    if (!hasSubtasks(a)) return null;
    return { text: a.submittedAt ? sentLine(a.subtasks!) : doneLine(a.subtasks!), tone: 'plain' };
  }

  /** Points a done chore gave: with sub-tasks, the done ones only */
  protected earned(a: Assignment): number | undefined {
    return hasSubtasks(a) ? summarizeSubtasks(a.subtasks!).earned : a.points;
  }

  /** "Emma – Gjort 16.10" */
  protected doneMeta(a: Assignment): string {
    const at = a.completedAt ? ` ${doneWhen(a.completedAt)}` : '';
    return $localize`:@@tasks.doneMeta:${this.who(a)}:who: – Gjort${at}:at:`;
  }

  /** "Gjentas" / "Én gang" for a template row; "Uten barn" when its children are gone */
  protected templateMeta(t: Task): string {
    if (this.noChildTasks().includes(t)) {
      return $localize`:@@tasks.ruleNoChildren:Uten barn – velg et nytt`;
    }
    const rule =
      t.ruleType === 'single'
        ? $localize`:@@tasks.ruleOnce:Én gang`
        : t.ruleType === 'next_in_line'
          ? $localize`:@@tasks.ruleNextInLine:Etter tur`
          : $localize`:@@tasks.ruleRepeat:Gjentas`;
    // A parent deletes by name: «Gjentas – Jonas» says whose chore it is (ST-1343)
    const ids = t.ruleConfig?.assignedChildren ?? [];
    const names = this.children()
      .filter((c) => ids.includes(c.id))
      .map((c) => c.name);
    return names.length > 0 ? `${rule} – ${names.join(', ')}` : rule;
  }

  protected points(value: number | undefined): string {
    return value != null ? $localize`:@@tasks.points:${value}:points: p` : '';
  }

  private who(a: Assignment): string {
    return a.childName || $localize`:@@tasks.anyone:Alle`;
  }

  /** A parent may tick a chore off for the child; one with sub-tasks is approved in its popup */
  protected async onComplete(a: Assignment): Promise<void> {
    if (hasSubtasks(a)) {
      this.reviewError.set(null);
      this.reviewing.set(a);
      return;
    }
    await this.complete(a);
  }

  /** «Godkjenn»: the points of the done sub-tasks */
  protected async onApprove(a: Assignment): Promise<void> {
    this.reviewError.set(null);
    if (await this.complete(a)) {
      this.reviewing.set(null);
    } else {
      this.reviewError.set(
        $localize`:@@tasks.approveFailed:Det gikk ikke å godkjenne. Sjekk nettet og prøv igjen.`,
      );
    }
  }

  private async complete(a: Assignment): Promise<boolean> {
    this.completingId.set(a.id);
    try {
      await this.taskService.completeTask(a.id);
      const done = { ...a, status: 'completed' as const, completedAt: new Date().toISOString() };
      this.overdue.update((list) => list.filter((x) => x.id !== a.id));
      this.today.update((list) =>
        list.some((x) => x.id === a.id) ? list.map((x) => (x.id === a.id ? done : x)) : list,
      );
      return true;
    } catch (err) {
      console.error('Complete task error:', err);
      if (!hasSubtasks(a)) {
        this.error.set($localize`:@@tasks.completeFailed:Kunne ikke merke oppgaven som ferdig`);
      }
      return false;
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
        subtasks: data.subtasks,
      })
      .subscribe({
        next: async (task) => {
          this.createOpen.set(false);
          await this.loadTasks();
          // «Du får en QR-kode å skrive ut når oppgaven er lagret» (ST-2075)
          const turn = this.turns().find((t) => t.taskId === task.id);
          if (turn) this.openTurn(turn, 'code');
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

  /** A row a long press can start select mode from */
  protected isLive(taskId: string): boolean {
    return this.liveIds().has(taskId);
  }

  /** «Velg»: select mode with nothing chosen */
  protected startSelect(): void {
    this.receipt.set(null);
    this.failure.set(null);
    this.chosen.set(new Set());
    this.selecting.set(true);
  }

  /**
   * Long press (ST-1391): select mode with that chore's template ticked. Where the list
   * is long enough, the ticked row is scrolled back under the finger
   */
  protected onLongPress(taskId: string, rowTop: number): void {
    if (this.selecting() || !this.isLive(taskId)) return;
    this.startSelect();
    this.chosen.set(new Set([taskId]));
    afterNextRender(
      () => {
        const row = document.querySelector(`[data-select-id="${taskId}"]`);
        if (!row) return;
        window.scrollBy(0, row.getBoundingClientRect().top - rowTop);
      },
      { injector: this.injector },
    );
  }

  protected toggleChosen(taskId: string): void {
    this.failure.set(null);
    this.chosen.update((set) => {
      const next = new Set(set);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  /** «Velg alle» / «Fjern alle»: every template, also the ones below the fold */
  protected toggleAll(): void {
    this.failure.set(null);
    this.chosen.set(this.allChosen() ? new Set() : new Set(this.templates().map((t) => t.id)));
  }

  protected cancelSelect(): void {
    this.selecting.set(false);
    this.chosen.set(new Set());
    this.failure.set(null);
  }

  /** «Slett n»: one blocking confirm. «Prøv igjen» after a partial failure skips it */
  protected onDeleteChosen(): void {
    if (this.chosenCount() === 0 || this.deleting()) return;
    if (this.failure()) {
      void this.deleteChosen();
      return;
    }
    this.confirmOpen.set(true);
  }

  protected closeConfirm(): void {
    if (this.deleting()) return;
    this.confirmOpen.set(false);
  }

  /** One call; then the list is re-read from the server, never patched optimistically */
  protected async deleteChosen(): Promise<void> {
    const ids = this.chosenTasks().map((t) => t.id);
    if (ids.length === 0) return;
    this.deleting.set(true);
    try {
      const result = await firstValueFrom(
        this.taskService.bulkDeleteTasks(this.householdId(), ids),
      );
      this.afterDelete(
        ids.length,
        result.deleted,
        result.failed.map((f) => f.taskId),
      );
    } catch (err) {
      console.error('Bulk delete error:', err);
      this.afterDelete(ids.length, [], ids);
    } finally {
      this.deleting.set(false);
      this.confirmOpen.set(false);
    }
  }

  private afterDelete(asked: number, deleted: string[], failed: string[]): void {
    if (failed.length === 0) {
      const n = deleted.length;
      this.receipt.set(
        n === 1
          ? $localize`:@@tasks.bulkDeletedOne:1 oppgave slettet`
          : $localize`:@@tasks.bulkDeleted:${n}:n: oppgaver slettet`,
      );
      this.cancelSelect();
    } else {
      // What went is gone; what failed stays chosen, so «Prøv igjen» is one tap
      this.chosen.set(new Set(failed));
      this.failure.set({ failed: failed.length, asked });
    }
    void this.loadTasks(true);
  }
}
