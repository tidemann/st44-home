# @st44/types - Shared Type System

Single source of truth for all data models used in Diddit (st44-home).

## Overview

This package provides:
- **Zod Schemas**: Runtime validation for API requests/responses
- **TypeScript Types**: Compile-time type safety for frontend/backend
- **OpenAPI Schemas**: Auto-generated API documentation from Zod schemas

All data structures are defined once and used consistently across the entire application stack.

## Installation

This package is part of the monorepo workspace and automatically linked via npm workspaces:

```bash
# From project root
npm install

# Build the types package
npm run build:types

# The @st44/types package is now available to all workspace packages
```

## Usage

### In Backend (Fastify)

Import schemas for runtime validation and OpenAPI documentation:

```typescript
import { TaskSchema, CreateTaskRequestSchema } from '@st44/types/schemas';
import { zodToOpenAPI } from '@st44/types/generators';
import type { Task, CreateTaskRequest } from '@st44/types/types';

// Use in route definitions with OpenAPI schema generation
fastify.post<{ Body: CreateTaskRequest; Reply: Task }>(
  '/api/households/:householdId/tasks',
  {
    schema: {
      body: zodToOpenAPI(CreateTaskRequestSchema),
      response: {
        201: zodToOpenAPI(TaskSchema),
      },
    },
  },
  async (request, reply) => {
    // Runtime validation with Zod
    const validatedData = CreateTaskRequestSchema.parse(request.body);

    // Business logic...
    const task = await createTask(request.params.householdId, validatedData);

    reply.code(201);
    return task;
  }
);
```

**Key Points**:
- Use `zodToOpenAPI()` to convert Zod schemas to OpenAPI format for Fastify
- Use `.parse()` for runtime validation (throws on invalid data)
- Use `.safeParse()` for validation without throwing (returns result object)
- TypeScript types are automatically inferred from Zod schemas

### In Frontend (Angular)

Import types for compile-time safety in services and components:

```typescript
import type { Task, CreateTaskRequest, UpdateTaskRequest } from '@st44/types/types';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);

  getTasks(householdId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`/api/households/${householdId}/tasks`);
  }

  createTask(householdId: string, request: CreateTaskRequest): Observable<Task> {
    return this.http.post<Task>(`/api/households/${householdId}/tasks`, request);
  }

  updateTask(taskId: string, request: UpdateTaskRequest): Observable<Task> {
    return this.http.put<Task>(`/api/tasks/${taskId}`, request);
  }
}
```

**Key Points**:
- Import types using `import type` for type-only imports
- TypeScript ensures request/response data matches backend expectations
- No runtime validation needed in frontend (backend validates)
- IDE autocomplete works perfectly with shared types

## Package Structure

```
packages/types/
├── src/
│   ├── schemas/              # Zod schema definitions
│   │   ├── user.schema.ts
│   │   ├── household.schema.ts
│   │   ├── child.schema.ts
│   │   ├── task.schema.ts
│   │   ├── assignment.schema.ts
│   │   └── index.ts
│   ├── generators/           # Schema converters
│   │   ├── openapi.generator.ts
│   │   └── index.ts
│   ├── types/                # TypeScript type exports
│   │   └── index.ts
│   └── index.ts              # Main entry point
├── tests/                    # Integration tests
│   └── integration.test.ts
├── dist/                     # Compiled output (git ignored)
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Adding New Schemas

Follow this workflow when adding new entities to the system:

### 1. Create Schema File

Create a new file in `src/schemas/` (e.g., `reward.schema.ts`):

```typescript
import { z } from 'zod';

/**
 * Reward Schema - represents a reward a child can redeem
 */
export const RewardSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().nullable(),
  cost: z.number().int().min(1),
  available: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Infer TypeScript type from schema
 */
export type Reward = z.infer<typeof RewardSchema>;

/**
 * Create Reward Request - fields required for creating a new reward
 */
export const CreateRewardRequestSchema = RewardSchema.pick({
  name: true,
  description: true,
  cost: true,
}).extend({
  description: z.string().optional(),
});

