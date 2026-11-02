import '@angular/localize/init';
import { summarizeSubtasks, type AssignmentSubtask } from '@st44/types';

/**
 * The count lines of a chore with sub-tasks (ST-2074, ST-2042 sheets 3–6). One form, three
 * places: what is left for the child, what is done for the parent, and the waiting line.
 */

/** « · 1 ikke mulig», or nothing */
function notPossibleTail(count: number): string {
  return count > 0 ? $localize`:@@subtasks.notPossibleTail: · ${count}:count: ikke mulig` : '';
}

/** The child, before sending: «2 av 3 igjen», «1 av 3 igjen · 1 ikke mulig» */
export function leftLine(subtasks: AssignmentSubtask[]): string {
  const s = summarizeSubtasks(subtasks);
  return (
    $localize`:@@subtasks.left:${s.left}:left: av ${subtasks.length}:total: igjen` +
    notPossibleTail(s.notPossible)
  );
}

/** The child's popup heading: the count, or «Alt gjort!» when every sub-task is ticked */
export function popupCountLine(subtasks: AssignmentSubtask[]): string {
  return summarizeSubtasks(subtasks).allDone
    ? $localize`:@@subtasks.allDone:Alt gjort!`
    : leftLine(subtasks);
}

/** The child, sent: «Venter på godkjenning · 1 ikke mulig» */
export function waitingLine(subtasks: AssignmentSubtask[]): string {
  return (
    $localize`:@@subtasks.waiting:Venter på godkjenning` +
    notPossibleTail(summarizeSubtasks(subtasks).notPossible)
  );
}

/** The parent, not sent yet: «0 av 4 deloppgaver gjort», «0 av 1 deloppgave gjort» */
export function doneLine(subtasks: AssignmentSubtask[]): string {
  const s = summarizeSubtasks(subtasks);
  return subtasks.length === 1
    ? $localize`:@@subtasks.doneOfOne:${s.done}:done: av 1 deloppgave gjort`
    : $localize`:@@subtasks.doneOf:${s.done}:done: av ${subtasks.length}:total: deloppgaver gjort`;
}

/** The parent, sent: «2 av 3 gjort · 1 ikke mulig» */
export function sentLine(subtasks: AssignmentSubtask[]): string {
  const s = summarizeSubtasks(subtasks);
  return (
    $localize`:@@subtasks.sentDone:${s.done}:done: av ${subtasks.length}:total: gjort` +
    notPossibleTail(s.notPossible)
  );
}

/** True for a chore that has sub-tasks */
export function hasSubtasks(chore: { subtasks?: AssignmentSubtask[] | null }): boolean {
  return (chore.subtasks?.length ?? 0) > 0;
}
