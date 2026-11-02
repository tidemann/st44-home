import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { AssignmentSubtask } from '@st44/types';
import { clockTime } from '../../../utils/poeng-format';

/**
 * One sub-task of a chore (ST-2074, ST-2042 sheets 3 and 4).
 *
 * For the child the whole row ticks the sub-task, and the «Ikke mulig» chip under the name marks
 * it not possible; the two exclude each other. For the parent (`readonly`) the row only shows
 * what the child did: the state is the box and the line under the name.
 *
 * Three states, readable without colour: open (empty box, amber points), done (green box with a
 * white tick, «Gjort 17.02»), not possible (grey box with a dash, chosen chip or the words, the
 * points dimmed).
 */
@Component({
  selector: 'app-subtask-row',
  templateUrl: './subtask-row.html',
  styleUrl: './subtask-row.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubtaskRow {
  readonly subtask = input.required<AssignmentSubtask>();
  /** The parent's approval: no controls */
  readonly readonly = input(false);
  /** A save is on its way: the controls wait */
  readonly busy = input(false);

  /** The row was pressed: tick, or untick */
  readonly toggleDone = output<void>();
  /** «Ikke mulig» was pressed: mark, or unmark */
  readonly toggleNotPossible = output<void>();

  protected readonly done = computed(() => this.subtask().state === 'done');
  protected readonly notPossible = computed(() => this.subtask().state === 'not_possible');

  /** The chip's name for a screen reader. Bound with $localize: an interpolated
   *  i18n-aria-label comes out empty in this build, so the chip would have no name */
  protected readonly notPossibleLabel = computed(
    () => $localize`:@@subtaskRow.notPossibleAria:Ikke mulig: ${this.subtask().name}:name:`,
  );

  /** «Gjort 17.02» */
  protected readonly doneAt = computed(() => {
    const at = this.subtask().updatedAt;
    return at
      ? $localize`:@@subtaskRow.doneAt:Gjort ${clockTime(at)}:time:`
      : $localize`:@@subtaskRow.done:Gjort`;
  });
}
