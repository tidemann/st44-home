/**
 * OpenAPI schemas for task template endpoints
 * Uses snake_case for all property names
 */

import { uuidSchema, errorResponseSchema, stripResponseValidation } from './common.js';

const ruleConfigSchema = {
  type: 'object',
  properties: {
    rotation_type: {
      type: 'string',
      enum: ['odd_even_week', 'alternating'],
      description: 'Type of rotation for weekly_rotation tasks',
    },
    repeat_days: {
      type: 'array',
      items: { type: 'number', minimum: 0, maximum: 6 },
      description: 'Days of week for repeating tasks (0=Sunday, 6=Saturday)',
    },
    assigned_children: {
      type: 'array',
      items: uuidSchema,
      description: 'Child IDs for task assignment',
    },
  },
} as const;

const taskSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    household_id: uuidSchema,
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    points: { type: 'number', minimum: 0, maximum: 1000 },
    rule_type: {
      type: 'string',
      enum: ['daily', 'repeating', 'weekly_rotation'],
    },
    rule_config: { ...ruleConfigSchema, nullable: true },
    is_active: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'household_id', 'name', 'rule_type', 'is_active'],
} as const;

// GET /api/households/:householdId/tasks
const listTasksSchemaBase = {
  summary: 'List all task templates for household',
  description: 'Get all task templates, optionally filtered by active status',
  tags: ['tasks'],
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
      active: {
        type: 'string',
        enum: ['true', 'false'],
        description: 'Filter by active status',
      },
    },
  },
  response: {
    200: {
      description: 'List of task templates',
      type: 'array',
      items: taskSchema,
    },
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// POST /api/households/:householdId/tasks
const createTaskSchemaBase = {
  summary: 'Create new task template',
  description: 'Create a task template with assignment rules',
  tags: ['tasks'],
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
      description: { type: 'string', nullable: true },
      points: { type: 'number', minimum: 0, maximum: 1000, default: 0 },
      rule_type: {
        type: 'string',
        enum: ['daily', 'repeating', 'weekly_rotation'],
      },
      rule_config: ruleConfigSchema,
    },
    required: ['name', 'rule_type'],
  },
  response: {
    201: {
      description: 'Task created successfully',
      ...taskSchema,
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// PUT /api/tasks/:taskId
const updateTaskSchemaBase = {
  summary: 'Update task template',
  description: 'Update task template properties',
  tags: ['tasks'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      taskId: { type: 'number' },
    },
    required: ['taskId'],
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      description: { type: 'string', nullable: true },
      points: { type: 'number', minimum: 0, maximum: 1000 },
      rule_type: {
        type: 'string',
        enum: ['daily', 'repeating', 'weekly_rotation'],
      },
      rule_config: ruleConfigSchema,
    },
  },
  response: {
    200: {
      description: 'Task updated successfully',
      ...taskSchema,
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// DELETE /api/tasks/:taskId
const deleteTaskSchemaBase = {
  summary: 'Delete task template',
  description: 'Soft delete a task template (sets is_active to false)',
  tags: ['tasks'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      taskId: { type: 'number' },
    },
    required: ['taskId'],
  },
  response: {
    200: {
      description: 'Task deleted successfully',
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


// Export schemas with conditional response validation stripping
export const listTasksSchema = stripResponseValidation(listTasksSchemaBase);
export const createTaskSchema = stripResponseValidation(createTaskSchemaBase);
export const updateTaskSchema = stripResponseValidation(updateTaskSchemaBase);
export const deleteTaskSchema = stripResponseValidation(deleteTaskSchemaBase);
