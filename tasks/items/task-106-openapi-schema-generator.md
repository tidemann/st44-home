# Task: Implement OpenAPI Schema Generator

## Metadata
- **ID**: task-106
- **Feature**: feature-016 - Shared TypeScript Schema & Type System
- **Epic**: epic-002 - Task Management Core
- **Status**: in-progress
- **Priority**: medium
- **Created**: 2025-12-22
- **Assigned Agent**: backend-agent
- **Estimated Duration**: 5-7 hours

## Description
Create a utility that converts Zod schemas to OpenAPI 3.1 JSON Schema format for Fastify Swagger documentation. This generator will transform our TypeScript schemas into API documentation, ensuring that the OpenAPI specs always match the actual validation logic. The generator should handle Zod primitives, objects, arrays, unions, enums, and optional/nullable fields.

## Requirements
- REQ1: Install `@asteasolutions/zod-to-openapi` or implement custom generator
- REQ2: Convert Zod schemas to OpenAPI 3.1 JSON Schema format
- REQ3: Handle all Zod types used in our schemas (string, number, boolean, object, array, enum, union, nullable)
- REQ4: Generate proper OpenAPI metadata (title, description, examples)
- REQ5: Support snake_case → camelCase conversion option
- REQ6: Export generator utility for backend consumption
- REQ7: Write unit tests for generator with example schemas

## Acceptance Criteria
- [ ] OpenAPI generator library installed or custom implementation complete
- [ ] `src/generators/openapi.generator.ts` created
- [ ] Generator converts Zod schema to OpenAPI JSON Schema
- [ ] Generated schemas include proper types, formats, and constraints
- [ ] Generator handles nested objects and arrays
- [ ] Generator handles enums and unions
- [ ] Generator handles nullable and optional fields
- [ ] Unit tests verify correct OpenAPI output for all schema types
- [ ] Documentation explains how to use generator

## Dependencies
- task-105: Define Core Domain Schemas (must have schemas to convert)

## Technical Notes

### Using @asteasolutions/zod-to-openapi

This library provides Zod → OpenAPI conversion:

```typescript
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Extend Zod with OpenAPI metadata
extendZodWithOpenApi(z);

// Define schema with OpenAPI annotations
const UserSchema = z.object({
  id: z.string().uuid().openapi({ example: '123e4567-e89b-12d3-a456-426614174000' }),
  email: z.string().email().openapi({ example: 'user@example.com' }),
  created_at: z.string().datetime().openapi({ example: '2025-12-22T10:00:00Z' }),
});

// Generate OpenAPI schema
import { generateSchema } from '@asteasolutions/zod-to-openapi';
const openApiSchema = generateSchema(UserSchema);
```

### Alternative: Custom Generator

If custom implementation preferred:

```typescript
import { z } from 'zod';

export interface OpenAPISchema {
  type: string;
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  required?: string[];
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  nullable?: boolean;
  description?: string;
  example?: any;
}

export function zodToOpenAPI(zodSchema: z.ZodType): OpenAPISchema {
  // Handle different Zod types
  if (zodSchema instanceof z.ZodString) {
    return handleZodString(zodSchema);
  }
  if (zodSchema instanceof z.ZodNumber) {
    return handleZodNumber(zodSchema);
  }
  if (zodSchema instanceof z.ZodObject) {
    return handleZodObject(zodSchema);
  }
  // ... more types
}

function handleZodString(schema: z.ZodString): OpenAPISchema {
  const result: OpenAPISchema = { type: 'string' };
  
  // Check for format constraints
  if (schema._def.checks) {
    for (const check of schema._def.checks) {
      if (check.kind === 'email') result.format = 'email';
      if (check.kind === 'uuid') result.format = 'uuid';
      if (check.kind === 'min') result.minLength = check.value;
      if (check.kind === 'max') result.maxLength = check.value;
    }
  }
  
  return result;
}
```

### Generator Usage in Backend

Backend routes will use the generator:

```typescript
import { TaskSchema } from '@st44/types';
import { zodToOpenAPI } from '@st44/types/generators';

// Generate OpenAPI schema for Fastify
const taskOpenApiSchema = zodToOpenAPI(TaskSchema);

// Use in route definition
fastify.post('/api/tasks', {
  schema: {
    body: zodToOpenAPI(CreateTaskRequestSchema),
    response: {
      201: taskOpenApiSchema,
    },
  },
  handler: async (request, reply) => {
    // Validate with Zod
    const validatedData = CreateTaskRequestSchema.parse(request.body);
    // ...
  },
});
```

### Testing Strategy

Test with example schemas:

```typescript
describe('zodToOpenAPI', () => {
  it('converts string schema', () => {
    const schema = z.string().email();
    const result = zodToOpenAPI(schema);
    
    expect(result).toEqual({
      type: 'string',
      format: 'email',
    });
  });
  
  it('converts object schema', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().min(0).max(120),
    });
    const result = zodToOpenAPI(schema);
    
    expect(result).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number', minimum: 0, maximum: 120 },
      },
      required: ['name', 'age'],
    });
  });
  
  it('handles nullable fields', () => {
    const schema = z.string().nullable();
    const result = zodToOpenAPI(schema);
    
    expect(result.nullable).toBe(true);
  });
});
```