export type CreateRewardRequest = z.infer<typeof CreateRewardRequestSchema>;

/**
 * Update Reward Request - fields that can be updated
 */
export const UpdateRewardRequestSchema = CreateRewardRequestSchema.partial();

export type UpdateRewardRequest = z.infer<typeof UpdateRewardRequestSchema>;
```

### 2. Export from Index

Add exports to `src/schemas/index.ts`:

```typescript
export * from './reward.schema';
```

Add type exports to `src/types/index.ts`:

```typescript
export type { Reward, CreateRewardRequest, UpdateRewardRequest } from '../schemas/reward.schema';
```

### 3. Write Unit Tests

Create `src/schemas/reward.schema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { RewardSchema, CreateRewardRequestSchema } from './reward.schema';

describe('RewardSchema', () => {
  it('should validate valid reward data', () => {
    const validReward = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      householdId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Extra Screen Time',
      description: '30 minutes extra',
      cost: 50,
      available: true,
      createdAt: '2025-12-22T10:00:00Z',
      updatedAt: '2025-12-22T10:00:00Z',
    };

    const result = RewardSchema.safeParse(validReward);
    expect(result.success).toBe(true);
  });

  it('should reject invalid cost', () => {
    const invalidReward = { /* ... */ cost: -10 };
    const result = RewardSchema.safeParse(invalidReward);
    expect(result.success).toBe(false);
  });
});
```

### 4. Build and Use

```bash
# Build the types package
npm run build:types

# Now use in backend and frontend
```

## Naming Conventions

Follow these naming patterns for consistency:

### Schemas
- **Entity Schema**: `EntitySchema` (e.g., `TaskSchema`, `UserSchema`)
- **Create Request**: `CreateEntityRequestSchema`
- **Update Request**: `UpdateEntityRequestSchema`
- **List Response**: `EntityListResponseSchema` (if needed)

### Types
- **Entity Type**: `Entity` (e.g., `Task`, `User`)
- **Request Types**: `CreateEntityRequest`, `UpdateEntityRequest`
- **Response Types**: Use entity type directly or create specific response types

### File Naming
- Schema files: `entity.schema.ts` (kebab-case)
- Test files: `entity.schema.test.ts`

### Property Names
- **Use camelCase** for all properties (matches TypeScript/JavaScript conventions)
- Database columns use camelCase (no snake_case conversion)
- Example: `householdId`, `createdAt`, `ruleType`

### Required vs Optional Fields

Be explicit about nullability:

```typescript
// Required field (cannot be null or undefined)
name: z.string().min(1)

// Optional field (can be undefined, but not null)
description: z.string().optional()

// Nullable field (can be null, but not undefined)
avatarUrl: z.string().nullable()

// Both optional and nullable
notes: z.string().nullable().optional()
```

## Schema Patterns

### Timestamps

All entities should have `createdAt` and `updatedAt`:

```typescript
export const BaseSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const EntitySchema = BaseSchema.extend({
  // ... other fields
});
```

### UUIDs

Use UUID validation for all IDs:

```typescript
id: z.string().uuid(),
householdId: z.string().uuid(),
```

### Enums

Define enums as const arrays for type safety:

```typescript
export const RULE_TYPES = ['daily', 'weekly', 'weekly_rotation'] as const;

export const RuleTypeSchema = z.enum(RULE_TYPES);

