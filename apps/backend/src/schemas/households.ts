/**
 * OpenAPI schemas for household endpoints
 * Uses snake_case for all property names
 */

import {
  uuidSchema,
  timestampSchema,
  errorResponseSchema,
  stripResponseValidation,
} from './common.js';

const householdSchema = {
  type: 'object',
  properties: {
    id: uuidSchema,
    name: { type: 'string', minLength: 1, maxLength: 255 },
    created_at: timestampSchema,
    updated_at: timestampSchema,
  },
  required: ['id', 'name', 'created_at'],
} as const;

const membershipSchema = {
  type: 'object',
  properties: {
    household_id: uuidSchema,
    user_id: uuidSchema,
    role: {
      type: 'string',
      enum: ['admin', 'parent', 'child'],
    },
    joined_at: timestampSchema,
  },
  required: ['household_id', 'user_id', 'role', 'joined_at'],
} as const;

// GET /api/households
const listHouseholdsSchemaBase = {
  summary: 'List user households',
  description: 'Get all households the authenticated user belongs to',
  tags: ['households'],
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      description: 'List of households with membership info',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ...householdSchema.properties,
          role: { type: 'string', enum: ['admin', 'parent', 'child'] },
        },
      },
    },
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// POST /api/households
const createHouseholdSchemaBase = {
  summary: 'Create new household',
  description: 'Create a household and become its admin',
  tags: ['households'],
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
    },
    required: ['name'],
  },
  response: {
    201: {
      description: 'Household created successfully',
      ...householdSchema,
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// GET /api/households/:householdId
const getHouseholdSchemaBase = {
  summary: 'Get household details',
  description: 'Get detailed information about a specific household',
  tags: ['households'],
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
      description: 'Household details with membership info',
      type: 'object',
      properties: {
        id: uuidSchema,
        name: { type: 'string', minLength: 1, maxLength: 255 },
        role: { type: 'string', enum: ['admin', 'parent', 'child'] },
        memberCount: { type: 'number', minimum: 1 },
        childrenCount: { type: 'number', minimum: 0 },
        createdAt: timestampSchema,
        updatedAt: timestampSchema,
      },
      required: ['id', 'name', 'role', 'memberCount', 'childrenCount', 'createdAt'],
    },
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// PUT /api/households/:householdId
const updateHouseholdSchemaBase = {
  summary: 'Update household',
  description: 'Update household name (admin/parent only)',
  tags: ['households'],
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
    },
    required: ['name'],
  },
  response: {
    200: {
      description: 'Household updated successfully',
      type: 'object',
      properties: {
        id: uuidSchema,
        name: { type: 'string', minLength: 1, maxLength: 255 },
        updatedAt: timestampSchema,
      },
      required: ['id', 'name', 'updatedAt'],
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// DELETE /api/households/:householdId
const deleteHouseholdSchemaBase = {
  summary: 'Delete household',
  description: 'Delete household and all associated data (admin only)',
  tags: ['households'],
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
      description: 'Household deleted successfully',
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

// GET /api/households/:householdId/members
const listMembersSchemaBase = {
  summary: 'List household members',
  description: 'Get all members of a household',
  tags: ['households'],
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
      description: 'List of household members',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          user_id: uuidSchema,
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'parent', 'child'] },
          joined_at: timestampSchema,
        },
      },
    },
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

// Export schemas with conditional response validation stripping
export const listHouseholdsSchema = stripResponseValidation(listHouseholdsSchemaBase);
export const createHouseholdSchema = stripResponseValidation(createHouseholdSchemaBase);
export const getHouseholdSchema = stripResponseValidation(getHouseholdSchemaBase);
export const updateHouseholdSchema = stripResponseValidation(updateHouseholdSchemaBase);
export const deleteHouseholdSchema = stripResponseValidation(deleteHouseholdSchemaBase);
export const listMembersSchema = stripResponseValidation(listMembersSchemaBase);
