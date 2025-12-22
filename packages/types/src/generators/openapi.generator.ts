/**
 * OpenAPI Schema Generator
 * 
 * Converts Zod schemas to OpenAPI 3.1 JSON Schema format for API documentation.
 * This ensures that API documentation always matches the actual validation logic.
 * 
 * Uses @asteasolutions/zod-to-openapi library which properly supports Zod 4.x
 * 
 * @module @st44/types/generators/openapi
 */

import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Extend Zod with OpenAPI metadata support
extendZodWithOpenApi(z);

// Re-export the extended Zod instance for use in route definitions
// CRITICAL: Backend routes must use this z instance, not import from 'zod' directly
export { z };

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
   * Example value for the schema
   */
  example?: any;
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
  const { name, description, example } = options;

  // Create a registry and register the schema
  const registry = new OpenAPIRegistry();
  
  // Register the schema with metadata
  const componentName = name || 'Schema';
  registry.register(componentName, zodSchema);

  // Generate OpenAPI document
  const generator = new OpenApiGeneratorV31(registry.definitions);
  const document = generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Temporary',
      version: '1.0.0',
    },
  });

  // Extract the schema from components
  const schema = document.components?.schemas?.[componentName] as OpenAPISchema;
  
  if (!schema) {
    throw new Error(`Failed to generate schema for ${componentName}`);
  }

  // Apply custom metadata
  if (name) {
    schema.title = name;
  }
  
  if (description) {
    schema.description = description;
  }
  
  if (example !== undefined) {
    schema.example = example;
  }

  return schema;
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
 * Common error response schemas for Fastify routes
 * Each error includes the status code as the key for Fastify response schemas
 */
export const CommonErrors = {
  BadRequest: {
    400: createErrorSchema(400, 'Bad Request - Invalid input'),
  },
  Unauthorized: {
    401: createErrorSchema(401, 'Unauthorized - Authentication required'),
  },
  Forbidden: {
    403: createErrorSchema(403, 'Forbidden - Insufficient permissions'),
  },
  NotFound: {
    404: createErrorSchema(404, 'Not Found - Resource does not exist'),
  },
  Conflict: {
    409: createErrorSchema(409, 'Conflict - Resource already exists'),
  },
  UnprocessableEntity: {
    422: createErrorSchema(422, 'Unprocessable Entity - Validation failed'),
  },
  InternalServerError: {
    500: createErrorSchema(500, 'Internal Server Error'),
  },
} as const;
