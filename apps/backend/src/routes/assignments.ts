import { FastifyInstance } from 'fastify';
import { authenticateUser } from '../middleware/auth.js';
import { validateHouseholdMembership } from '../middleware/household-membership.js';
import { pool } from '../database.js';
import { generateAssignments } from '../services/assignment-generator.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function isValidDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) {
    return false;
  }
  const date = new Date(value);
  return !isNaN(date.getTime());
}

interface GenerateAssignmentsBody {
  householdId: string;
  startDate: string;
  days: number;
}

interface ViewAssignmentsParams {
  householdId: string;
}

interface ViewAssignmentsQuery {
  date?: string;
  days?: string;
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
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      const { householdId, startDate, days } = request.body;

      // Validation: householdId (UUID)
      if (!householdId || typeof householdId !== 'string') {
        return reply.code(400).send({
          error: 'householdId is required',
        });
      }

      if (!isValidUuid(householdId)) {
        return reply.code(400).send({
          error: 'Invalid householdId format (must be UUID)',
        });
      }

      // Validation: startDate (YYYY-MM-DD)
      if (!startDate || typeof startDate !== 'string') {
        return reply.code(400).send({
          error: 'startDate is required',
        });
      }

      if (!isValidDate(startDate)) {
        return reply.code(400).send({
          error: 'Invalid startDate format (must be YYYY-MM-DD)',
        });
      }

      // Validation: days (1-30)
      if (typeof days !== 'number') {
        return reply.code(400).send({
          error: 'days must be a number',
        });
      }

      if (days < 1 || days > 30) {
        return reply.code(400).send({
          error: 'days must be between 1 and 30',
        });
      }

      // Authorization: Check household membership
      try {
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
      } catch (error) {
        fastify.log.error(error, 'Failed to check household membership');
        return reply.code(500).send({
          error: 'Failed to validate household membership',
        });
      }

      // Call assignment generator service
      try {
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
        fastify.log.error(error, 'Failed to generate assignments');
        return reply.code(500).send({
          error: 'Failed to generate assignments',
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
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      const { childId } = request.params;
      let { date, status } = request.query;

      // Validate childId format
      if (!isValidUuid(childId)) {
        return reply.code(400).send({
          error: 'Invalid childId format (must be UUID)',
        });
      }

      // Check if child exists and get household_id
      try {
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

        // Validate date format
        if (!isValidDate(date)) {
          return reply.code(400).send({
            error: 'Invalid date format (must be YYYY-MM-DD)',
          });
        }

        // Validate status if provided
        if (status && !['pending', 'completed', 'overdue'].includes(status)) {
          return reply.code(400).send({
            error: 'Invalid status value (must be pending, completed, or overdue)',
          });
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

        // Transform to expected response format
        const tasks = result.rows.map((row) => ({
          id: row.id,
          taskId: row.task_id,
          title: row.title,
          description: row.description,
          ruleType: row.rule_type,
          date: row.date,
          status: row.status,
          completedAt: row.completed_at || null,
        }));

        return reply.code(200).send({
          tasks,
        });
      } catch (error) {
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
      preHandler: [authenticateUser, validateHouseholdMembership],
    },
    async (request, reply) => {
      const { householdId } = request.params;
      let { date, days, childId, status } = request.query;

      // Validate childId if provided
      if (childId && !isValidUuid(childId)) {
        return reply.code(400).send({
          error: 'Invalid childId format (must be UUID)',
        });
      }

      // Validate status if provided
      if (status && !['pending', 'completed', 'overdue'].includes(status)) {
        return reply.code(400).send({
          error: 'Invalid status value (must be pending, completed, or overdue)',
        });
      }

      // Default date to today
      if (!date) {
        const today = new Date();
        date = today.toISOString().split('T')[0]; // YYYY-MM-DD
      }

      // Validate date format
      if (!isValidDate(date)) {
        return reply.code(400).send({
          error: 'Invalid date format (must be YYYY-MM-DD)',
        });
      }

      // Handle days parameter (for backward compatibility with existing endpoint)
      // Default to 7 days if not provided
      let daysNum = 7;
      if (days) {
        daysNum = parseInt(days, 10);

        if (isNaN(daysNum) || daysNum < 1 || daysNum > 30) {
          return reply.code(400).send({
            error: 'days must be between 1 and 30',
          });
        }
      }

      // Calculate end date
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + daysNum - 1);
      const endDateStr = endDate.toISOString().split('T')[0];

      // Query assignments with joins and optional filters
      try {
        // Build dynamic query with optional filters
        let query = `
          SELECT 
            ta.id,
            ta.task_id,
            t.name as title,
            t.description,
            ta.child_id,
            c.name as child_name,
            ta.date::text as date,
            ta.status,
            tc.completed_at::text as completed_at
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

        // Transform to expected response format (snake_case to match existing API)
        const assignments = result.rows.map((row) => ({
          id: row.id,
          task_id: row.task_id,
          task_name: row.title,
          child_id: row.child_id,
          child_name: row.child_name,
          date: row.date,
          status: row.status,
          completed_at: row.completed_at || null,
        }));

        return reply.code(200).send({
          assignments,
          total: assignments.length,
        });
      } catch (error) {
        fastify.log.error(error, 'Failed to fetch assignments');
        return reply.code(500).send({
          error: 'Failed to fetch assignments',
        });
      }
    },
  );
}
