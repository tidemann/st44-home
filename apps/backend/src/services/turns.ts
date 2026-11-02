import type { PoolClient } from 'pg';
import { todayInTimeZone } from './assignment-scheduler.js';
import { generateScanCode, nextInLine } from './next-in-line.js';

/**
 * «Etter tur» chores (ST-2075). The open turn is one pending task_assignments row for the
 * child whose turn it is. Finishing it, by the normal tick or by a scan of the chore's code,
 * completes that row with points, and the next child in tasks.rule_config.assignedChildren
 * gets a new pending row. The assignment generator never touches these chores.
 */

type Queryable = Pick<PoolClient, 'query'>;

export interface TurnChildRow {
  childId: string;
  name: string;
}

function todayIso(): string {
  return todayInTimeZone(new Date()).toISOString().slice(0, 10);
}

/** Several chores' children in turn order, in one query; children that no longer exist are left out */
export async function turnOrders(
  client: Queryable,
  taskIds: string[],
): Promise<Map<string, TurnChildRow[]>> {
  const orders = new Map<string, TurnChildRow[]>(taskIds.map((id) => [id, []]));
  if (taskIds.length === 0) return orders;
  const result = await client.query<{ task_id: string; child_id: string; name: string }>(
    `SELECT t.id AS task_id, c.id AS child_id, c.name
     FROM tasks t
     CROSS JOIN LATERAL jsonb_array_elements_text(
       CASE WHEN jsonb_typeof(t.rule_config->'assignedChildren') = 'array'
            THEN t.rule_config->'assignedChildren' ELSE '[]'::jsonb END
     ) WITH ORDINALITY AS a(child, n)
     JOIN children c ON c.id::text = a.child AND c.household_id = t.household_id
     WHERE t.id = ANY($1::uuid[])
     ORDER BY t.id, a.n`,
    [taskIds],
  );
  for (const r of result.rows) {
    orders.get(r.task_id)?.push({ childId: r.child_id, name: r.name });
  }
  return orders;
}

/** One chore's children in turn order */
export async function turnOrder(client: Queryable, taskId: string): Promise<TurnChildRow[]> {
  return (await turnOrders(client, [taskId])).get(taskId) ?? [];
}

/**
 * Opens the turn for a child: one pending row, dated today, or the day after this child's
 * last row for the chore, so the (task, child, date) unique index cannot clash when the
 * turn comes back to the same child on the same day.
 */
export async function openTurn(
  client: Queryable,
  householdId: string,
  taskId: string,
  childId: string,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
     SELECT $1, $2, $3, GREATEST($4::date, COALESCE(MAX(date) + 1, $4::date)), 'pending'
     FROM task_assignments
     WHERE task_id = $2 AND child_id = $3
     RETURNING id`,
    [householdId, taskId, childId, todayIso()],
  );
  return result.rows[0].id;
}

/** Removes the chore's open turn; returns the child who had it */
async function clearOpenTurn(client: Queryable, taskId: string): Promise<string | null> {
  const result = await client.query<{ child_id: string | null }>(
    `DELETE FROM task_assignments WHERE task_id = $1 AND status = 'pending' RETURNING child_id`,
    [taskId],
  );
  return result.rows[0]?.child_id ?? null;
}

/** After `fromChildId` finished: the next child in the order gets the turn */
export async function passTurn(
  client: Queryable,
  householdId: string,
  taskId: string,
  fromChildId: string,
): Promise<TurnChildRow | null> {
  const order = await turnOrder(client, taskId);
  const nextId = nextInLine(
    order.map((c) => c.childId),
    fromChildId,
  );
  await clearOpenTurn(client, taskId);
  if (!nextId) return null;
  await openTurn(client, householdId, taskId, nextId);
  return order.find((c) => c.childId === nextId) ?? null;
}

/**
 * Exactly one open turn, on a child in the order: after the chore is made or its order is
 * changed. A child who still has the turn keeps it; otherwise the first child gets it.
 */
export async function syncTurn(client: Queryable, householdId: string, taskId: string) {
  const order = (await turnOrder(client, taskId)).map((c) => c.childId);
  const open = await client.query<{ child_id: string | null }>(
    `SELECT child_id FROM task_assignments WHERE task_id = $1 AND status = 'pending'`,
    [taskId],
  );
  const holders = open.rows.map((r) => r.child_id);
  if (holders.length === 1 && holders[0] && order.includes(holders[0])) return;

  const keep = holders.find((id): id is string => !!id && order.includes(id)) ?? order[0];
  await clearOpenTurn(client, taskId);
  if (keep) await openTurn(client, householdId, taskId, keep);
}

/**
 * After a parent saved the order: the top child has the turn. Nothing changes when they
 * already have it; otherwise it is a move by hand, and the history says so.
 */
export async function giveTurnTo(
  client: Queryable,
  householdId: string,
  taskId: string,
  childId: string,
  movedBy: string | undefined,
) {
  const open = await client.query<{ child_id: string | null }>(
    `SELECT child_id FROM task_assignments WHERE task_id = $1 AND status = 'pending'`,
    [taskId],
  );
  if (open.rows.length === 1 && open.rows[0].child_id === childId) return;
  if (open.rows.length === 0) {
    await openTurn(client, householdId, taskId, childId);
    return;
  }
  await moveTurn(client, householdId, taskId, childId, movedBy);
}

/** A parent gives the turn to another child by hand; no points change */
export async function moveTurn(
  client: Queryable,
  householdId: string,
  taskId: string,
  toChildId: string,
  movedBy: string | undefined,
) {
  const fromChildId = await clearOpenTurn(client, taskId);
  await openTurn(client, householdId, taskId, toChildId);
  await client.query(
    `INSERT INTO task_turn_moves (household_id, task_id, from_child_id, to_child_id, moved_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [householdId, taskId, fromChildId, toChildId, movedBy ?? null],
  );
}

/**
 * Done rows of an «Etter tur» chore are dated the day they were done, as other chores are.
 * Known limit: when the same child finishes a second turn on the same day, the
 * (task, child, date) unique index keeps that row on the later date openTurn gave it, so
 * the day lists show it there. The history and points use completed_at and stay right.
 */
export async function dateDoneTurnToday(client: Queryable, assignmentId: string) {
  await client.query(
    `UPDATE task_assignments ta
     SET date = $2::date
     WHERE ta.id = $1
       AND NOT EXISTS (
         SELECT 1 FROM task_assignments o
         WHERE o.task_id = ta.task_id AND o.child_id = ta.child_id
           AND o.date = $2::date AND o.id <> ta.id
       )`,
    [assignmentId, todayIso()],
  );
}

/** A new code for the chore's QR/NFC link, unique across all households */
export async function newScanCode(client: Queryable): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateScanCode();
    const taken = await client.query('SELECT 1 FROM tasks WHERE scan_code = $1', [code]);
    if (taken.rows.length === 0) return code;
  }
  throw new Error('Could not find a free scan code');
}

/** The unique index on tasks.scan_code stopped a write: the code was taken after the check */
export function isScanCodeClash(error: unknown): boolean {
  const pgError = error as { code?: unknown; constraint?: unknown } | null;
  return pgError?.code === '23505' && pgError.constraint === 'idx_tasks_scan_code';
}

/**
 * Saves with a new code. Two chores saved at the same moment can both find the same code
 * free; the unique index stops the second, and it is saved again with another code.
 */
export async function withNewScanCode<T>(
  client: Queryable,
  save: (code: string) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await save(await newScanCode(client));
    } catch (error) {
      if (!isScanCodeClash(error) || attempt >= 3) throw error;
    }
  }
}
