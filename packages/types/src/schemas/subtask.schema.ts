/**
 * Sub-task Schema - chores with sub-tasks (ST-2074)
 */
import { z } from '../generators/openapi.generator.js';

/** What the child did with one sub-task on one chore instance; null = not yet */
export const SubtaskStateSchema = z.enum(['done', 'not_possible']);
export type SubtaskState = z.infer<typeof SubtaskStateSchema>;

/** Most sub-tasks one chore can have (ST-2042 sheet 6 draws 20) */
export const MAX_SUBTASKS = 20;

/** A sub-task on a chore template, in the order the parent set */
export const SubtaskSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  points: z.number().int().min(0).max(1000),
  position: z.number().int().min(0),
});
export type Subtask = z.infer<typeof SubtaskSchema>;

/** A sub-task as the parent form sends it; no id on a new row */
export const SubtaskInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  points: z.number().int().min(0).max(1000),
});
export type SubtaskInput = z.infer<typeof SubtaskInputSchema>;

/** A sub-task on one chore instance, with what the child did and when */
export const AssignmentSubtaskSchema = SubtaskSchema.extend({
  state: SubtaskStateSchema.nullable(),
  updatedAt: z.string().datetime().nullable(),
});
export type AssignmentSubtask = z.infer<typeof AssignmentSubtaskSchema>;

/** PUT /api/assignments/:assignmentId/subtasks/:subtaskId; null clears the row */
export const SetSubtaskStateRequestSchema = z.object({
  state: SubtaskStateSchema.nullable(),
});
export type SetSubtaskStateRequest = z.infer<typeof SetSubtaskStateRequestSchema>;

export interface SubtaskSummary {
  total: number;
  earned: number;
  done: number;
  notPossible: number;
  left: number;
  allDone: boolean;
}

export function summarizeSubtasks(subtasks: ReadonlyArray<{ points: number; state: SubtaskState | null }>): SubtaskSummary {
  let total = 0;
  let earned = 0;
  let done = 0;
  let notPossible = 0;
  let left = 0;
  for (const { points, state } of subtasks) {
    total += points;
    if (state === 'done') {
      earned += points;
      done++;
    } else if (state === 'not_possible') {
      notPossible++;
    } else {
      left++;
    }
  }
  return { total, earned, done, notPossible, left, allDone: subtasks.length > 0 && done === subtasks.length };
}
