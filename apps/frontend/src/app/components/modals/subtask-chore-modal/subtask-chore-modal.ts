import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { summarizeSubtasks, type AssignmentSubtask, type SubtaskState } from '@st44/types';
import { Modal } from '../modal/modal';
import { SubtaskRow } from '../../poeng/subtask-row/subtask-row';
import { TaskService } from '../../../services/task.service';
import { popupCountLine } from '../../../utils/subtask-lines';

/** The chore the popup shows */
export interface SubtaskChore {
  id: string;
  taskName: string;
  subtasks: AssignmentSubtask[];
}

/**
 * The child's chore with sub-tasks (ST-2074, ST-2042 sheet 3; Stig chose a popup, ST-2052
 * choice 1). Each tick or «Ikke mulig» is saved at once. «Ferdig» with every sub-task ticked
 * finishes the chore, and the page shows the usual tick moment; with some not done it goes to a
 * parent, and no points are given until a parent approves.
 */
@Component({
  selector: 'app-subtask-chore-modal',
  imports: [Modal, SubtaskRow],
  templateUrl: './subtask-chore-modal.html',
  styleUrl: './subtask-chore-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubtaskChoreModal {
  private readonly taskService = inject(TaskService);

  readonly chore = input<SubtaskChore | null>(null);

  readonly closed = output<void>();
  /** «Ferdig» with every sub-task ticked: the page completes the chore */
  readonly completed = output<SubtaskChore>();
  /** «Ferdig» with some not done: the chore was sent to a parent */
  readonly submitted = output<SubtaskChore>();

  /** What the server last saved; null until the first save after opening */
  private readonly saved = signal<{ id: string; subtasks: AssignmentSubtask[] } | null>(null);
  protected readonly busyId = signal<string | null>(null);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly subtasks = computed(() => {
    const chore = this.chore();
    const saved = this.saved();
    if (!chore) return [];
    return saved?.id === chore.id ? saved.subtasks : chore.subtasks;
  });

  protected readonly summary = computed(() => summarizeSubtasks(this.subtasks()));
  protected readonly countLine = computed(() => popupCountLine(this.subtasks()));

  /** The line over the buttons: what happens on «Ferdig» */
  protected readonly footLine = computed(() => {
    const s = this.summary();
    return s.allDone
      ? $localize`:@@subtaskChore.allPoints:Du får ${s.total}:points: poeng.`
      : $localize`:@@subtaskChore.parentChecks:Mor eller far ser over. Du har huket av ${s.earned}:earned: av ${s.total}:total: poeng.`;
  });

  protected toggleDone(subtask: AssignmentSubtask): void {
    void this.save(subtask, subtask.state === 'done' ? null : 'done');
  }

  protected toggleNotPossible(subtask: AssignmentSubtask): void {
    void this.save(subtask, subtask.state === 'not_possible' ? null : 'not_possible');
  }

  private async save(subtask: AssignmentSubtask, state: SubtaskState | null): Promise<void> {
    const chore = this.chore();
    if (!chore || this.busyId()) return;
    this.busyId.set(subtask.id);
    this.error.set(null);
    try {
      const subtasks = await this.taskService.setSubtaskState(chore.id, subtask.id, state);
      this.saved.set({ id: chore.id, subtasks });
    } catch {
      this.error.set(
        $localize`:@@subtaskChore.saveFailed:Det ble ikke lagret. Sjekk nettet og prøv igjen.`,
      );
    } finally {
      this.busyId.set(null);
    }
  }

  protected async onFinish(): Promise<void> {
    const chore = this.chore();
    if (!chore || this.sending() || this.busyId()) return;
    const current = { ...chore, subtasks: this.subtasks() };
    if (this.summary().allDone) {
      this.completed.emit(current);
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    try {
      await this.taskService.submitTask(chore.id);
      this.submitted.emit(current);
    } catch {
      this.error.set(
        $localize`:@@subtaskChore.sendFailed:Det gikk ikke å sende den. Sjekk nettet og prøv igjen.`,
      );
    } finally {
      this.sending.set(false);
    }
  }

  protected onClose(): void {
    this.error.set(null);
    this.closed.emit();
  }
}
