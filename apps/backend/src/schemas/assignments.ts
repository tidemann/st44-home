/**
 * OpenAPI schemas for assignment-related endpoints
 * These schemas enforce snake_case convention for all API responses
 */

import { uuidSchema, dateSchema, timestampSchema, errorResponseSchema, stripResponseValidation } from './common.js';

const taskAssignmentSchemaBase = {
  type: 'object',
  properties: {
    id: uuidSchema,
    task_id: { type: 'number' },
    child_id: { type: 'number' },
    title: { type: 'string' },
    description: { type: 'string', nullable: true },
    rule_type: {
      type: 'string',
      enum: ['daily', 'repeating', 'weekly_odd_even', 'alternating'],
    },
    date: dateSchema,
    status: {
      type: 'string',
      enum: ['pending', 'completed', 'overdue'],
    },
    completed_at: { ...timestampSchema, nullable: true },
  },
  required: ['id', 'task_id', 'child_id', 'title', 'rule_type', 'date', 'status'],
} as const;

// GET /api/children/:childId/tasks
const getChildTasksSchemaBase = {
  summary: 'Get tasks for a specific child',
  description: 'Retrieve task assignments for a child, optionally filtered by date and status',
  tags: ['assignments'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      childId: { type: 'number', description: 'Child ID' },
    },
    required: ['childId'],
  },
  querystring: {
    type: 'object',
    properties: {
      date: { ...dateSchema, description: 'Filter by specific date (default: today)' },
      status: {
        type: 'string',
        enum: ['pending', 'completed'],
        description: 'Filter by assignment status',
      },
    },
  },
  response: {
    200: {
      description: 'List of task assignments for the child',
      type: 'object',
      properties: {
        assignments: {
          type: 'array',
          items: taskAssignmentSchemaBase,
        },
        total: { type: 'number' },
      },
      required: ['assignments', 'total'],
    },
    400: {
      description: 'Invalid request parameters',
      ...errorResponseSchema,
    },
    401: {
      description: 'Unauthorized - invalid or missing token',
      ...errorResponseSchema,
    },
    403: {
      description: "Forbidden - not authorized to view this child's tasks",
      ...errorResponseSchema,
    },
    500: {
      description: 'Server error',
      ...errorResponseSchema,
    },
  },
} as const;

// GET /api/households/:householdId/assignments
const getHouseholdAssignmentsSchemaBase = {
  summary: 'Get all assignments for a household',
  description: 'Retrieve all task assignments for a household with optional filters',
  tags: ['assignments'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      householdId: uuidSchema,
    },
    required: ['householdId'],
  },
  querystring: {
    type: 'object',
    properties: {
      date: { ...dateSchema, description: 'Start date for assignments (default: today)' },
      days: {
        type: 'number',
        minimum: 1,
        maximum: 30,
        description: 'Number of days to fetch (default: 7)',
      },
      childId: { ...uuidSchema, description: 'Filter by specific child' },
      status: {
        type: 'string',
        enum: ['pending', 'completed', 'overdue'],
        description: 'Filter by assignment status',
      },
    },
  },
  response: {
    200: {
      description: 'List of household assignments',
      type: 'object',
      properties: {
        assignments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: uuidSchema,
              task_id: { type: 'number' },
              title: { type: 'string' },
              description: { type: 'string', nullable: true },
              child_id: { ...uuidSchema, nullable: true },
              child_name: { type: 'string', nullable: true },
              date: dateSchema,
              status: {
                type: 'string',
                enum: ['pending', 'completed', 'overdue'],
              },
              completed_at: { ...timestampSchema, nullable: true },
            },
          },
        },
        total: { type: 'number' },
      },
      required: ['assignments', 'total'],
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// PUT /api/assignments/:assignmentId/complete
const completeAssignmentSchemaBase = {
  summary: 'Mark task assignment as complete',
  description: 'Complete a pending task assignment',
  tags: ['assignments'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      assignmentId: uuidSchema,
    },
    required: ['assignmentId'],
  },
  response: {
    200: {
      description: 'Assignment completed successfully',
      type: 'object',
      properties: {
        id: uuidSchema,
        status: { type: 'string', enum: ['completed'] },
        completed_at: timestampSchema,
        child_id: { type: 'number' },
        task_id: { type: 'number' },
      },
      required: ['id', 'status', 'completed_at', 'task_id'],
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// PUT /api/assignments/:assignmentId/reassign
const reassignTaskSchemaBase = {
  summary: 'Reassign task to a different child',
  description: 'Change which child is assigned to a task',
  tags: ['assignments'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      assignmentId: uuidSchema,
    },
    required: ['assignmentId'],
  },
  body: {
    type: 'object',
    properties: {
      childId: { type: 'number', description: 'New child ID to assign the task to' },
    },
    required: ['childId'],
  },
  response: {
    200: {
      description: 'Task reassigned successfully',
      type: 'object',
      properties: {
        id: uuidSchema,
        child_id: { type: 'number' },
        child_name: { type: 'string' },
        task_id: { type: 'number' },
      },
      required: ['id', 'child_id', 'task_id'],
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// POST /api/admin/tasks/generate-assignments
const generateAssignmentsSchemaBase = {
  summary: 'Manually trigger assignment generation',
  description: 'Generate task assignments for a household for a specified date range',
  tags: ['assignments'],
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    properties: {
      householdId: uuidSchema,
      startDate: dateSchema,
      days: {
        type: 'number',
        minimum: 1,
        maximum: 30,
        description: 'Number of days to generate assignments for',
      },
    },
    required: ['householdId', 'startDate', 'days'],
  },
  response: {
    200: {
      description: 'Assignments generated successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        result: {
          type: 'object',
          properties: {
            created: { type: 'number' },
            skipped: { type: 'number' },
            errors: { type: 'array', items: { type: 'string' } },
          },
          required: ['created', 'skipped', 'errors'],
        },
      },
      required: ['success', 'result'],
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;


// Export schemas with conditional response validation stripping
export const taskAssignmentSchema = stripResponseValidation(taskAssignmentSchemaBase);
export const getChildTasksSchema = stripResponseValidation(getChildTasksSchemaBase);
export const getHouseholdAssignmentsSchema = stripResponseValidation(getHouseholdAssignmentsSchemaBase);
export const completeAssignmentSchema = stripResponseValidation(completeAssignmentSchemaBase);
export const reassignTaskSchema = stripResponseValidation(reassignTaskSchemaBase);
export const generateAssignmentsSchema = stripResponseValidation(generateAssignmentsSchemaBase);
