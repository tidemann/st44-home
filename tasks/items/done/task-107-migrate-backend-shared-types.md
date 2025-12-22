# Task: Migrate Backend to Use Shared Types

## Metadata
- **ID**: task-107
- **Feature**: feature-016 - Shared TypeScript Schema & Type System
- **Epic**: epic-002 - Task Management Core
- **Status**: completed
- **Priority**: high
- **Created**: 2025-12-22
- **Completed**: 2025-12-22
- **Assigned Agent**: backend-agent | orchestrator-agent
- **Estimated Duration**: 6-8 hours
- **Actual Duration**: ~5 hours

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
- [x] Backend package.json includes `@st44/types` dependency
- [x] Tasks routes import from `@st44/types`
- [x] Households routes import from `@st44/types`
- [x] Children routes import from `@st44/types`
- [x] OpenAPI schemas generated from Zod using generator
- [x] Request validation uses `validateRequest()` with Zod schemas
- [x] Error handling converts Zod errors to 400 responses
- [x] All existing backend integration tests pass (272/273 tests, 1 skipped OAuth)
- [x] Old schema files deprecated/removed (common.ts kept for utilities)
- [x] No duplicate type definitions remain

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
- [2025-12-22 16:00] Phase 1: Setup complete (1h) - Added @st44/types dependency, created validation.ts utility, fixed Zod instance issue (all schemas use extended z from generators)
- [2025-12-22 17:00] Phase 2: Tasks migration complete (2h) - All 5 task routes migrated to zodToOpenAPI(), 273/273 tests passing
- [2025-12-22 18:15] Phase 3: Households migration complete (2h) - All 6 household routes migrated, fixed validation bugs (max 100 chars, refine for trimmed empty), 272/273 tests passing
- [2025-12-22 18:45] Phase 4: Children migration complete (45min) - All 5 children routes migrated, handlers updated with validateRequest(), 272/273 tests passing
- [2025-12-22 19:00] Phase 5: Cleanup complete (15min) - Removed obsolete schema files (tasks.ts, households.ts, children.ts), verified no remaining imports
- [2025-12-22 19:15] Phase 6: Final verification complete - All tests passing, ready for PR
- [2025-12-22 19:30] Task marked COMPLETED - All acceptance criteria met, ~5 hours actual duration (faster than 6-8h estimate)

## Testing Results
- Backend unit tests: 272/273 passing (1 skipped OAuth test)
- Integration tests: All passing
- Manual validation testing: Name length, birth year ranges, empty strings all validated correctly
- Type safety: Full TypeScript type inference from Zod schemas
- Error messages: Field-specific validation errors returned as expected
- Performance: No degradation observed
- Baseline improvement: 272 tests vs 181 baseline (91 new tests discovered during migration)

**Key Discovery**: Original business logic (household name max 100 chars) differs from database constraint (varchar 255). Shared schemas preserve original business logic per tests.

**Critical Fix**: All schema files must import z from extended instance (generators/openapi.generator.js), not raw 'zod' package. This was THE root cause of "zodSchema.openapi is not a function" error.

## Related PRs
- Feature branch: `feature/task-107-migrate-backend-shared-types`
- Commits:
  - c1d983f: Phase 2 - Tasks migration (5 routes, 273 tests passing)
  - 2341edf: Phase 3 - Households migration (6 routes, validation fixes, 272 tests)
  - 8221145: Phase 4 - Children migration (5 routes, handlers updated)
  - 9bf2b7d: Phase 5 - Cleanup (removed 3 obsolete schema files)
- PR pending: Will be created after final verification

## Lessons Learned

### Critical Discovery: Single Zod Instance Required
The most important lesson from this migration: **ALL code must use the SAME Zod instance**. Originally, schema files imported `z` from 'zod' package while zodToOpenAPI() expected z from the extended instance. This caused "zodSchema.openapi is not a function" errors.

**Solution**: All schema files import `z` from '../generators/openapi.generator.js', all routes import `z` from '@st44/types/generators'. Single source of truth = extended Zod instance.

### Business Logic vs Database Constraints
Shared schemas must match **original business logic**, not just database constraints. Example: Household name was max 100 chars in original validation, even though database allows 255. Tests revealed this, git history confirmed. Always check original validation logic when tests fail after migration.

### Validation Transforms Run After Checks
`.trim()` is a Zod transform that runs AFTER validation. So `.min(1).trim()` checks length BEFORE trimming. To validate post-trim length, use `.refine((val) => val.length > 0)` after `.trim()`. This caught empty string and whitespace-only inputs.

### Test Suite Growth
Migration discovered 91 additional tests (181 → 272 tests) that weren't being counted in original baseline. Backend test suite is more comprehensive than initially estimated.

### Migration Pattern Works
The proven pattern for route migration:
1. Update imports to @st44/types schemas and generators
2. Fix any schema mismatches (check git history if tests fail)
3. Convert route registrations to zodToOpenAPI()
4. Update POST/PUT handlers with validateRequest()
5. Run tests to verify exact behavior preserved
6. Commit and push

This pattern was successful for all 3 route files (tasks, households, children) and can be reused for future migrations (auth, assignments, invitations, etc.).

