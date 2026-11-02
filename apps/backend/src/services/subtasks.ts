/**
 * Chores with sub-tasks (ST-2074, drawn on ST-2042).
 *
 * A chore template (tasks) has an ordered list of sub-tasks (task_subtasks), each with its own
 * points; the chore's points are their sum. On one chore instance (task_assignments) the child
 * marks each sub-task done or "not possible" (assignment_subtask_states). When the child sends a
 * chore whose sub-tasks are not all done, task_assignments.submitted_at is set and a parent
 * approves it; the child then gets the points of the done sub-tasks only.
 */
import type { Pool, PoolClient } from 'pg';
import type { AssignmentSubtask, Subtask, SubtaskInput, SubtaskState } from '@st44/types';

type Queryable = Pool | PoolClient;

interface SubtaskRow {
  id: string;
  task_id: string;
  name: string;
  points: number;
  position: number;
}

interface AssignmentSubtaskRow extends SubtaskRow {
  assignment_id: string;
  state: SubtaskState | null;
  updated_at: Date | null;
}

function mapSubtask(row: SubtaskRow): Subtask {
  return { id: row.id, name: row.name, points: row.points, position: row.position };
}

/**
 * Replace a chore's sub-tasks with `inputs`, in that order. Rows with a known id are kept (so the
 * child's ticks on them survive an edit), rows without one are added, and the rest are removed.
 * Returns the sum of the points.
 */
export async function saveSubtasks(
  db: Queryable,
  householdId: string,
  taskId: string,
  inputs: SubtaskInput[],
): Promise<number> {
  const existing = await db.query<{ id: string }>(
    'SELECT id FROM task_subtasks WHERE task_id = $1',
    [taskId],
  );
  const known = new Set(existing.rows.map((r) => r.id));
  const keep: string[] = [];

  for (const [position, input] of inputs.entries()) {
    if (input.id && known.has(input.id)) {
      await db.query(
        'UPDATE task_subtasks SET name = $1, points = $2, position = $3 WHERE id = $4',
        [input.name, input.points, position, input.id],
      );
      keep.push(input.id);
    } else {
      const inserted = await db.query<{ id: string }>(
        `INSERT INTO task_subtasks (household_id, task_id, name, points, position)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [householdId, taskId, input.name, input.points, position],
      );
      keep.push(inserted.rows[0].id);
    }
  }

  await db.query('DELETE FROM task_subtasks WHERE task_id = $1 AND NOT (id = ANY($2::uuid[]))', [
    taskId,
    keep,
  ]);

  return inputs.reduce((sum, s) => sum + s.points, 0);
}

/** Sub-tasks of each chore template, in order, keyed by task id */
export async function loadTaskSubtasks(
  db: Queryable,
  taskIds: string[],
): Promise<Map<string, Subtask[]>> {
  const byTask = new Map<string, Subtask[]>();
  if (taskIds.length === 0) return byTask;
  const result = await db.query<SubtaskRow>(
    `SELECT id, task_id, name, points, position FROM task_subtasks
     WHERE task_id = ANY($1::uuid[])
     ORDER BY task_id, position, created_at`,
    [taskIds],
  );
  for (const row of result.rows) {
    const list = byTask.get(row.task_id) ?? [];
    list.push(mapSubtask(row));
    byTask.set(row.task_id, list);
  }
  return byTask;
}

/** Sub-tasks of each chore instance, in order, with what the child did, keyed by assignment id */
export async function loadAssignmentSubtasks(
  db: Queryable,
  assignmentIds: string[],
): Promise<Map<string, AssignmentSubtask[]>> {
  const byAssignment = new Map<string, AssignmentSubtask[]>();
  if (assignmentIds.length === 0) return byAssignment;
  const result = await db.query<AssignmentSubtaskRow>(
    `SELECT ta.id AS assignment_id, s.id, s.task_id, s.name, s.points, s.position,
            st.state, st.updated_at
     FROM task_assignments ta
     JOIN task_subtasks s ON s.task_id = ta.task_id
     LEFT JOIN assignment_subtask_states st
       ON st.assignment_id = ta.id AND st.subtask_id = s.id
     WHERE ta.id = ANY($1::uuid[])
     ORDER BY ta.id, s.position, s.created_at`,
    [assignmentIds],
  );
  for (const row of result.rows) {
    const list = byAssignment.get(row.assignment_id) ?? [];
    list.push({
      ...mapSubtask(row),
      state: row.state,
      updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
    });
    byAssignment.set(row.assignment_id, list);
  }
  return byAssignment;
}

/** Add `subtasks` to each assignment: always an array, [] for a normal chore */
export async function withAssignmentSubtasks<T extends { id: string }>(
  db: Queryable,
  assignments: T[],
): Promise<(T & { subtasks: AssignmentSubtask[] })[]> {
  const byAssignment = await loadAssignmentSubtasks(
    db,
    assignments.map((a) => a.id),
  );
  return assignments.map((a) => ({ ...a, subtasks: byAssignment.get(a.id) ?? [] }));
}
