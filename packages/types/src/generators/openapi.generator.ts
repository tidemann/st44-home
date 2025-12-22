/**
 * OpenAPI Schema Generator
 * 
 * Converts Zod schemas to OpenAPI 3.1 JSON Schema format for API documentation.
 * This ensures that API documentation always matches the actual validation logic.
 * 
 * @module @st44/types/generators/openapi
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import type { z } from 'zod';
import type { JsonSchema7Type } from 'zod-to-json-schema';

/**
 * OpenAPI 3.1 Schema format
 */
export interface OpenAPISchema extends Record<string, any> {
  type?: string | string[];
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema | OpenAPISchema[];
  required?: string[];
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  enum?: any[];
  const?: any;
  oneOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  allOf?: OpenAPISchema[];
  nullable?: boolean;
  description?: string;
  title?: string;
  example?: any;
  default?: any;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
}

/**
 * Options for OpenAPI schema generation
 */
export interface OpenAPIGeneratorOptions {
  /**
   * Schema name/title for documentation
   */
  name?: string;
  
  /**
   * Description for the schema
   */
  description?: string;
  
  /**
   * Whether to include $ref definitions
   * @default false
   */
  includeRefs?: boolean;
  
  /**
   * Target OpenAPI version
   * @default 'openApi3'
   */
  target?: 'openApi3' | 'jsonSchema7';
  
  /**
   * Whether to mark all fields as nullable by default
   * @default false
   */
  nullableByDefault?: boolean;
}

/**
 * Convert a Zod schema to OpenAPI 3.1 JSON Schema format
 * 
 * @param zodSchema - The Zod schema to convert
 * @param options - Generation options
 * @returns OpenAPI schema object
 * 
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { zodToOpenAPI } from '@st44/types/generators';
 * 
 * const UserSchema = z.object({
 *   id: z.string().uuid(),
 *   email: z.string().email(),
 *   created_at: z.string().datetime(),
 * });
 * 
 * const openApiSchema = zodToOpenAPI(UserSchema, {
 *   name: 'User',
 *   description: 'User model',
 * });
 * ```
 */
export function zodToOpenAPI(
  zodSchema: z.ZodType<any, any, any>,
  options: OpenAPIGeneratorOptions = {}
): OpenAPISchema {
  const {
    name,
    description,
    includeRefs = false,
    target = 'openApi3',
    nullableByDefault = false,
  } = options;

  // Convert Zod schema to JSON Schema
  // Type cast needed due to Zod version compatibility
  const jsonSchema = zodToJsonSchema(zodSchema as any, {
    name,
    target,
    $refStrategy: includeRefs ? 'root' : 'none',
  });

  // Create OpenAPI schema from JSON Schema (type assertion since output is compatible)
  const openApiSchema = { ...jsonSchema } as OpenAPISchema;

  // Add custom description if provided
  if (description) {
    openApiSchema.description = description;
  }

  // Handle nullable by default option
  if (nullableByDefault) {
    makeNullable(openApiSchema);
  }

  // Remove JSON Schema specific properties that aren't in OpenAPI 3.1
  if (openApiSchema.$schema) {
    delete openApiSchema.$schema;
  }

  return openApiSchema;
}

/**
 * Make all properties in a schema nullable
 * 
 * @param schema - Schema to modify
 */
function makeNullable(schema: OpenAPISchema): void {
  if (schema.type && !Array.isArray(schema.type)) {
    schema.type = [schema.type, 'null'];
  }

  if (schema.properties) {
    for (const prop of Object.values(schema.properties)) {
      makeNullable(prop);
    }
  }

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      schema.items.forEach(makeNullable);
    } else {
      makeNullable(schema.items);
    }
  }
}

/**
 * Generate OpenAPI schemas for request/response pairs
 * 
 * @param schemas - Object with request and response schemas
 * @param options - Generation options
 * @returns Object with OpenAPI request and response schemas
 * 
 * @example
 * ```typescript
 * const apiSchemas = generateAPISchemas({
 *   request: CreateTaskRequestSchema,
 *   response: TaskResponseSchema,
 * }, {
 *   requestName: 'CreateTaskRequest',
 *   responseName: 'TaskResponse',
 * });
 * 
 * // Use in Fastify route
 * fastify.post('/api/tasks', {
 *   schema: {
 *     body: apiSchemas.request,
 *     response: {
 *       201: apiSchemas.response,
 *     },
 *   },
 *   handler: async (request, reply) => {
 *     // ...
 *   },
 * });
 * ```
 */
export function generateAPISchemas<TRequest extends z.ZodType, TResponse extends z.ZodType>(
  schemas: {
    request: TRequest;
    response: TResponse;
  },
  options: {
    requestName?: string;
    requestDescription?: string;
    responseName?: string;
    responseDescription?: string;
    generatorOptions?: Omit<OpenAPIGeneratorOptions, 'name' | 'description'>;
  } = {}
): {
  request: OpenAPISchema;
  response: OpenAPISchema;
} {
  const {
    requestName = 'Request',
    requestDescription,
    responseName = 'Response',
    responseDescription,
    generatorOptions = {},
  } = options;

  return {
    request: zodToOpenAPI(schemas.request, {
      ...generatorOptions,
      name: requestName,
      description: requestDescription,
    }),
    response: zodToOpenAPI(schemas.response, {
      ...generatorOptions,
      name: responseName,
      description: responseDescription,
    }),
  };
}

/**
 * Create an OpenAPI error response schema
 * 
 * @param statusCode - HTTP status code
 * @param description - Error description
 * @returns OpenAPI error schema
 * 
 * @example
 * ```typescript
 * const notFoundSchema = createErrorSchema(404, 'Resource not found');
 * 
 * fastify.get('/api/tasks/:id', {
 *   schema: {
 *     response: {
 *       200: TaskResponseSchema,
 *       404: notFoundSchema,
 *     },
 *   },
 *   handler: async (request, reply) => {
 *     // ...
 *   },
 * });
 * ```
 */
export function createErrorSchema(
  statusCode: number,
  description: string
): OpenAPISchema {
  return {
    type: 'object',
    properties: {
      statusCode: {
        type: 'number',
        const: statusCode,
        description: 'HTTP status code',
      },
      error: {
        type: 'string',
        description: 'Error name',
      },
      message: {
        type: 'string',
        description: 'Error message',
      },
    },
    required: ['statusCode', 'error', 'message'],
    description,
  };
}

/**
 * Common error response schemas
 */
export const CommonErrors = {
  BadRequest: createErrorSchema(400, 'Bad Request - Invalid input'),
  Unauthorized: createErrorSchema(401, 'Unauthorized - Authentication required'),
  Forbidden: createErrorSchema(403, 'Forbidden - Insufficient permissions'),
  NotFound: createErrorSchema(404, 'Not Found - Resource does not exist'),
  Conflict: createErrorSchema(409, 'Conflict - Resource already exists'),
  UnprocessableEntity: createErrorSchema(422, 'Unprocessable Entity - Validation failed'),
  InternalServerError: createErrorSchema(500, 'Internal Server Error'),
} as const;
