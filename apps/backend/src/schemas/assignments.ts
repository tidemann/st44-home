/**
 * OpenAPI schemas for assignment-related endpoints
 * These schemas enforce snake_case convention for all API responses
 */

import {
  uuidSchema,
  dateSchema,
  timestampSchema,
  errorResponseSchema,
  stripResponseValidation,
} from './common.js';

const taskAssignmentSchemaBase = {
  type: 'object',
  properties: {
    id: uuidSchema,
    taskId: uuidSchema,
    childId: uuidSchema,
    title: { type: 'string' },
    description: { type: 'string', nullable: true },
    ruleType: {
      type: 'string',
      enum: ['daily', 'repeating', 'weekly_odd_even', 'alternating'],
    },
    date: dateSchema,
    status: {
      type: 'string',
      enum: ['pending', 'completed', 'overdue'],
    },
    completedAt: { ...timestampSchema, nullable: true },
  },
  required: ['id', 'taskId', 'childId', 'title', 'ruleType', 'date', 'status'],
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
      childId: { ...uuidSchema, description: 'Child ID' },
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
              taskId: uuidSchema,
              title: { type: 'string' },
              description: { type: 'string', nullable: true },
              ruleType: { type: 'string' },
              childId: { ...uuidSchema, nullable: true },
              childName: { type: 'string', nullable: true },
              date: dateSchema,
              status: {
                type: 'string',
                enum: ['pending', 'completed', 'overdue'],
              },
              completedAt: { ...timestampSchema, nullable: true },
              createdAt: timestampSchema,
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

// PUT /api/assignments/:assignmentId/complete (legacy)
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
        completedAt: timestampSchema,
        childId: uuidSchema,
        taskId: uuidSchema,
      },
      required: ['id', 'status', 'completedAt', 'taskId'],
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// POST /api/assignments/:assignmentId/complete
const postCompleteAssignmentSchemaBase = {
  summary: 'Complete task assignment with points',
  description: 'Complete a pending task assignment and create completion record with points earned',
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
      description: 'Assignment completed successfully with completion record',
      type: 'object',
      properties: {
        taskAssignment: {
          type: 'object',
          properties: {
            id: uuidSchema,
            status: { type: 'string', enum: ['completed'] },
            completedAt: timestampSchema,
          },
          required: ['id', 'status', 'completedAt'],
        },
        completion: {
          type: 'object',
          properties: {
            id: uuidSchema,
            pointsEarned: { type: 'number' },
            completedAt: timestampSchema,
          },
          required: ['id', 'pointsEarned', 'completedAt'],
        },
      },
      required: ['taskAssignment', 'completion'],
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
      childId: { ...uuidSchema, description: 'New child ID to assign the task to' },
    },
    required: ['childId'],
  },
  response: {
    200: {
      description: 'Task reassigned successfully',
      type: 'object',
      properties: {
        id: uuidSchema,
        childId: uuidSchema,
        childName: { type: 'string' },
      },
      required: ['id', 'childId'],
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

// POST /api/households/:householdId/assignments/generate
const generateHouseholdAssignmentsSchemaBase = {
  summary: 'Generate assignments for a household',
  description: 'Generate task assignments for a household for a specific date (defaults to today)',
  tags: ['assignments'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      householdId: uuidSchema,
    },
    required: ['householdId'],
  },
  body: {
    type: 'object',
    properties: {
      date: { ...dateSchema, description: 'Date to generate assignments for (defaults to today)' },
      taskId: {
        ...uuidSchema,
        description:
          'Optional task ID to generate assignments for (if omitted, generates for all active tasks)',
      },
    },
  },
  response: {
    200: {
      description: 'Assignments generated successfully',
      type: 'object',
      properties: {
        generated: { type: 'number', description: 'Number of assignments created' },
        assignments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: uuidSchema,
              taskId: uuidSchema,
              childId: { ...uuidSchema, nullable: true },
              date: dateSchema,
              status: { type: 'string', enum: ['pending'] },
            },
            required: ['id', 'taskId', 'date', 'status'],
          },
        },
      },
      required: ['generated', 'assignments'],
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// POST /api/assignments/manual
const createManualAssignmentSchemaBase = {
  summary: 'Manually create a task assignment',
  description:
    'Create a manual task assignment for a specific task, child, and date (parent role required)',
  tags: ['assignments'],
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    properties: {
      taskId: { ...uuidSchema, description: 'Task ID to assign' },
      childId: {
        ...uuidSchema,
        nullable: true,
        description: 'Child ID to assign to (null for household-wide)',
      },
      date: { ...dateSchema, description: 'Date for the assignment (YYYY-MM-DD)' },
    },
    required: ['taskId', 'date'],
  },
  response: {
    201: {
      description: 'Assignment created successfully',
      type: 'object',
      properties: {
        assignment: {
          type: 'object',
          properties: {
            id: uuidSchema,
            taskId: uuidSchema,
            childId: { ...uuidSchema, nullable: true },
            date: dateSchema,
            status: { type: 'string', enum: ['pending'] },
            createdAt: timestampSchema,
          },
          required: ['id', 'taskId', 'date', 'status', 'createdAt'],
        },
      },
      required: ['assignment'],
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    409: {
      description: 'Conflict - assignment already exists for this task/child/date combination',
      ...errorResponseSchema,
    },
    500: errorResponseSchema,
  },
} as const;

// Export schemas with conditional response validation stripping
// Note: taskAssignmentSchemaBase is just a schema object, not a route schema, so it doesn't need stripping
export const taskAssignmentSchema = taskAssignmentSchemaBase;
export const getChildTasksSchema = stripResponseValidation(getChildTasksSchemaBase);
export const getHouseholdAssignmentsSchema = stripResponseValidation(
  getHouseholdAssignmentsSchemaBase,
);
export const completeAssignmentSchema = stripResponseValidation(completeAssignmentSchemaBase);
export const postCompleteAssignmentSchema = stripResponseValidation(
  postCompleteAssignmentSchemaBase,
);
export const reassignTaskSchema = stripResponseValidation(reassignTaskSchemaBase);
export const generateAssignmentsSchema = stripResponseValidation(generateAssignmentsSchemaBase);
export const generateHouseholdAssignmentsSchema = stripResponseValidation(
  generateHouseholdAssignmentsSchemaBase,
);
export const createManualAssignmentSchema = stripResponseValidation(
  createManualAssignmentSchemaBase,
);
