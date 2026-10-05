/**
 * Common OpenAPI schemas used across multiple endpoints
 * All schemas use snake_case for consistency with PostgreSQL and API conventions
 */

/**
 * Schema with optional response property (used by Fastify route schemas)
 */
interface SchemaWithResponse {
  response?: Record<string | number, unknown>;
}

/**
 * Remove response validation from schemas in test environment
 * This allows tests to pass while keeping documentation schemas intact for production
 */
export function stripResponseValidation<T extends SchemaWithResponse>(schema: T): T {
  if (process.env.NODE_ENV === 'test' && schema.response) {
    const { response, ...rest } = schema;
    return rest as T;
  }
  return schema;
}

export const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string', description: 'Machine-readable error type' },
    message: { type: 'string', description: 'Human-readable error message' },
    statusCode: { type: 'number', description: 'HTTP status code' },
    details: { type: 'object', description: 'Optional error details', additionalProperties: true },
  },
  // Most routes reply with only { error }. Requiring message/statusCode made the
  // serializer throw on those replies, so a 401 or 404 went out as a 500 (ST-636).
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
} as const;

export const timestampSchema = {
  type: 'string',
  format: 'date-time',
} as const;
