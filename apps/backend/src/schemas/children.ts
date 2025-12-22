/**
 * OpenAPI schemas for children endpoints
 * Uses snake_case for all property names
 */

import {
  uuidSchema,
  timestampSchema,
  errorResponseSchema,
  stripResponseValidation,
} from './common.js';

const childSchema = {
  type: 'object',
  properties: {
    id: uuidSchema,
    household_id: uuidSchema,
    name: { type: 'string', minLength: 1, maxLength: 255 },
    birth_year: { type: 'number', minimum: 1900, maximum: 2100, nullable: true },
    created_at: timestampSchema,
    updated_at: { ...timestampSchema, nullable: true },
  },
  required: ['id', 'household_id', 'name'],
} as const;

// GET /api/households/:householdId/children
const listChildrenSchemaBase = {
  summary: 'List children in household',
  description: 'Get all children profiles for a household',
  tags: ['children'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      householdId: uuidSchema,
    },
    required: ['householdId'],
  },
  response: {
    200: {
      description: 'List of children',
      type: 'array',
      items: childSchema,
    },
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// POST /api/households/:householdId/children
const createChildSchemaBase = {
  summary: 'Create child profile',
  description: 'Add a new child to the household',
  tags: ['children'],
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
      name: { type: 'string', minLength: 1, maxLength: 255 },
      birth_year: { type: 'number', minimum: 1900, maximum: 2100, nullable: true },
    },
    required: ['name'],
  },
  response: {
    201: {
      description: 'Child created successfully',
      ...childSchema,
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// PUT /api/children/:childId
const updateChildSchemaBase = {
  summary: 'Update child profile',
  description: 'Update child information',
  tags: ['children'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      childId: uuidSchema,
    },
    required: ['childId'],
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      birth_year: { type: 'number', minimum: 1900, maximum: 2100, nullable: true },
    },
  },
  response: {
    200: {
      description: 'Child updated successfully',
      ...childSchema,
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// DELETE /api/children/:childId
const deleteChildSchemaBase = {
  summary: 'Delete child profile',
  description: 'Remove a child from the household',
  tags: ['children'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      childId: uuidSchema,
    },
    required: ['childId'],
  },
  response: {
    200: {
      description: 'Child deleted successfully',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// GET /api/children/my-tasks
const getMyTasksSchemaBase = {
  summary: 'Get my tasks for today',
  description:
    'Returns tasks assigned to the authenticated child user for the specified date (defaults to today)',
  tags: ['children'],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      household_id: {
        ...uuidSchema,
        description: 'Household ID (optional, uses current household from membership)',
      },
      date: {
        type: 'string',
        format: 'date',
        description: 'Date to get tasks for (YYYY-MM-DD), defaults to today',
      },
    },
  },
  response: {
    200: {
      description: 'Child tasks for the specified date',
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: uuidSchema,
              task_name: { type: 'string' },
              task_description: { type: 'string', nullable: true },
              points: { type: 'integer' },
              date: { type: 'string', format: 'date' },
              status: { type: 'string', enum: ['pending', 'completed', 'overdue'] },
              completed_at: { ...timestampSchema, nullable: true },
            },
            required: ['id', 'task_name', 'points', 'date', 'status'],
          },
        },
        total_points_today: { type: 'integer' },
        completed_points: { type: 'integer' },
        child_name: { type: 'string' },
      },
      required: ['tasks', 'total_points_today', 'completed_points', 'child_name'],
    },
    401: errorResponseSchema,
    403: {
      description: 'User is not a child in this household',
      ...errorResponseSchema,
    },
    404: {
      description: 'Child profile not found',
      ...errorResponseSchema,
    },
    500: errorResponseSchema,
  },
} as const;

// Export schemas with conditional response validation stripping
export const listChildrenSchema = stripResponseValidation(listChildrenSchemaBase);
export const createChildSchema = stripResponseValidation(createChildSchemaBase);
export const updateChildSchema = stripResponseValidation(updateChildSchemaBase);
export const deleteChildSchema = stripResponseValidation(deleteChildSchemaBase);
export const getMyTasksSchema = stripResponseValidation(getMyTasksSchemaBase);
