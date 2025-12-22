# Task: Migrate Backend to Use Shared Types

## Metadata
- **ID**: task-107
- **Feature**: feature-016 - Shared TypeScript Schema & Type System
- **Epic**: epic-002 - Task Management Core
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-22
- **Assigned Agent**: backend-agent
- **Estimated Duration**: 6-8 hours

## Description
Migrate backend route handlers and validation logic to use shared Zod schemas from `@st44/types` instead of manually written OpenAPI schemas. Start with 3 core endpoints: tasks, households, and children. This migration will ensure backend validation uses the same schemas as frontend types, eliminating schema drift and duplication. Replace existing `apps/backend/src/schemas/*.ts` files with imports from the shared package.

## Requirements
- REQ1: Add `@st44/types` as dependency in backend package.json
- REQ2: Migrate tasks endpoints to use shared TaskSchema
- REQ3: Migrate households endpoints to use shared HouseholdSchema
- REQ4: Migrate children endpoints to use shared ChildSchema
- REQ5: Replace manual OpenAPI schemas with generated ones
- REQ6: Update route handlers to use Zod .parse() for validation
- REQ7: Ensure existing backend tests still pass
- REQ8: Remove deprecated schema files after migration

## Acceptance Criteria
- [ ] Backend package.json includes `@st44/types` dependency
- [ ] Tasks routes import from `@st44/types`
- [ ] Households routes import from `@st44/types`
- [ ] Children routes import from `@st44/types`
- [ ] OpenAPI schemas generated from Zod using generator
- [ ] Request validation uses `Schema.parse(request.body)`
- [ ] Error handling converts Zod errors to 400 responses
- [ ] All existing backend integration tests pass (181 tests)
- [ ] Old schema files deprecated/removed (common.ts kept for utilities)
- [ ] No duplicate type definitions remain

## Dependencies
- task-104: Create Shared Types Package (must be built)
- task-105: Define Core Domain Schemas (must have schemas to import)
- task-106: OpenAPI Schema Generator (must have generator to use)

## Technical Notes

### Adding Dependency

Update `apps/backend/package.json`:
```json
{
  "dependencies": {
    "@st44/types": "workspace:*"
  }
}
```

Run `npm install` at root to link the workspace package.

### Migration Pattern for Routes

**Before (apps/backend/src/routes/tasks.ts):**
```typescript
import { taskSchema, createTaskSchemaBase } from '../schemas/tasks.js';

fastify.post('/api/households/:householdId/tasks', {
  schema: createTaskSchemaBase,
  handler: async (request, reply) => {
    const { name, rule_type } = request.body;
    // Manual validation, no type safety
  }
});
```

**After (with shared types):**
```typescript
import { TaskSchema, CreateTaskRequestSchema } from '@st44/types';
import { zodToOpenAPI } from '@st44/types/generators';

fastify.post('/api/households/:householdId/tasks', {
  schema: {
    body: zodToOpenAPI(CreateTaskRequestSchema),
    response: {
      201: zodToOpenAPI(TaskSchema),
    },
  },
  handler: async (request, reply) => {
    // Type-safe validation with Zod
    const validatedData = CreateTaskRequestSchema.parse(request.body);
    // validatedData is fully typed!
  }
});
```

### Error Handling for Zod

Create error handler middleware:

```typescript
import { ZodError } from 'zod';

fastify.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    reply.code(400).send({
      error: 'Validation failed',
      details: error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }
  
  // Existing error handling...
});
```

### Validation Helper

Create reusable validation helper:

```typescript
import { z } from 'zod';
import { FastifyRequest, FastifyReply } from 'fastify';

export function validateRequest<T>(
  schema: z.ZodType<T>,
  data: unknown
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw error; // Let error handler catch it
    }
    throw error;
  }
}

// Usage in routes
const validatedBody = validateRequest(CreateTaskRequestSchema, request.body);
```

### Files to Migrate

1. **apps/backend/src/routes/tasks.ts**
   - POST /api/households/:householdId/tasks
   - GET /api/households/:householdId/tasks
   - PUT /api/tasks/:taskId
   - DELETE /api/tasks/:taskId

