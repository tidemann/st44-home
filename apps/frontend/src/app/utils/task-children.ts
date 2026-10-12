import type { Task, Child } from '@st44/types';

/**
 * True for a recurring task whose chosen children have all been deleted (ST-914).
 *
 * Deleting a child leaves its id in the task's rule config. With some children
 * left the task simply rotates between them; with none left the nightly job
 * skips it, so the parent has to pick a new child or delete the task.
 * A task with no chosen children is for everyone and is never orphaned.
 */
export function hasNoChildrenLeft(task: Task, children: readonly Child[]): boolean {
  if (task.ruleType === 'single') return false;
  const chosen = task.ruleConfig?.assignedChildren ?? [];
  if (chosen.length === 0) return false;
  return !chosen.some((id) => children.some((child) => child.id === id));
}
