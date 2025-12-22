/**
 * Tests for OpenAPI Schema Generator
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  zodToOpenAPI,
  generateAPISchemas,
  createErrorSchema,
  CommonErrors,
  type OpenAPISchema,
} from './openapi.generator.js';

describe('zodToOpenAPI', () => {
  describe('primitive types', () => {
    it('should convert string schema', () => {
      const schema = z.string();
      const result = zodToOpenAPI(schema);

      expect(result).toMatchObject({
        type: 'string',
      });
    });

    it('should convert string with email format', () => {
      const schema = z.string().email();
      const result = zodToOpenAPI(schema);

      expect(result).toMatchObject({
        type: 'string',
        format: 'email',
      });
    });

    it('should convert string with uuid format', () => {
      const schema = z.string().uuid();
      const result = zodToOpenAPI(schema);

      expect(result).toMatchObject({
        type: 'string',
        format: 'uuid',
      });
    });

    it('should convert string with datetime format', () => {
      const schema = z.string().datetime();
      const result = zodToOpenAPI(schema);

      expect(result).toMatchObject({
        type: 'string',
        format: 'date-time',
      });
    });

    it('should convert string with min/max length', () => {
      const schema = z.string().min(1).max(100);
      const result = zodToOpenAPI(schema);

      expect(result).toMatchObject({
        type: 'string',
        minLength: 1,
        maxLength: 100,
      });
    });

    it('should convert number schema', () => {
      const schema = z.number();
      const result = zodToOpenAPI(schema);

      expect(result).toMatchObject({
        type: 'number',
      });
    });

    it('should convert number with min/max', () => {
      const schema = z.number().min(0).max(120);
      const result = zodToOpenAPI(schema);

      expect(result).toMatchObject({
        type: 'number',
        minimum: 0,
        maximum: 120,
      });
    });

    it('should convert integer schema', () => {
      const schema = z.number().int();
      const result = zodToOpenAPI(schema);

      expect(result).toMatchObject({
        type: 'integer',
      });
    });

    it('should convert boolean schema', () => {
      const schema = z.boolean();
      const result = zodToOpenAPI(schema);

      expect(result).toMatchObject({
        type: 'boolean',
      });
    });
  });

  describe('object types', () => {
    it('should convert simple object schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const result = zodToOpenAPI(schema);

      expect(result).toMatchObject({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name', 'age'],
      });
    });

    it('should convert object with optional fields', () => {
      const schema = z.object({
        name: z.string(),
        nickname: z.string().optional(),
      });
      const result = zodToOpenAPI(schema);

      expect(result).toMatchObject({
        type: 'object',
        properties: {
          name: { type: 'string' },
          nickname: { type: 'string' },
        },
        required: ['name'],
      });
      expect(result.required).not.toContain('nickname');
    });

    it('should convert nested object schema', () => {
      const schema = z.object({
        user: z.object({
          id: z.string().uuid(),
          email: z.string().email(),
        }),
        created_at: z.string().datetime(),
      });
      const result = zodToOpenAPI(schema);

      expect(result).toMatchObject({
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
            },
            required: ['id', 'email'],
          },
          created_at: { type: 'string', format: 'date-time' },
        },
        required: ['user', 'created_at'],
      });
    });
  });

  describe('array types', () => {
    it('should convert array schema', () => {
      const schema = z.array(z.string());
      const result = zodToOpenAPI(schema);

      expect(result).toMatchObject({
        type: 'array',
        items: { type: 'string' },
      });
    });

    it('should convert array with min/max items', () => {
      const schema = z.array(z.number()).min(1).max(10);
      const result = zodToOpenAPI(schema);

      expect(result).toMatchObject({
        type: 'array',
        items: { type: 'number' },
        minItems: 1,
        maxItems: 10,
      });
    });

    it('should convert array of objects', () => {
      const schema = z.array(
        z.object({
          id: z.string(),
          name: z.string(),
        })
      );
      const result = zodToOpenAPI(schema);

      expect(result).toMatchObject({
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
          required: ['id', 'name'],
        },
      });
    });
  });

  describe('enum and literal types', () => {
    it('should convert enum schema', () => {
      const schema = z.enum(['pending', 'completed', 'skipped']);
      const result = zodToOpenAPI(schema);

      expect(result).toMatchObject({
        type: 'string',
        enum: ['pending', 'completed', 'skipped'],
      });
    });

    it('should convert literal schema', () => {
      const schema = z.literal('daily');
      const result = zodToOpenAPI(schema);

      expect(result).toMatchObject({
        type: 'string',
        const: 'daily',
      });
    });
  });

  describe('union and intersection types', () => {
    it('should convert union schema', () => {
      const schema = z.union([z.string(), z.number()]);
      const result = zodToOpenAPI(schema);

      expect(result.anyOf).toBeDefined();
      expect(result.anyOf).toHaveLength(2);
      expect(result.anyOf).toContainEqual({ type: 'string' });
      expect(result.anyOf).toContainEqual({ type: 'number' });
    });
  });

  describe('nullable and optional', () => {
    it('should convert nullable schema', () => {
      const schema = z.string().nullable();
      const result = zodToOpenAPI(schema);

      // Nullable in OpenAPI 3.1 can be represented as anyOf or type array
      expect(
        result.anyOf || Array.isArray(result.type) || result.nullable
      ).toBeTruthy();
    });

    it('should convert optional schema', () => {
      const schema = z.object({
        required_field: z.string(),
        optional_field: z.string().optional(),
      });
      const result = zodToOpenAPI(schema);

      expect(result.required).toContain('required_field');
      expect(result.required).not.toContain('optional_field');
    });
  });

  describe('complex schemas', () => {
    it('should convert Task schema', () => {
      const TaskSchema = z.object({
        id: z.string().uuid(),
        household_id: z.string().uuid(),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        rule_type: z.enum(['daily', 'repeating', 'weekly_rotation']),
        assignment_rule: z.record(z.string(), z.unknown()),
        points: z.number().int().min(0).default(1),
        is_active: z.boolean().default(true),
        created_at: z.string().datetime(),
        updated_at: z.string().datetime().optional(),
      });

      const result = zodToOpenAPI(TaskSchema, {
        name: 'Task',
        description: 'Task template model',
      });

      expect(result.type).toBe('object');
      expect(result.description).toBe('Task template model');
      expect(result.properties).toBeDefined();
      expect(result.properties?.id).toMatchObject({
        type: 'string',
        format: 'uuid',
      });
      expect(result.properties?.rule_type).toMatchObject({
        type: 'string',
        enum: ['daily', 'repeating', 'weekly_rotation'],
      });
      expect(result.required).toContain('id');
      expect(result.required).toContain('name');
      expect(result.required).not.toContain('description');
    });
  });

  describe('options', () => {
    it('should apply name option', () => {
      const schema = z.string();
      const result = zodToOpenAPI(schema, { name: 'TestString' });

      expect(result.title).toBe('TestString');
    });

    it('should apply description option', () => {
      const schema = z.string();
      const result = zodToOpenAPI(schema, { description: 'A test string' });

      expect(result.description).toBe('A test string');
    });

    it('should not include $schema property', () => {
      const schema = z.string();
      const result = zodToOpenAPI(schema);

      expect(result.$schema).toBeUndefined();
    });
  });
});

describe('generateAPISchemas', () => {
  it('should generate request and response schemas', () => {
    const CreateRequestSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const ResponseSchema = z.object({
      id: z.string().uuid(),
      name: z.string(),
      age: z.number(),
      created_at: z.string().datetime(),
    });

    const result = generateAPISchemas(
      {
        request: CreateRequestSchema,
        response: ResponseSchema,
      },
      {
        requestName: 'CreateUserRequest',
        responseName: 'UserResponse',
      }
    );

    expect(result.request.title).toBe('CreateUserRequest');
    expect(result.response.title).toBe('UserResponse');
    expect(result.request.properties).toBeDefined();
    expect(result.response.properties).toBeDefined();
  });

  it('should apply custom descriptions', () => {
    const RequestSchema = z.object({ name: z.string() });
    const ResponseSchema = z.object({ id: z.string(), name: z.string() });

    const result = generateAPISchemas(
      {
        request: RequestSchema,
        response: ResponseSchema,
      },
      {
        requestDescription: 'Request for creating a user',
        responseDescription: 'User model response',
      }
    );

    expect(result.request.description).toBe('Request for creating a user');
    expect(result.response.description).toBe('User model response');
  });
});

describe('createErrorSchema', () => {
  it('should create error schema with correct structure', () => {
    const schema = createErrorSchema(404, 'Resource not found');

    expect(schema).toMatchObject({
      type: 'object',
      properties: {
        statusCode: {
          type: 'number',
          const: 404,
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
      description: 'Resource not found',
    });
  });
});

describe('CommonErrors', () => {
  it('should have BadRequest error schema', () => {
    expect(CommonErrors.BadRequest).toBeDefined();
    expect(CommonErrors.BadRequest.properties?.statusCode.const).toBe(400);
  });

  it('should have Unauthorized error schema', () => {
    expect(CommonErrors.Unauthorized).toBeDefined();
    expect(CommonErrors.Unauthorized.properties?.statusCode.const).toBe(401);
  });

  it('should have Forbidden error schema', () => {
    expect(CommonErrors.Forbidden).toBeDefined();
    expect(CommonErrors.Forbidden.properties?.statusCode.const).toBe(403);
  });

  it('should have NotFound error schema', () => {
    expect(CommonErrors.NotFound).toBeDefined();
    expect(CommonErrors.NotFound.properties?.statusCode.const).toBe(404);
  });

  it('should have Conflict error schema', () => {
    expect(CommonErrors.Conflict).toBeDefined();
    expect(CommonErrors.Conflict.properties?.statusCode.const).toBe(409);
  });

  it('should have UnprocessableEntity error schema', () => {
    expect(CommonErrors.UnprocessableEntity).toBeDefined();
    expect(CommonErrors.UnprocessableEntity.properties?.statusCode.const).toBe(422);
  });

  it('should have InternalServerError error schema', () => {
    expect(CommonErrors.InternalServerError).toBeDefined();
    expect(CommonErrors.InternalServerError.properties?.statusCode.const).toBe(500);
  });
});
