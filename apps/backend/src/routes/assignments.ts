import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser } from '../middleware/auth.js';
import { validateHouseholdMembership } from '../middleware/household-membership.js';
import { pool } from '../database.js';
import { generateAssignments } from '../services/assignment-generator.js';
import { withTransaction, validateBody, validateParams, validateQuery } from '../utils/index.js';
import {
  getChildTasksSchema,
  getHouseholdAssignmentsSchema,
  completeAssignmentSchema,
  postCompleteAssignmentSchema,
  reassignTaskSchema,
  generateAssignmentsSchema,
  generateHouseholdAssignmentsSchema,
  createManualAssignmentSchema,
} from '../schemas/assignments.js';
import {
  uuidSchema,
  dateSchema,
  generateAssignmentsBodySchema,
  viewAssignmentsQuerySchema,
  createManualAssignmentBodySchema,
  reassignAssignmentBodySchema,
  householdIdParamSchema,
} from '../schemas/validation.js';

/**
 * Custom error for transaction validation failures
 * Used to trigger rollback and return specific HTTP responses
 */
class TransactionValidationError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'TransactionValidationError';
  }
}

// Schema for assignment ID param
const assignmentIdParamSchema = z.object({
  assignmentId: uuidSchema,
});

// Schema for child ID param
const childIdParamSchema = z.object({
  childId: uuidSchema,
});

// Schema for child tasks query
const childTasksQuerySchema = z.object({
  date: dateSchema.optional(),
  status: z.enum(['pending', 'completed', 'overdue']).optional(),
});

// Schema for household assignments query
const householdAssignmentsQuerySchema = z.object({
  date: dateSchema.optional(),
  days: z.coerce.number().int().positive().max(30).optional(),
  childId: uuidSchema.optional(),
  status: z.enum(['pending', 'completed', 'overdue']).optional(),
});

// Schema for generate household assignments body
const generateHouseholdAssignmentsBodySchema = z.object({
  date: dateSchema.optional(),
  taskId: uuidSchema.optional(),
});

// Type interfaces (validation is done via Zod schemas)
interface GenerateAssignmentsBody {
  householdId: string;
  startDate: string;
  days: number;
}

interface Assignment {
  id: string;
  task_id: string;
  task_name: string;
  child_id: string | null;
  child_name: string | null;
  date: string;
  status: string;
  created_at: string;
}

