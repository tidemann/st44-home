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
   * GET /api/households/:householdId/assignments
   * View assignments for a household over a date range
   */
  fastify.get<{ Params: ViewAssignmentsParams; Querystring: ViewAssignmentsQuery }>(
    '/api/households/:householdId/assignments',
    {
      preHandler: [authenticateUser, validateHouseholdMembership],
    },
    async (request, reply) => {
      const { householdId } = request.params;
      let { date, days } = request.query;

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

      // Default days to 7, validate range
      const daysNum = days ? parseInt(days, 10) : 7;

      if (isNaN(daysNum) || daysNum < 1 || daysNum > 30) {
        return reply.code(400).send({
          error: 'days must be between 1 and 30',
        });
      }

      // Calculate end date
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + daysNum - 1);

      const endDateStr = endDate.toISOString().split('T')[0];

      // Query assignments with joins
      try {
        const result = await pool.query<Assignment>(
          `SELECT 
            ta.id,
            ta.task_id,
            t.name as task_name,
            ta.child_id,
            c.name as child_name,
            ta.date::text as date,
            ta.status,
            ta.created_at::text as created_at
          FROM task_assignments ta
          JOIN tasks t ON ta.task_id = t.id
          LEFT JOIN children c ON ta.child_id = c.id
          WHERE t.household_id = $1
            AND ta.date >= $2
            AND ta.date <= $3
          ORDER BY ta.date ASC, c.name ASC`,
          [householdId, date, endDateStr],
        );

        return reply.code(200).send({
          assignments: result.rows,
          total: result.rows.length,
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
