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

/** The chore's children in turn order; children that no longer exist are left out */
export async function turnOrder(client: Queryable, taskId: string): Promise<TurnChildRow[]> {
  const result = await client.query<{ child_id: string; name: string }>(
    `SELECT c.id AS child_id, c.name
     FROM tasks t
     CROSS JOIN LATERAL jsonb_array_elements_text(
       CASE WHEN jsonb_typeof(t.rule_config->'assignedChildren') = 'array'
            THEN t.rule_config->'assignedChildren' ELSE '[]'::jsonb END
     ) WITH ORDINALITY AS a(child, n)
     JOIN children c ON c.id::text = a.child AND c.household_id = t.household_id
     WHERE t.id = $1
     ORDER BY a.n`,
    [taskId],
  );
  return result.rows.map((r) => ({ childId: r.child_id, name: r.name }));
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

/** Done rows of an «Etter tur» chore are dated the day they were done, as other chores are */
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