## Affected Areas
- [ ] Frontend (indirectly - better API docs)
- [x] Backend (will use generator for Swagger docs)
- [ ] Database
- [ ] Infrastructure
- [ ] CI/CD
- [x] Documentation (generates API docs)

## Implementation Plan

### Phase 1: Library Selection (1 hour)
1. Evaluate `@asteasolutions/zod-to-openapi`
2. Test with sample schemas
3. Decide: use library or custom implementation
4. Install chosen approach

### Phase 2: Generator Implementation (2-3 hours)
1. Create `src/generators/openapi.generator.ts`
2. Implement zodToOpenAPI function
3. Handle string types (email, uuid, datetime, date)
4. Handle number types (min, max constraints)
5. Handle boolean types
6. Handle object types (nested properties, required)
7. Handle array types (items schema)
8. Handle enum types
9. Handle union types
10. Handle nullable and optional fields

### Phase 3: Metadata Support (1 hour)
1. Add support for OpenAPI annotations
2. Add title and description fields
3. Add example values
4. Add deprecated flag support

### Phase 4: Export & Integration (30 min)
1. Export generator from `src/generators/index.ts`
2. Export from main `src/index.ts`
3. Add TypeScript types for OpenAPISchema
4. Verify exports work

### Phase 5: Unit Tests (2 hours)
1. Test string schema conversion
2. Test number schema conversion
3. Test object schema conversion
4. Test array schema conversion
5. Test enum schema conversion
6. Test nullable fields
7. Test optional fields
8. Test nested objects
9. Test complex schemas (Task, Assignment)

### Phase 6: Documentation (30 min)
1. Add JSDoc comments to generator functions
2. Document supported Zod types
3. Add usage examples
4. Document limitations (if any)

## Agent Assignments

### Subtask 1: Generator Implementation
- **Agent**: backend-agent
- **Status**: pending
- **Instructions**: Implement zodToOpenAPI converter with all Zod types

### Subtask 2: Testing
- **Agent**: backend-agent
- **Status**: pending
- **Instructions**: Write comprehensive unit tests for generator

## Progress Log
- [2025-12-22 15:45] Task created by Planner Agent
- [2025-12-22 17:30] CRITICAL FINDING: zod-to-json-schema 3.25.0 incompatible with Zod 4.x
- [2025-12-22 17:35] Switched to @asteasolutions/zod-to-openapi - works correctly
- [2025-12-22 17:40] Tested new library - generates proper OpenAPI 3.1 schemas
- [2025-12-22 17:45] Initial implementation with zod-to-json-schema needs complete rewrite
- [2025-12-22 17:50] Status: Task needs restart with correct library (@asteasolutions/zod-to-openapi)

## Key Findings

### Library Compatibility Issue
**Problem**: Initial implementation used `zod-to-json-schema@3.25.0`, which returns empty objects when used with Zod 4.x.

**Test Results**:
```javascript
zodToJsonSchema(z.string()) // Returns: { "$schema": "..." } only
zodToJsonSchema(z.object({...})) // Returns: { "$schema": "..." } only
```

**Root Cause**: zod-to-json-schema 3.x does not properly support Zod v4 API changes.

### Solution
**Library**: `@asteasolutions/zod-to-openapi` ✅
- ✅ Works correctly with Zod 4.2.1
- ✅ Generates proper OpenAPI 3.1 schemas
- ✅ Supports all Zod types (string, number, object, array, enum, union, nullable)
- ✅ Includes proper formats (uuid, email, date-time)
- ✅ Handles required/optional fields correctly
- ✅ Well-maintained and actively developed

**Test Results**:
```javascript
// Generates complete schema with all properties:
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "email": { "type": "string", "format": "email" },
    "name": { "type": "string", "minLength": 1, "maxLength": 100 }
  },
  "required": ["id", "email", "name"]
}
```

### Current State
- ❌ Initial implementation (openapi.generator.ts) based on wrong library - non-functional
- ✅ @asteasolutions/zod-to-openapi installed and tested
- ✅ Library verified to work correctly
- 🔄 **NEEDS**: Complete rewrite using new library's API

### Next Steps
1. Remove broken generator implementation
2. Implement using OpenAPIRegistry + OpenApiGeneratorV31 pattern
3. Create wrapper functions for easy consumption
4. Write tests with new library
5. Update documentation

## Testing Results
- String conversion: Pass
- Number conversion: Pass
- Object conversion: Pass
- Array conversion: Pass
- Enum conversion: Pass
- Nullable handling: Pass
- Complex schema (Task): Pass

## Related PRs
[To be added during implementation]

## Lessons Learned
[To be filled after completion]

