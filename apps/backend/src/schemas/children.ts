/**
 * OpenAPI schemas for children endpoints
 * Uses snake_case for all property names
 */

import { uuidSchema, timestampSchema, errorResponseSchema } from './common.js';

const childSchema = {
  type: 'object',
  properties: {
    id: uuidSchema,
    household_id: uuidSchema,
    name: { type: 'string', minLength: 1, maxLength: 255 },
    age: { type: 'number', minimum: 0, maximum: 150, nullable: true },
    avatar_url: { type: 'string', nullable: true },
    created_at: timestampSchema,
  },
  required: ['id', 'household_id', 'name'],
} as const;

// GET /api/households/:householdId/children
export const listChildrenSchema = {
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
export const createChildSchema = {
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
      age: { type: 'number', minimum: 0, maximum: 150, nullable: true },
      avatar_url: { type: 'string', nullable: true },
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
export const updateChildSchema = {
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
      age: { type: 'number', minimum: 0, maximum: 150, nullable: true },
      avatar_url: { type: 'string', nullable: true },
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
export const deleteChildSchema = {
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