export default async function assignmentRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/admin/tasks/generate-assignments
   * Manually trigger assignment generation for a household
   */
  fastify.post<{ Body: GenerateAssignmentsBody }>(
    '/api/admin/tasks/generate-assignments',
    {
      schema: generateAssignmentsSchema,
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      try {
        // Validate body with Zod schema
        const { householdId, startDate, days } = validateBody(
          generateAssignmentsBodySchema,
          request,
        );

        // Authorization: Check household membership
        const membershipResult = await pool.query(
          'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
          [householdId, request.user?.userId],
        );

        if (membershipResult.rows.length === 0) {
          return reply.code(403).send({
            error: 'You are not a member of this household',
          });
        }

        const role = membershipResult.rows[0].role;

        // Must be admin or parent role
        if (role !== 'admin' && role !== 'parent') {
          return reply.code(403).send({
            error: 'Admin or parent role required for this action',
          });
        }

        // Call assignment generator service
        const startDateObj = new Date(startDate);
        const result = await generateAssignments(householdId, startDateObj, days);

        return reply.code(200).send({
          success: true,
          result: {
            created: result.created,
            skipped: result.skipped,
            errors: result.errors,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation failed',
            details: error.issues.map((e) => ({ path: e.path.join('.'), message: e.message })),
          });
        }
        fastify.log.error(error, 'Failed to generate assignments');
        return reply.code(500).send({
          error: 'Failed to generate assignments',
        });
      }
    },
  );

  /**
   * POST /api/households/:householdId/assignments/generate
   * Generate assignments for a household for a specific date (defaults to today)
   */
  fastify.post<{
    Params: { householdId: string };
    Body: { date?: string; taskId?: string };
  }>(
    '/api/households/:householdId/assignments/generate',
    {
      schema: generateHouseholdAssignmentsSchema,
      preHandler: [authenticateUser, validateHouseholdMembership],
    },
    async (request, reply) => {
      try {
        // Validate params with Zod schema
        const { householdId } = validateParams(householdIdParamSchema, request);

        // Validate body with Zod schema (optional fields)
        const { date, taskId } = validateBody(generateHouseholdAssignmentsBodySchema, request);

        // Default date to today if not provided
        const targetDate = date || new Date().toISOString().split('T')[0];

        // Authorization already handled by validateHouseholdMembership middleware
        // Additional check: Must be admin or parent role
        const membershipResult = await pool.query(
          'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
          [householdId, request.user?.userId],
        );

        if (membershipResult.rows.length === 0) {
          return reply.code(403).send({
            error: 'You are not a member of this household',
          });
        }

        const role = membershipResult.rows[0].role;

        // Must be admin or parent role
        if (role !== 'admin' && role !== 'parent') {
          return reply.code(403).send({
            error: 'Admin or parent role required for this action',
          });
        }

        // Call assignment generator service
        const startDateObj = new Date(targetDate);
        const result = await generateAssignments(householdId, startDateObj, 1);

        // Fetch generated assignments to return in response
        const assignmentsResult = await pool.query<{
          id: string;
          task_id: string;
          child_id: string | null;
          date: string;
          status: string;
        }>(
          `SELECT id, task_id, child_id, date::text as date, status
           FROM task_assignments
           WHERE household_id = $1 AND date = $2
           ${taskId ? 'AND task_id = $3' : ''}
           ORDER BY created_at DESC`,
          taskId ? [householdId, targetDate, taskId] : [householdId, targetDate],
        );

        // Transform to camelCase for response
        const assignments = assignmentsResult.rows.map((row) => ({
          id: row.id,
          taskId: row.task_id,
          childId: row.child_id,
          date: row.date,
          status: row.status,
        }));

        return reply.code(200).send({
          generated: result.created,
          assignments,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation failed',
            details: error.issues.map((e) => ({ path: e.path.join('.'), message: e.message })),
          });
        }
        fastify.log.error(error, 'Failed to generate assignments');
        return reply.code(500).send({
          error: 'Failed to generate assignments',
        });
      }
    },
  );

  /**
   * POST /api/assignments/manual
   * Manually create a task assignment for a specific task, child, and date
   */
  fastify.post<{
    Body: { taskId: string; childId?: string | null; date: string };
  }>(
    '/api/assignments/manual',
    {
      schema: createManualAssignmentSchema,
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      try {
        // Validate body with Zod schema
        const { taskId, childId, date } = validateBody(createManualAssignmentBodySchema, request);
        // Fetch task to verify it exists and get household_id
        const taskResult = await pool.query(
          'SELECT id, household_id, name, active FROM tasks WHERE id = $1',
          [taskId],
        );

        if (taskResult.rows.length === 0) {
          return reply.code(404).send({
            error: 'Task not found',
          });
        }

        const task = taskResult.rows[0];

        // Check if task is active
        if (!task.active) {
          return reply.code(400).send({
            error: 'Cannot assign inactive task',
          });
        }

        // Authorization: Check if user is member of task's household with parent/admin role
        const membershipResult = await pool.query(
          'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
          [task.household_id, request.user?.userId],
        );

        if (membershipResult.rows.length === 0) {
          return reply.code(403).send({
            error: 'You are not a member of this household',
          });
        }

        const role = membershipResult.rows[0].role;

        // Must be admin or parent role
        if (role !== 'admin' && role !== 'parent') {
          return reply.code(403).send({
            error: 'Admin or parent role required for manual assignment',
          });
        }

        // If childId is provided, verify child exists and belongs to same household
        if (childId) {
          const childResult = await pool.query(
            'SELECT id FROM children WHERE id = $1 AND household_id = $2',
            [childId, task.household_id],
          );

          if (childResult.rows.length === 0) {
            return reply.code(404).send({
              error: 'Child not found in this household',
            });
          }
        }

        // Create the assignment (ON CONFLICT handles idempotency)
        const insertResult = await pool.query<{
          id: string;
          task_id: string;
          child_id: string | null;
          date: string;
          status: string;
          created_at: string;
        }>(
          `INSERT INTO task_assignments (household_id, task_id, child_id, date, status)
           VALUES ($1, $2, $3, $4, 'pending')
           ON CONFLICT (task_id, child_id, date) WHERE child_id IS NOT NULL DO NOTHING
           RETURNING id, task_id, child_id, date::text as date, status, created_at::text as created_at`,
          [task.household_id, taskId, childId || null, date],
        );

        // Handle duplicate (conflict)
        if (insertResult.rows.length === 0) {
          // Check for household-wide conflict if childId is null
          if (!childId) {
            const conflictCheck = await pool.query(
              'SELECT id FROM task_assignments WHERE task_id = $1 AND date = $2 AND child_id IS NULL',
              [taskId, date],
            );

            if (conflictCheck.rows.length > 0) {
              return reply.code(409).send({
                error: 'Assignment already exists for this task and date',
              });
            }
          }

          return reply.code(409).send({
            error: 'Assignment already exists for this task, child, and date',
          });
        }

        const assignment = insertResult.rows[0];

        return reply.code(201).send({
          assignment: {
            id: assignment.id,
            taskId: assignment.task_id,
            childId: assignment.child_id,
            date: assignment.date,
            status: assignment.status,
            createdAt: assignment.created_at,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation failed',
            details: error.issues.map((e) => ({ path: e.path.join('.'), message: e.message })),
          });
        }
        fastify.log.error(error, 'Failed to create manual assignment');
        return reply.code(500).send({
          error: 'Failed to create assignment',
        });
      }
    },
  );

  /**
   * GET /api/children/:childId/tasks
   * Query tasks for a specific child
   */
  fastify.get<{
    Params: { childId: string };
    Querystring: { date?: string; status?: string };
  }>(
    '/api/children/:childId/tasks',
    {
      schema: getChildTasksSchema,
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      try {
        // Validate params with Zod schema
        const { childId } = validateParams(childIdParamSchema, request);

        // Validate query with Zod schema
        const queryData = validateQuery(childTasksQuerySchema, request);
        let { date, status } = queryData;

        // Check if child exists and get household_id
        const childResult = await pool.query('SELECT household_id FROM children WHERE id = $1', [
          childId,
        ]);

        if (childResult.rows.length === 0) {
          return reply.code(404).send({
            error: 'Child not found',
          });
        }

        const childHouseholdId = childResult.rows[0].household_id;

        // Authorization: Check if user is member of child's household
        const membershipResult = await pool.query(
          'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
          [childHouseholdId, request.user?.userId],
        );

        if (membershipResult.rows.length === 0) {
          return reply.code(403).send({
            error: "You are not authorized to view this child's tasks",
          });
        }

        // Default date to today if not provided
        if (!date) {
          const today = new Date();
          date = today.toISOString().split('T')[0]; // YYYY-MM-DD
        }

        // Build query with optional status filter
        let query = `
          SELECT
            ta.id,
            ta.task_id,
            t.name as title,
            t.description,
            t.rule_type,
            ta.date::text as date,
            ta.status,
            tc.completed_at::text as completed_at
          FROM task_assignments ta
          JOIN tasks t ON ta.task_id = t.id
          LEFT JOIN task_completions tc ON ta.id = tc.task_assignment_id
          WHERE ta.child_id = $1 AND ta.date = $2
        `;

        const queryParams: (string | undefined)[] = [childId, date];

        if (status) {
          query += ' AND ta.status = $3';
          queryParams.push(status);
        }

        query += ' ORDER BY t.name';

        const result = await pool.query(query, queryParams);

        // Transform to expected response format (camelCase to match @st44/types Assignment schema)
        const assignments = result.rows.map((row) => ({
          id: row.id,
          taskId: row.task_id,
          childId: childId, // From request params
          title: row.title,
          description: row.description,
          ruleType: row.rule_type,
          date: row.date,
          status: row.status,
          completedAt: row.completed_at || null,
        }));

        return reply.code(200).send({
          assignments,
          total: assignments.length,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation failed',
            details: error.issues.map((e) => ({ path: e.path.join('.'), message: e.message })),
          });
        }
        fastify.log.error(error, 'Failed to fetch child tasks');
        return reply.code(500).send({
          error: 'Failed to fetch tasks',
        });
      }
    },
  );

  /**
   * GET /api/households/:householdId/assignments
   * View assignments for a household (updated to support new query params)
   */
  fastify.get<{
    Params: { householdId: string };
    Querystring: { date?: string; days?: string; childId?: string; status?: string };
  }>(
    '/api/households/:householdId/assignments',
    {
      schema: getHouseholdAssignmentsSchema,
      preHandler: [authenticateUser, validateHouseholdMembership],
    },
    async (request, reply) => {
      try {
        // Validate params and query with Zod schemas
        const { householdId } = validateParams(householdIdParamSchema, request);
        const queryData = validateQuery(householdAssignmentsQuerySchema, request);
        let { date, days, childId, status } = queryData;

        // Default date to today
        if (!date) {
          const today = new Date();
          date = today.toISOString().split('T')[0]; // YYYY-MM-DD
        }

        // Default to 7 days if not provided
        const daysNum = days ?? 7;

        // Calculate end date
        const startDate = new Date(date);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + daysNum - 1);
        const endDateStr = endDate.toISOString().split('T')[0];

        // Build dynamic query with optional filters
        let query = `
          SELECT
            ta.id,
            ta.task_id,
            t.name as title,
            t.description,
            t.rule_type,
            ta.child_id,
            c.name as child_name,
            ta.date::text as date,
            ta.status,
            tc.completed_at::text as completed_at,
            ta.created_at::text as created_at
          FROM task_assignments ta
          JOIN tasks t ON ta.task_id = t.id
          LEFT JOIN children c ON ta.child_id = c.id
          LEFT JOIN task_completions tc ON ta.id = tc.task_assignment_id
          WHERE t.household_id = $1
        `;

        const queryParams: (string | undefined)[] = [householdId];
        let paramIndex = 2;

        // Add date range filter (always present now with default of 7 days)
        query += ` AND ta.date >= $${paramIndex} AND ta.date <= $${paramIndex + 1}`;
        queryParams.push(date, endDateStr);
        paramIndex += 2;

        // Add optional childId filter
        if (childId) {
          query += ` AND ta.child_id = $${paramIndex}`;
          queryParams.push(childId);
          paramIndex += 1;
        }

        // Add optional status filter
        if (status) {
          query += ` AND ta.status = $${paramIndex}`;
          queryParams.push(status);
          paramIndex += 1;
        }

        query += ' ORDER BY ta.date ASC, c.name ASC, t.name ASC';

        const result = await pool.query(query, queryParams);

        // Transform to expected response format (camelCase to match @st44/types Assignment schema)
        const assignments = result.rows.map((row) => ({
          id: row.id,
          taskId: row.task_id,
          title: row.title,
          description: row.description,
          ruleType: row.rule_type,
          childId: row.child_id,
          childName: row.child_name,
          date: row.date,
          status: row.status,
          completedAt: row.completed_at || null,
          createdAt: row.created_at,
        }));

        return reply.code(200).send({
          assignments,
          total: assignments.length,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation failed',
            details: error.issues.map((e) => ({ path: e.path.join('.'), message: e.message })),
          });
        }
        fastify.log.error(error, 'Failed to fetch assignments');
        return reply.code(500).send({
          error: 'Failed to fetch assignments',
        });
      }
    },
  );

  /**
   * PUT /api/assignments/:assignmentId/complete
   * Mark a task assignment as complete
   */
  fastify.put<{
    Params: { assignmentId: string };
    Body?: { note?: string };
  }>(
    '/api/assignments/:assignmentId/complete',
    {
      schema: completeAssignmentSchema,
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      try {
        // Validate params with Zod schema
        const { assignmentId } = validateParams(assignmentIdParamSchema, request);
        // Fetch assignment with household_id for authorization
        const assignmentResult = await pool.query(
          `SELECT ta.id, ta.household_id, ta.child_id, ta.status, ta.task_id
           FROM task_assignments ta
           WHERE ta.id = $1`,
          [assignmentId],
        );

        if (assignmentResult.rows.length === 0) {
          return reply.code(404).send({
            error: 'Assignment not found',
          });
        }

        const assignment = assignmentResult.rows[0];

        // Check if already completed
        if (assignment.status === 'completed') {
          return reply.code(400).send({
            error: 'Assignment is already completed',
          });
        }

        // Check if status is pending
        if (assignment.status !== 'pending') {
          return reply.code(400).send({
            error: 'Only pending assignments can be completed',
          });
        }

        // Authorization: Check if user is parent in household OR the assigned child
        const membershipResult = await pool.query(
          'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
          [assignment.household_id, request.user?.userId],
        );

        if (membershipResult.rows.length === 0) {
          return reply.code(403).send({
            error: 'You are not authorized to complete this assignment',
          });
        }

        const userRole = membershipResult.rows[0].role;
        const isParent = userRole === 'admin' || userRole === 'parent';

        // For child role, verify they are the assigned child
        // SECURITY: Child can only complete tasks assigned to their child profile
        if (!isParent && userRole === 'child') {
          if (!assignment.child_id) {
            return reply.code(403).send({
              error: 'Only parents can complete household-wide tasks',
            });
          }

          // Verify the assignment belongs to the child linked to this user
          const childResult = await pool.query(
            'SELECT id FROM children WHERE user_id = $1 AND household_id = $2',
            [request.user?.userId, assignment.household_id],
          );

          if (childResult.rows.length === 0) {
            return reply.code(403).send({
              error: 'Child profile not found for this user',
            });
          }

          const childId = childResult.rows[0].id;

          // SECURITY: Verify assignment is for this child
          if (assignment.child_id !== childId) {
            return reply.code(403).send({
              error: 'You can only complete tasks assigned to you',
            });
          }
        }

        // Mark assignment as complete
        const updateResult = await pool.query(
          `UPDATE task_assignments
           SET status = 'completed'
           WHERE id = $1 AND status = 'pending'
           RETURNING id, status, child_id, task_id`,
          [assignmentId],
        );

        if (updateResult.rows.length === 0) {
          // This shouldn't happen if we checked status above, but handle it
          return reply.code(400).send({
            error: 'Failed to complete assignment - status may have changed',
          });
        }

        const completedAssignment = updateResult.rows[0];

        return reply.code(200).send({
          id: completedAssignment.id,
          status: completedAssignment.status,
          completedAt: new Date().toISOString(),
          childId: completedAssignment.child_id,
          taskId: completedAssignment.task_id,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation failed',
            details: error.issues.map((e) => ({ path: e.path.join('.'), message: e.message })),
          });
        }
        fastify.log.error(error, 'Failed to complete assignment');
        return reply.code(500).send({
          error: 'Failed to complete assignment',
        });
      }
    },
  );

  /**
   * POST /api/assignments/:assignmentId/complete
   * Complete a task assignment (creates task_completion record with points)
   */
  fastify.post<{
    Params: { assignmentId: string };
  }>(
    '/api/assignments/:assignmentId/complete',
    {
      schema: postCompleteAssignmentSchema,
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      try {
        // Validate params with Zod schema
        const { assignmentId } = validateParams(assignmentIdParamSchema, request);
        // Fetch assignment with task details for points and authorization
        const assignmentResult = await pool.query(
          `SELECT ta.id, ta.household_id, ta.child_id, ta.status, ta.task_id, t.points
           FROM task_assignments ta
           JOIN tasks t ON ta.task_id = t.id
           WHERE ta.id = $1`,
          [assignmentId],
        );

        if (assignmentResult.rows.length === 0) {
          return reply.code(404).send({
            error: 'Assignment not found',
          });
        }

        const assignment = assignmentResult.rows[0];

        // Check if already completed (idempotent - return existing completion)
        if (assignment.status === 'completed') {
          const existingCompletion = await pool.query(
            `SELECT id, points_earned, completed_at
             FROM task_completions
             WHERE task_assignment_id = $1`,
            [assignmentId],
          );

          if (existingCompletion.rows.length > 0) {
            const completion = existingCompletion.rows[0];
            return reply.code(200).send({
              taskAssignment: {
                id: assignment.id,
                status: 'completed',
                completedAt: completion.completed_at,
              },
              completion: {
                id: completion.id,
                pointsEarned: completion.points_earned,
                completedAt: completion.completed_at,
              },
            });
          }
        }

        // Check if status is pending
        if (assignment.status !== 'pending') {
          return reply.code(400).send({
            error: 'Only pending assignments can be completed',
          });
        }

        // Authorization: Check if user is member of household
        const membershipResult = await pool.query(
          'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
          [assignment.household_id, request.user?.userId],
        );

        if (membershipResult.rows.length === 0) {
          return reply.code(403).send({
            error: 'You are not authorized to complete this assignment',
          });
        }

        const userRole = membershipResult.rows[0].role;

        // If user is a child, verify they own this assignment
        if (userRole === 'child') {
          if (!assignment.child_id) {
            return reply.code(403).send({
              error: 'Only parents can complete household-wide tasks',
            });
          }

          // Verify the assignment belongs to the child linked to this user
          const childResult = await pool.query(
            'SELECT id FROM children WHERE user_id = $1 AND household_id = $2',
            [request.user?.userId, assignment.household_id],
          );

          if (childResult.rows.length === 0) {
            return reply.code(403).send({
              error: 'Child profile not found for this user',
            });
          }

          const childId = childResult.rows[0].id;

          // SECURITY: Verify assignment is for this child
          if (assignment.child_id !== childId) {
            return reply.code(403).send({
              error: 'You can only complete tasks assigned to you',
            });
          }
        }

        // Use transaction to ensure atomicity
        const result = await withTransaction(pool, async (client) => {
          // Update assignment status
          const updateResult = await client.query(
            `UPDATE task_assignments
             SET status = 'completed'
             WHERE id = $1 AND status = 'pending'
             RETURNING id, status, child_id, task_id`,
            [assignmentId],
          );

          if (updateResult.rows.length === 0) {
            throw new TransactionValidationError(
              400,
              'Failed to complete assignment - status may have changed',
            );
          }

          const completedAssignment = updateResult.rows[0];
          const completedAt = new Date();

          // Insert task completion record with points
          const completionResult = await client.query(
            `INSERT INTO task_completions (household_id, task_assignment_id, child_id, completed_at, points_earned)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, points_earned, completed_at`,
            [
              assignment.household_id,
              assignmentId,
              completedAssignment.child_id,
              completedAt,
              assignment.points,
            ],
          );

          const completion = completionResult.rows[0];

          return {
            taskAssignment: {
              id: completedAssignment.id,
              status: 'completed' as const,
              completedAt: completion.completed_at,
            },
            completion: {
              id: completion.id,
              pointsEarned: completion.points_earned,
              completedAt: completion.completed_at,
            },
          };
        });

        return reply.code(200).send(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation failed',
            details: error.issues.map((e) => ({ path: e.path.join('.'), message: e.message })),
          });
        }
        if (error instanceof TransactionValidationError) {
          return reply.code(error.statusCode).send({
            error: error.message,
          });
        }
        fastify.log.error(error, 'Failed to complete assignment');
        return reply.code(500).send({
          error: 'Failed to complete assignment',
        });
      }
    },
  );

  /**
   * PUT /api/assignments/:assignmentId/reassign
   * Reassign task to a different child
   */
  fastify.put<{
    Params: { assignmentId: string };
    Body: { childId: string };
  }>(
    '/api/assignments/:assignmentId/reassign',
    {
      schema: reassignTaskSchema,
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      try {
        // Validate params and body with Zod schemas
        const { assignmentId } = validateParams(assignmentIdParamSchema, request);
        const { childId } = validateBody(reassignAssignmentBodySchema, request);
        // Fetch assignment with household_id
        const assignmentResult = await pool.query(
          `SELECT ta.id, ta.household_id, ta.child_id, ta.status
           FROM task_assignments ta
           WHERE ta.id = $1`,
          [assignmentId],
        );

        if (assignmentResult.rows.length === 0) {
          return reply.code(404).send({
            error: 'Assignment not found',
          });
        }

        const assignment = assignmentResult.rows[0];

        // Check if already completed
        if (assignment.status === 'completed') {
          return reply.code(400).send({
            error: 'Cannot reassign completed assignment',
          });
        }

        // Check if status is pending
        if (assignment.status !== 'pending') {
          return reply.code(400).send({
            error: 'Only pending assignments can be reassigned',
          });
        }

        // Authorization: Must be parent (admin or parent role)
        const membershipResult = await pool.query(
          'SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2',
          [assignment.household_id, request.user?.userId],
        );

        if (membershipResult.rows.length === 0) {
          return reply.code(403).send({
            error: 'You are not authorized to reassign this assignment',
          });
        }

        const userRole = membershipResult.rows[0].role;
        const isParent = userRole === 'admin' || userRole === 'parent';

        if (!isParent) {
          return reply.code(403).send({
            error: 'Only parents can reassign tasks',
          });
        }

        // Verify new child exists and belongs to same household
        const childResult = await pool.query(
          'SELECT id, name FROM children WHERE id = $1 AND household_id = $2',
          [childId, assignment.household_id],
        );

        if (childResult.rows.length === 0) {
          return reply.code(404).send({
            error: 'Child not found in this household',
          });
        }

        const newChild = childResult.rows[0];

        // Reassign to new child
        const updateResult = await pool.query(
          `UPDATE task_assignments
           SET child_id = $2
           WHERE id = $1 AND status = 'pending'
           RETURNING id, child_id`,
          [assignmentId, childId],
        );

        if (updateResult.rows.length === 0) {
          return reply.code(400).send({
            error: 'Failed to reassign - assignment may have been completed',
          });
        }

        return reply.code(200).send({
          id: updateResult.rows[0].id,
          childId: updateResult.rows[0].child_id,
          childName: newChild.name,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation failed',
            details: error.issues.map((e) => ({ path: e.path.join('.'), message: e.message })),
          });
        }
        fastify.log.error(error, 'Failed to reassign assignment');
        return reply.code(500).send({
          error: 'Failed to reassign assignment',
        });
      }
    },
  );
}
