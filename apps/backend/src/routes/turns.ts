import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UNDO_COMPLETE_SECONDS, MoveTurnRequestSchema } from '@st44/types';
import type { ScanResult, TaskTurn, TurnHistoryEntry } from '@st44/types';
import { pool } from '../database.js';
import { authenticateUser } from '../middleware/auth.js';
import { createIpRateLimiter } from '../middleware/rate-limit.js';
import {
  validateHouseholdMembership,
  requireHouseholdParent,
} from '../middleware/household-membership.js';
import { pushService } from '../services/push.service.js';
import { nextInLine, normalizeScanCode } from '../services/next-in-line.js';
import { dateDoneTurnToday, moveTurn, passTurn, turnOrder, turnOrders } from '../services/turns.js';
import { withTransaction } from '../utils/index.js';

/**
 * «Etter tur» chores (ST-2075): whose turn it is, the scan of the chore's QR code or NFC
 * sticker (https://home.st44.no/s/<code>), the parent's history and moving the turn by hand.
 */

const householdParams = z.object({ householdId: z.string().uuid() });
const taskParams = z.object({ householdId: z.string().uuid(), taskId: z.string().uuid() });
const codeParams = z.object({ code: z.string().max(32) });

/** Printed codes cannot be guessed: one IP gets 120 scan calls an hour (a GET and a POST per scan) */
const scanRateLimiter = createIpRateLimiter('ratelimit:scan:', 120, 3600);

/** The normalised code from the route, or null when it cannot be a scan code (a 404) */
function routeCode(params: unknown): string | null {
  const parsed = codeParams.safeParse(params);
  return parsed.success ? normalizeScanCode(parsed.data.code) : null;
}

class RouteError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

interface TurnTaskRow {
  id: string;
  name: string;
  points: number | null;
  scan_code: string | null;
  assignment_id: string | null;
  turn_child_id: string | null;
  submitted_at: Date | null;
}

const TURN_TASKS_SQL = `
  SELECT t.id, t.name, t.points, t.scan_code,
         open.id AS assignment_id, open.child_id AS turn_child_id, open.submitted_at
  FROM tasks t
  LEFT JOIN LATERAL (
    SELECT ta.id, ta.child_id, ta.submitted_at FROM task_assignments ta
    WHERE ta.task_id = t.id AND ta.status = 'pending'
    ORDER BY ta.date LIMIT 1
  ) open ON true
  WHERE t.household_id = $1 AND t.active = true AND t.rule_type = 'next_in_line'`;

/** The chores as turns; every chore's order comes from one query */
async function toTurns(rows: TurnTaskRow[], withCode: boolean): Promise<TaskTurn[]> {
  const orders = await turnOrders(
    pool,
    rows.map((row) => row.id),
  );
  return rows.map((row) => ({
    taskId: row.id,
    name: row.name,
    points: row.points ?? 0,
    assignmentId: row.assignment_id,
    order: orders.get(row.id) ?? [],
    turnChildId: row.turn_child_id,
    submittedAt: row.submitted_at ? row.submitted_at.toISOString() : null,
    scanCode: withCode ? row.scan_code : null,
  }));
}