export type RuleType = z.infer<typeof RuleTypeSchema>; // 'daily' | 'weekly' | 'weekly_rotation'
```

### Nested Objects

For complex nested structures, define separate schemas:

```typescript
export const RotationConfigSchema = z.object({
  children: z.array(z.string().uuid()),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const TaskSchema = z.object({
  // ... other fields
  ruleConfig: RotationConfigSchema.nullable(),
});
```

### Pick and Omit

Use Zod's `.pick()` and `.omit()` to derive schemas:

```typescript
// Create request excludes generated fields
export const CreateTaskRequestSchema = TaskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update request picks only updateable fields
export const UpdateTaskRequestSchema = TaskSchema.pick({
  name: true,
  description: true,
  points: true,
  active: true,
}).partial(); // All fields optional for updates
```

## OpenAPI Generator

The `zodToOpenAPI` function converts Zod schemas to OpenAPI 3.0 format:

```typescript
import { zodToOpenAPI } from '@st44/types/generators';
import { TaskSchema } from '@st44/types/schemas';

const openApiSchema = zodToOpenAPI(TaskSchema);
// Returns:
// {
//   type: 'object',
//   properties: { id: { type: 'string', format: 'uuid' }, ... },
//   required: ['id', 'householdId', 'name', ...],
// }
```

**Supported Zod Types**:
- Primitives: `string`, `number`, `boolean`, `null`
- String formats: `uuid`, `email`, `url`, `datetime`, `date`
- Numbers: `int`, `float`, `min`, `max`
- Arrays: `array`
- Objects: `object` (nested schemas)
- Enums: `enum`
- Unions: `union` (nullable values)
- Optional: `.optional()`, `.nullable()`

## Development Workflow

### Build Commands

```bash
# Clean dist folder
npm run clean

# Build TypeScript to JavaScript + declarations
npm run build

# Watch mode (rebuild on changes)
npm run watch

# Type check without emitting files
npm run type-check

# Run tests
npm test
```

### Development Loop

When working on schemas:

1. **Start watch mode**: `cd packages/types && npm run watch`
2. **Make schema changes** in `src/schemas/`
3. **Watch rebuilds automatically**
4. **Backend/frontend see changes** immediately (via workspace links)
5. **Run tests**: `npm test`

### Testing

Run the full test suite:

```bash
# From project root
npm run test:types

# Or from packages/types
npm test

# Run specific test file
npm test -- src/schemas/task.schema.test.ts

# Watch mode
npm test -- --watch
```

**Test Coverage**:
- Unit tests for each schema (validation rules)
- Integration tests for type consistency across packages
- OpenAPI generator tests for all schemas

## Troubleshooting

### "Cannot find module '@st44/types'"

**Cause**: Types package hasn't been built yet.

**Solution**: Build types package first:

```bash
npm run build:types
# or
cd packages/types && npm run build
```

### Types not updating after schema changes

**Cause**: Types package wasn't rebuilt after changes.

**Solution**: Rebuild types package:

```bash
npm run build:types
```

For active development, use watch mode:

```bash
cd packages/types && npm run watch
```

### TypeScript errors after updating schemas

**Cause**: Backend or frontend code uses old type signatures.

**Solution**:
1. Update method signatures to match new types
2. Run type check to find all errors:

```bash
npm run type-check
```

### Module resolution errors in IDE

**Cause**: IDE hasn't refreshed workspace or types haven't been built.

**Solution**:
1. Build types: `npm run build:types`
2. Restart TypeScript server in IDE
3. In VSCode: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

### "Property does not exist on type" errors

**Cause**: Using wrong import or outdated type definition.

**Solution**:
- Check you're importing from `@st44/types/types` for types
- Check you're importing from `@st44/types/schemas` for schemas
- Rebuild types package: `npm run build:types`

### Tests fail after schema changes

**Cause**: Test data doesn't match new schema requirements.

**Solution**: Update test fixtures to match new validation rules:

```typescript
// Before: birthYear was optional
const validChild = { name: 'Alice' };

// After: birthYear is required
const validChild = { name: 'Alice', birthYear: 2015 };
```

## Architecture

### Type Flow

```
1. Define Zod Schema (src/schemas/)
   ↓
2. Infer TypeScript Type (z.infer<typeof Schema>)
   ↓
3. Generate OpenAPI Schema (zodToOpenAPI)
   ↓
4. Backend: Runtime validation + API docs
   ↓
5. Frontend: Compile-time type safety
```

### Build Pipeline

```
1. packages/types/     - Build first (npm run build:types)
   ↓
2. apps/backend/       - Import @st44/types (schemas + types)
   ↓
3. apps/frontend/      - Import @st44/types (types only)
```

### Dependency Graph

```
@st44/types (no dependencies)
    ↑
    ├── apps/backend (depends on @st44/types)
    └── apps/frontend (depends on @st44/types)
```

## Benefits

### Single Source of Truth
- Define each entity once
- Changes propagate automatically
- No duplicate definitions to maintain

### Type Safety
- **Compile-time**: TypeScript catches mismatches before runtime
- **Runtime**: Zod validates actual data at API boundaries
- **Auto-complete**: IDE suggestions based on real types

### Consistency
- Frontend and backend always use matching types
- API contracts are enforced by TypeScript
- Reduces integration bugs

### Documentation
- OpenAPI schemas auto-generated from Zod
- JSDoc comments in schemas appear in IDE
- Self-documenting API contracts

### Maintainability
- Update types in one place
- TypeScript errors guide refactoring
- Easier to onboard new developers

## Best Practices

### DO

- ✅ Define Zod schema first, infer TypeScript type
- ✅ Use descriptive JSDoc comments for complex schemas
- ✅ Validate all API inputs with `.parse()` in backend
- ✅ Use `import type` for type-only imports in frontend
- ✅ Keep schemas close to database structure
- ✅ Write unit tests for validation rules
- ✅ Use `.pick()`, `.omit()`, `.partial()` to derive schemas
- ✅ Make nullability explicit (`.nullable()` vs `.optional()`)

### DON'T

- ❌ Define TypeScript types separately from Zod schemas
- ❌ Skip validation in backend endpoints
- ❌ Use runtime validation in frontend (trust backend)
- ❌ Forget to rebuild after schema changes
- ❌ Use `any` type instead of proper schemas
- ❌ Create duplicate type definitions in backend/frontend
- ❌ Skip writing tests for new schemas

## Examples

### Example 1: Simple Entity

```typescript
// src/schemas/category.schema.ts
import { z } from 'zod';

export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  createdAt: z.string().datetime(),
});

