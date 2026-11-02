import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { summarizeSubtasks, type Assignment } from '@st44/types';
import { Modal } from '../modal/modal';
import { SubtaskRow } from '../../poeng/subtask-row/subtask-row';
import { clockTime } from '../../../utils/poeng-format';

/**
 * The parent's approval of a chore with sub-tasks (ST-2074, ST-2042 sheet 4). The rows are the
 * child's, read only; the sum stands on its own line. «Godkjenn» gives the points of the done
 * sub-tasks («Ikke mulig» and not done give 0, brief point 6); «Ikke nå» changes nothing and the
 * chore stays in «Venter på godkjenning».
 */
@Component({
  selector: 'app-subtask-review-modal',
  imports: [Modal, SubtaskRow],
  templateUrl: './subtask-review-modal.html',
  styleUrl: './subtask-review-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubtaskReviewModal {
  readonly chore = input<Assignment | null>(null);
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  readonly closed = output<void>();
  readonly approve = output<Assignment>();

  protected readonly subtasks = computed(() => this.chore()?.subtasks ?? []);
  protected readonly summary = computed(() => summarizeSubtasks(this.subtasks()));
  protected readonly childName = computed(
    () => this.chore()?.childName || $localize`:@@subtaskReview.theChild:Barnet`,
  );

  /** «Emma ble ferdig 17.20»; a chore not sent yet says so */
  protected readonly firstLine = computed(() => {
    const chore = this.chore();
    const name = this.childName();
    return chore?.submittedAt
      ? $localize`:@@subtaskReview.finishedAt:${name}:name: ble ferdig ${clockTime(chore.submittedAt)}:time:`
      : $localize`:@@subtaskReview.notSent:${name}:name: har ikke sendt den ennå.`;
  });

  /** «2 av 3 deloppgaver er gjort.» */
  protected readonly doneCount = computed(() => {
    const done = this.summary().done;
    const total = this.subtasks().length;
    return $localize`:@@subtaskReview.doneCount:${done}:done: av ${total}:total: deloppgaver er gjort.`;
  });

  protected readonly sumValue = computed(() => {
    const s = this.summary();
    return $localize`:@@subtaskReview.sum:${s.earned}:earned: av ${s.total}:total: poeng`;
  });

  protected readonly sumLabel = computed(
    () => $localize`:@@subtaskReview.gets:${this.childName()}:name: får`,
  );

  protected onApprove(): void {
    const chore = this.chore();
    if (chore && !this.busy()) this.approve.emit(chore);
  }
}