export default async function turnRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/children/me/turns
   * The signed-in child's household's «Etter tur» chores, and the child's own id, so the
   * child's home can tell «Din tur» from someone else's turn. No codes.
   */
  fastify.get(
    '/api/children/me/turns',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      const child = await pool.query<{ id: string; household_id: string }>(
        `SELECT c.id, c.household_id FROM children c
       JOIN household_members hm ON hm.household_id = c.household_id AND hm.user_id = c.user_id
       WHERE c.user_id = $1 AND hm.role = 'child'
       ORDER BY hm.joined_at NULLS LAST
       LIMIT 1`,
        [request.user?.userId],
      );
      const me = child.rows[0];
      if (!me) return reply.code(404).send({ error: 'Child profile not found' });
      const result = await pool.query<TurnTaskRow>(`${TURN_TASKS_SQL} ORDER BY t.name`, [
        me.household_id,
      ]);
      const turns = await toTurns(result.rows, false);
      return reply.send({ turns, myChildId: me.id });
    },
  );

  /**
   * GET /api/households/:householdId/turns
   * Every «Etter tur» chore and whose turn it is. Any member; only parents get the code.
   */
  fastify.get<{ Params: { householdId: string } }>(
    '/api/households/:householdId/turns',
    { preHandler: [authenticateUser, validateHouseholdMembership] },
    async (request, reply) => {
      const { householdId } = householdParams.parse(request.params);
      const role = request.household?.role;
      const isParent = role === 'admin' || role === 'parent';
      const result = await pool.query<TurnTaskRow>(`${TURN_TASKS_SQL} ORDER BY t.name`, [
        householdId,
      ]);
      const turns = await toTurns(result.rows, isParent);
      return reply.send({ turns });
    },
  );

  /**
   * GET /api/households/:householdId/tasks/:taskId/turn-history
   * Who did it, when and how (ticked in the app, scanned, or moved by a parent). Parents only.
   */
  fastify.get<{ Params: { householdId: string; taskId: string } }>(
    '/api/households/:householdId/tasks/:taskId/turn-history',
    { preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent] },
    async (request, reply) => {
      const { householdId, taskId } = taskParams.parse(request.params);
      const result = await pool.query<{
        kind: string;
        child_id: string | null;
        child_name: string | null;
        at: Date;
        points: number;
        moved_by_name: string | null;
      }>(
        `SELECT * FROM (
           SELECT COALESCE(tc.completed_via, 'app') AS kind, tc.child_id, c.name AS child_name,
                  tc.completed_at AS at, tc.points_earned AS points, NULL AS moved_by_name
           FROM task_completions tc
           JOIN task_assignments ta ON ta.id = tc.task_assignment_id
           LEFT JOIN children c ON c.id = tc.child_id
           WHERE ta.task_id = $1 AND ta.household_id = $2
           UNION ALL
           SELECT 'moved', m.from_child_id, c.name, m.moved_at, 0,
                  COALESCE(NULLIF(u.first_name, ''), NULLIF(u.name, ''), u.email)
           FROM task_turn_moves m
           LEFT JOIN children c ON c.id = m.from_child_id
           LEFT JOIN users u ON u.id = m.moved_by
           WHERE m.task_id = $1 AND m.household_id = $2
         ) h
         ORDER BY at DESC
         LIMIT 50`,
        [taskId, householdId],
      );
      const history: TurnHistoryEntry[] = result.rows.map((r) => ({
        kind: r.kind as TurnHistoryEntry['kind'],
        childId: r.child_id,
        childName: r.child_name,
        at: new Date(r.at).toISOString(),
        points: r.points,
        movedByName: r.moved_by_name,
      }));
      return reply.send({ history });
    },
  );

  /**
   * POST /api/households/:householdId/tasks/:taskId/turn
   * A parent gives the turn to another child in the order. No points change.
   */
  fastify.post<{ Params: { householdId: string; taskId: string } }>(
    '/api/households/:householdId/tasks/:taskId/turn',
    { preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent] },
    async (request, reply) => {
      const { householdId, taskId } = taskParams.parse(request.params);
      const parsed = MoveTurnRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'childId is required' });
      }
      const { childId } = parsed.data;
      // The chore and its order are read under the lock: a save of the order or a
      // deactivation that lands first is seen here, not overwritten by a stale check
      try {
        await withTransaction(pool, async (client) => {
          const task = await client.query(
            `SELECT 1 FROM tasks
             WHERE id = $1 AND household_id = $2 AND rule_type = 'next_in_line' AND active = true
             FOR UPDATE`,
            [taskId, householdId],
          );
          if (task.rows.length === 0) throw new RouteError(404, 'Task not found');
          const order = await turnOrder(client, taskId);
          if (!order.some((c) => c.childId === childId)) {
            throw new RouteError(400, 'The child is not in this chore’s order');
          }
          await moveTurn(client, householdId, taskId, childId, request.user?.userId);
        });
      } catch (error) {
        if (error instanceof RouteError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
      const result = await pool.query<TurnTaskRow>(`${TURN_TASKS_SQL} AND t.id = $2`, [
        householdId,
        taskId,
      ]);
      if (result.rows.length === 0) return reply.code(404).send({ error: 'Task not found' });
      return reply.send((await toTurns(result.rows, true))[0]);
    },
  );

  /**
   * GET /api/scan/:code
   * The chore's name, so the children's sign-in can say what the scan will finish.
   * No sign-in needed: whoever holds the card can read its name anyway.
   */
  fastify.get('/api/scan/:code', { preHandler: [scanRateLimiter] }, async (request, reply) => {
    const code = routeCode(request.params);
    if (!code) return reply.code(404).send({ error: 'Unknown code' });
    const result = await pool.query<{ name: string }>(
      `SELECT name FROM tasks WHERE scan_code = $1 AND active = true AND rule_type = 'next_in_line'`,
      [code],
    );
    if (result.rows.length === 0) return reply.code(404).send({ error: 'Unknown code' });
    return reply.send({ taskName: result.rows[0].name });
  });

  /**
   * POST /api/scan/:code
   * The signed-in child scanned the chore's code. Their turn: done, points given, the turn
   * moves on (the same as the tick in the app). Someone else's turn: nothing changes.
   */
  fastify.post(
    '/api/scan/:code',
    { preHandler: [scanRateLimiter, authenticateUser] },
    async (request, reply) => {
      const code = routeCode(request.params);
      if (!code) return reply.code(404).send({ error: 'Unknown code' });
      const userId = request.user?.userId;

      try {
        const outcome = await withTransaction(pool, async (client) => {
          const taskResult = await client.query<{
            id: string;
            household_id: string;
            name: string;
            points: number | null;
          }>(
            `SELECT id, household_id, name, points FROM tasks
           WHERE scan_code = $1 AND active = true AND rule_type = 'next_in_line'
           FOR UPDATE`,
            [code],
          );
          const task = taskResult.rows[0];
          if (!task) throw new RouteError(404, 'Unknown code');

          // Outsiders get the same 404, so a code cannot be probed for another household
          const member = await client.query<{ role: string }>(
            'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
            [task.household_id, userId],
          );
          if (member.rows.length === 0) throw new RouteError(404, 'Unknown code');

          const childResult = await client.query<{ id: string }>(
            'SELECT id FROM children WHERE user_id = $1 AND household_id = $2',
            [userId, task.household_id],
          );
          const childId = childResult.rows[0]?.id ?? null;

          const open = await client.query<{ id: string; child_id: string; name: string }>(
            `SELECT ta.id, ta.child_id, c.name FROM task_assignments ta
           JOIN children c ON c.id = ta.child_id
           WHERE ta.task_id = $1 AND ta.status = 'pending'
           ORDER BY ta.date LIMIT 1`,
            [task.id],
          );
          const turn = open.rows[0];
          const points = task.points ?? 0;

          // A grown-up has no turn to wait for, so «not your turn» would mislead them
          if (!childId && member.rows[0].role !== 'child') {
            const result: ScanResult = {
              result: 'parent',
              taskId: task.id,
              taskName: task.name,
              points,
              turnChildName: turn?.name ?? null,
            };
            return { result, completedAssignmentId: null };
          }

          // The same child scanning again (a second NFC tap, a reload after sign-in) gets the
          // answer of the scan they just made. This runs before the "your turn" branch, so a
          // repeat never pays twice even when the turn is already back with this child. It is a
          // repeat only while that scan is the chore's latest event: after another completion
          // or a move, a scan by the same child is a new turn.
          if (childId) {
            const recent = await client.query<{
              id: string;
              child_id: string;
              completed_via: string;
              completed_at: Date;
              points_earned: number;
              fresh: boolean;
            }>(
              `SELECT ta.id, tc.child_id, tc.completed_via, tc.completed_at, tc.points_earned,
                    tc.completed_at > NOW() - make_interval(secs => $2)
                      AND NOT EXISTS (SELECT 1 FROM task_turn_moves m
                                      WHERE m.task_id = $1 AND m.moved_at > tc.completed_at) AS fresh
             FROM task_completions tc
             JOIN task_assignments ta ON ta.id = tc.task_assignment_id
             WHERE ta.task_id = $1
             ORDER BY tc.completed_at DESC LIMIT 1`,
              [task.id, UNDO_COMPLETE_SECONDS],
            );
            const last = recent.rows[0];
            if (last?.fresh && last.child_id === childId && last.completed_via === 'scan') {
              const result: ScanResult = {
                result: 'done',
                taskId: task.id,
                taskName: task.name,
                assignmentId: last.id,
                pointsEarned: last.points_earned,
                completedAt: new Date(last.completed_at).toISOString(),
                nextChildName: turn?.name ?? null,
              };
              return { result, completedAssignmentId: null };
            }
          }

          if (childId && turn && turn.child_id === childId) {
            const completion = await client.query<{ completed_at: Date }>(
              `WITH done AS (
               UPDATE task_assignments SET status = 'completed'
               WHERE id = $1 AND status = 'pending' RETURNING id
             )
             INSERT INTO task_completions
               (household_id, task_assignment_id, child_id, completed_at, points_earned, completed_via)
             SELECT $2, done.id, $3, NOW(), $4, 'scan' FROM done
             RETURNING completed_at`,
              [turn.id, task.household_id, childId, points],
            );
            if (completion.rows.length === 0)
              throw new RouteError(409, 'The turn has already moved');
            await dateDoneTurnToday(client, turn.id);
            const next = await passTurn(client, task.household_id, task.id, childId);
            const result: ScanResult = {
              result: 'done',
              taskId: task.id,
              taskName: task.name,
              assignmentId: turn.id,
              pointsEarned: points,
              completedAt: new Date(completion.rows[0].completed_at).toISOString(),
              nextChildName: next?.name ?? null,
            };
            return { result, completedAssignmentId: turn.id };
          }

          const result: ScanResult = {
            result: 'not_your_turn',
            taskId: task.id,
            taskName: task.name,
            points,
            turnChildName: turn?.name ?? null,
            youAreNext:
              !!childId &&
              !!turn &&
              nextInLine(
                (await turnOrder(client, task.id)).map((c) => c.childId),
                turn.child_id,
              ) === childId,
          };
          return { result, completedAssignmentId: null };
        });

        if (outcome.completedAssignmentId) {
          const assignmentId = outcome.completedAssignmentId;
          pushService
            .notifyAssignmentDone(assignmentId, userId)
            .catch((err) => fastify.log.error({ err, assignmentId }, 'Done notification failed'));
        }
        return reply.send(outcome.result);
      } catch (error) {
        if (error instanceof RouteError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        fastify.log.error(error, 'Scan failed');
        return reply.code(500).send({ error: 'Scan failed' });
      }
    },
  );
}