export type Category = z.infer<typeof CategorySchema>;

export const CreateCategoryRequestSchema = CategorySchema.pick({
  name: true,
  color: true,
});

export type CreateCategoryRequest = z.infer<typeof CreateCategoryRequestSchema>;
```

### Example 2: Entity with Relationships

```typescript
// src/schemas/comment.schema.ts
import { z } from 'zod';

export const CommentSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
  content: z.string().min(1).max(500),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Comment = z.infer<typeof CommentSchema>;
```

### Example 3: Complex Validation

```typescript
// src/schemas/schedule.schema.ts
import { z } from 'zod';

const TimeSlotSchema = z.object({
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: 'End time must be after start time' }
);

export const ScheduleSchema = z.object({
  id: z.string().uuid(),
  dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  slots: z.array(TimeSlotSchema).min(1),
  active: z.boolean(),
});

export type Schedule = z.infer<typeof ScheduleSchema>;
```

## Contributing

When adding new types:

1. **Define Zod schema first** (runtime validation)
2. **Infer TypeScript type** from schema
3. **Add JSDoc comments** for complex types
4. **Write unit tests** for validation rules
5. **Add integration tests** if type is used across packages
6. **Update this README** if adding new patterns or conventions
7. **Run `npm run type-check`** before committing

## Related Documentation

- [CLAUDE.md](/CLAUDE.md) - Project conventions and build commands
- [apps/backend/AGENTS.md](/apps/backend/AGENTS.md) - Backend patterns
- [apps/frontend/AGENTS.md](/apps/frontend/AGENTS.md) - Frontend patterns
- [Zod Documentation](https://zod.dev) - Zod schema validation library
- [OpenAPI Specification](https://swagger.io/specification/) - OpenAPI 3.0 spec

## Roadmap

- ✅ Task-104: Package structure and build setup
- ✅ Task-105: Core domain schemas (User, Household, Child, Task, Assignment)
- ✅ Task-106: OpenAPI schema generator
- ✅ Task-107: Backend migration (3 endpoints)
- ✅ Task-108: Frontend service migration
- ✅ Task-109: Build pipeline integration
- ✅ Task-110: Documentation and testing

## License

ISC
