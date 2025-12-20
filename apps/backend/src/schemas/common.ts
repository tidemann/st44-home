/**
 * Common OpenAPI schemas used across multiple endpoints
 * All schemas use snake_case for consistency with PostgreSQL and API conventions
 */

export const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
  required: ['error'],
} as const;

export const uuidSchema = {
  type: 'string',
  format: 'uuid',
  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
} as const;

export const dateSchema = {
  type: 'string',
  format: 'date',
  pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  example: '2025-12-20',
} as const;

export const timestampSchema = {
  type: 'string',
  format: 'date-time',
  example: '2025-12-20T13:30:00Z',
} as const;