2. **apps/backend/src/routes/households.ts**
   - POST /api/households
   - GET /api/households
   - GET /api/households/:householdId
   - PUT /api/households/:householdId

3. **apps/backend/src/routes/children.ts**
   - POST /api/households/:householdId/children
   - GET /api/households/:householdId/children
   - PUT /api/children/:childId
   - DELETE /api/children/:childId

### Files to Remove After Migration

- `apps/backend/src/schemas/tasks.ts` (replaced by @st44/types)
- `apps/backend/src/schemas/households.ts` (replaced by @st44/types)
- `apps/backend/src/schemas/children.ts` (replaced by @st44/types)

Keep:
- `apps/backend/src/schemas/common.ts` (utility functions like stripResponseValidation)
- `apps/backend/src/schemas/auth.ts` (not migrated in this task)
- `apps/backend/src/schemas/assignments.ts` (not migrated in this task)

## Affected Areas
- [ ] Frontend
- [x] Backend (major refactor of route validation)
- [ ] Database
- [ ] Infrastructure
- [ ] CI/CD (types package must build first)
- [x] Documentation

## Implementation Plan

### Phase 1: Setup (1 hour)
1. Add `@st44/types` to backend package.json
2. Run `npm install` at root
3. Verify imports work: `import { TaskSchema } from '@st44/types'`
4. Create validation helper utility
5. Create Zod error handler

### Phase 2: Migrate Tasks Routes (2 hours)
1. Import TaskSchema, CreateTaskRequestSchema, UpdateTaskRequestSchema
2. Replace schema definitions with zodToOpenAPI()
3. Update POST /api/households/:id/tasks handler
4. Update GET /api/households/:id/tasks handler
5. Update PUT /api/tasks/:id handler
6. Update DELETE /api/tasks/:id handler
7. Run tests: `npm test` (verify all task tests pass)

### Phase 3: Migrate Households Routes (2 hours)
1. Import HouseholdSchema, CreateHouseholdRequestSchema, UpdateHouseholdRequestSchema
2. Replace schema definitions with zodToOpenAPI()
3. Update POST /api/households handler
4. Update GET /api/households handler
5. Update GET /api/households/:id handler
6. Update PUT /api/households/:id handler
7. Run tests: `npm test` (verify all household tests pass)

### Phase 4: Migrate Children Routes (1.5 hours)
1. Import ChildSchema, CreateChildRequestSchema, UpdateChildRequestSchema
2. Replace schema definitions with zodToOpenAPI()
3. Update POST /api/households/:id/children handler
4. Update GET /api/households/:id/children handler
5. Update PUT /api/children/:id handler
6. Update DELETE /api/children/:id handler
7. Run tests: `npm test` (verify all children tests pass)

### Phase 5: Cleanup (30 min)
1. Remove `apps/backend/src/schemas/tasks.ts`
2. Remove `apps/backend/src/schemas/households.ts`
3. Remove `apps/backend/src/schemas/children.ts`
4. Update imports in any remaining files
5. Run full test suite to verify nothing broke

### Phase 6: Verification (1 hour)
1. Run all backend tests: `npm test` (181 tests should pass)
2. Manual testing: Create household, add child, create task
3. Verify Swagger UI shows correct schemas
4. Verify validation errors return helpful messages
5. Check for TypeScript errors: `npm run type-check`

## Agent Assignments

### Subtask 1: Backend Migration
- **Agent**: backend-agent
- **Status**: pending
- **Instructions**: Migrate 3 route files to use shared schemas

### Subtask 2: Testing & Verification
- **Agent**: backend-agent
- **Status**: pending
- **Instructions**: Verify all 181 backend tests pass after migration

## Progress Log
- [2025-12-22 15:45] Task created by Planner Agent

## Testing Results
- Backend unit tests: 181/181 passing
- Integration tests: All passing
- Manual API testing: Tasks, households, children CRUD working
- Swagger UI: Schemas display correctly
- Validation errors: Clear, helpful messages

## Related PRs
[To be added during implementation]

## Lessons Learned
[To be filled after completion]

