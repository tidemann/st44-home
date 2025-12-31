import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from '@st44/types';
import { db } from '../database.js';
import { authenticateUser } from '../middleware/auth.js';
import {
  validateHouseholdMembership,
  requireHouseholdParent,
} from '../middleware/household-membership.js';
import { TaskResponseRepository } from '../repositories/task-response.repository.js';
import type { TaskRow, TaskAssignmentRow } from '../types/database.js';

/**
 * Single Tasks Routes
 * Handles single task operations: accept, decline, available tasks, failed tasks, etc.
 */

interface HouseholdParams {
  householdId: string;
}

interface TaskParams extends HouseholdParams {
  taskId: string;
}

interface ResponseParams extends TaskParams {
  childId: string;
}

function toDateTimeString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date(String(value)).toISOString();
}

export default async function singleTasksRoutes(fastify: FastifyInstance) {
  const repo = new TaskResponseRepository(db);

  /**
   * POST /api/households/:householdId/tasks/:taskId/accept
   * Child accepts a single task
   */
  fastify.post<{ Params: TaskParams }>(
    '/api/households/:householdId/tasks/:taskId/accept',
    {
      preHandler: [authenticateUser, validateHouseholdMembership],
    },
    async (request, reply) => {
      const { householdId, taskId } = request.params;
      const userId = request.user!.userId;

      // Get child profile for current user
      const childResult = await db.query<{ id: string }>(
        `SELECT id FROM children WHERE household_id = $1 AND user_id = $2`,
        [householdId, userId],
      );

      if (childResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Child profile not found' });
      }

      const childId = childResult.rows[0].id;

      try {
        // Use transaction with row locking to prevent race conditions
        const client = await db.connect();
        try {
          await client.query('BEGIN');

          // Lock the task row
          const taskLock = await client.query<TaskRow>(
            `SELECT id, household_id, name, description, points, rule_type, rule_config, deadline, active, created_at, updated_at
             FROM tasks
             WHERE id = $1 AND household_id = $2 AND rule_type = 'single' AND active = true
             FOR UPDATE`,
            [taskId, householdId],
          );

          if (taskLock.rows.length === 0) {
            await client.query('ROLLBACK');
            return reply.status(404).send({ error: 'Task not found or not a single task' });
          }

          // Check if child is a candidate
          const candidateRepo = new TaskResponseRepository(client);
          const isCandidate = await candidateRepo.isCandidate(taskId, childId);
          if (!isCandidate) {
            await client.query('ROLLBACK');
            return reply.status(403).send({ error: 'You are not a candidate for this task' });
          }

          // Check if task has already been accepted
          const assignmentCheck = await client.query<TaskAssignmentRow>(
            `SELECT id FROM task_assignments
             WHERE task_id = $1 AND status IN ('pending', 'completed')`,
            [taskId],
          );

          if (assignmentCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return reply
              .status(409)
              .send({ error: 'Task has already been accepted by another child' });
          }

          // Create assignment
          const assignmentResult = await client.query<TaskAssignmentRow>(
            `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
             VALUES ($1, $2, $3, CURRENT_DATE, 'pending')
             RETURNING id, household_id, task_id, child_id, date, status, created_at`,
            [householdId, taskId, childId],
          );

          // Record accept response
          await candidateRepo.recordResponse(taskId, childId, householdId, 'accepted');

          await client.query('COMMIT');

          const assignment = assignmentResult.rows[0];
          const task = taskLock.rows[0];

          return reply.status(201).send({
            assignment: {
              id: assignment.id,
              taskId: assignment.task_id,
              childId: assignment.child_id,
              title: task.name,
              description: task.description,
              ruleType: task.rule_type,
              date: assignment.date,
              status: assignment.status,
              createdAt: toDateTimeString(assignment.created_at),
            },
          });
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (error) {
        request.log.error({ error, taskId, childId }, 'Failed to accept task');
        return reply.status(500).send({ error: 'Failed to accept task' });
      }
    },
  );

  /**
   * POST /api/households/:householdId/tasks/:taskId/decline
   * Child declines a single task
   */
  fastify.post<{ Params: TaskParams }>(
    '/api/households/:householdId/tasks/:taskId/decline',
    {
      preHandler: [authenticateUser, validateHouseholdMembership],
    },
    async (request, reply) => {
      const { householdId, taskId } = request.params;
      const userId = request.user!.userId;

      // Get child profile for current user
      const childResult = await db.query<{ id: string }>(
        `SELECT id FROM children WHERE household_id = $1 AND user_id = $2`,
        [householdId, userId],
      );

      if (childResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Child profile not found' });
      }

      const childId = childResult.rows[0].id;

      try {
        // Verify task exists and is a single task
        const taskResult = await db.query<TaskRow>(
          `SELECT id FROM tasks
           WHERE id = $1 AND household_id = $2 AND rule_type = 'single' AND active = true`,
          [taskId, householdId],
        );

        if (taskResult.rows.length === 0) {
          return reply.status(404).send({ error: 'Task not found or not a single task' });
        }

        // Check if child is a candidate
        const isCandidate = await repo.isCandidate(taskId, childId);
        if (!isCandidate) {
          return reply.status(403).send({ error: 'You are not a candidate for this task' });
        }

        // Record decline
        await repo.recordResponse(taskId, childId, householdId, 'declined');

        return reply.status(200).send({ success: true });
      } catch (error) {
        request.log.error({ error, taskId, childId }, 'Failed to decline task');
        return reply.status(500).send({ error: 'Failed to decline task' });
      }
    },
  );

  /**
   * DELETE /api/households/:householdId/tasks/:taskId/responses/:childId
   * Undo a decline (child changes their mind)
   */
  fastify.delete<{ Params: ResponseParams }>(
    '/api/households/:householdId/tasks/:taskId/responses/:childId',
    {
      preHandler: [authenticateUser, validateHouseholdMembership],
    },
    async (request, reply) => {
      const { householdId, taskId, childId } = request.params;
      const userId = request.user!.userId;

      // Verify user owns this child profile
      const childResult = await db.query<{ id: string }>(
        `SELECT id FROM children WHERE id = $1 AND household_id = $2 AND user_id = $3`,
        [childId, householdId, userId],
      );

      if (childResult.rows.length === 0) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      try {
        const deleted = await repo.undoResponse(taskId, childId);

        if (!deleted) {
          return reply.status(404).send({ error: 'No response found to undo' });
        }

        return reply.status(200).send({ success: true });
      } catch (error) {
        request.log.error({ error, taskId, childId }, 'Failed to undo response');
        return reply.status(500).send({ error: 'Failed to undo response' });
      }
    },
  );

  /**
   * GET /api/children/available-tasks
   * Get available single tasks for the current child
   */
  fastify.get(
    '/api/children/available-tasks',
    {
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      const userId = request.user!.userId;

      try {
        // Get child profile and household for current user
        const childResult = await db.query<{ id: string; household_id: string }>(
          `SELECT id, household_id FROM children WHERE user_id = $1 LIMIT 1`,
          [userId],
        );

        if (childResult.rows.length === 0) {
          return reply.status(404).send({ error: 'Child profile not found' });
        }

        const { id: childId, household_id: householdId } = childResult.rows[0];

        const availableTasks = await repo.getAvailableTasksForChild(childId, householdId);

        return reply.status(200).send({ tasks: availableTasks });
      } catch (error) {
        request.log.error({ error }, 'Failed to get available tasks');
        return reply.status(500).send({ error: 'Failed to get available tasks' });
      }
    },
  );

  /**
   * GET /api/households/:householdId/single-tasks/failed
   * Get tasks where all candidates have declined (parent only)
   */
  fastify.get<{ Params: HouseholdParams }>(
    '/api/households/:householdId/single-tasks/failed',
    {
      preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent],
    },
    async (request, reply) => {
      const { householdId } = request.params;

      try {
        const failedTasks = await repo.getFailedTasks(householdId);

        return reply.status(200).send({ tasks: failedTasks });
      } catch (error) {
        request.log.error({ error, householdId }, 'Failed to get failed tasks');
        return reply.status(500).send({ error: 'Failed to get failed tasks' });
      }
    },
  );

  /**
   * GET /api/households/:householdId/single-tasks/expired
   * Get tasks past deadline with no acceptance (parent only)
   */
  fastify.get<{ Params: HouseholdParams }>(
    '/api/households/:householdId/single-tasks/expired',
    {
      preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent],
    },
    async (request, reply) => {
      const { householdId } = request.params;

      try {
        const expiredTasks = await repo.getExpiredTasks(householdId);

        return reply.status(200).send({ tasks: expiredTasks });
      } catch (error) {
        request.log.error({ error, householdId }, 'Failed to get expired tasks');
        return reply.status(500).send({ error: 'Failed to get expired tasks' });
      }
    },
  );

  /**
   * GET /api/households/:householdId/tasks/:taskId/candidates
   * Get list of candidates and their response status (parent only)
   */
  fastify.get<{ Params: TaskParams }>(
    '/api/households/:householdId/tasks/:taskId/candidates',
    {
      preHandler: [authenticateUser, validateHouseholdMembership, requireHouseholdParent],
    },
    async (request, reply) => {
      const { householdId, taskId } = request.params;

      try {
        // Verify task exists and belongs to household
        const taskResult = await db.query<TaskRow>(
          `SELECT id FROM tasks WHERE id = $1 AND household_id = $2 AND rule_type = 'single'`,
          [taskId, householdId],
        );

        if (taskResult.rows.length === 0) {
          return reply.status(404).send({ error: 'Task not found or not a single task' });
        }

        const candidates = await repo.getTaskCandidates(taskId);

        return reply.status(200).send({ candidates });
      } catch (error) {
        request.log.error({ error, taskId }, 'Failed to get task candidates');
        return reply.status(500).send({ error: 'Failed to get task candidates' });
      }
    },
  );
}
