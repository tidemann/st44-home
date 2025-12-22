# Feature: Shared TypeScript Schema & Type System

## Metadata
- **ID**: feature-016
- **Epic**: epic-002 - Task Management Core
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-22
- **Estimated Duration**: 5-7 days (35-50 hours)

## Description
Create a shared TypeScript schema and type system that ensures consistency between frontend and backend. Currently, types are duplicated across frontend services and backend schemas, leading to potential mismatches, maintenance overhead, and API inconsistencies. This feature introduces a centralized schema package that generates TypeScript types for both frontend and backend, as well as OpenAPI schemas for API documentation and validation.

## User Stories
- **As a** developer, **I want** to define types once in a central location, **so that** frontend and backend always use consistent data structures
- **As a** developer, **I want** TypeScript to catch type mismatches at compile time, **so that** API integration bugs are prevented before runtime
- **As a** developer, **I want** OpenAPI schemas to be generated from TypeScript types, **so that** API documentation stays in sync with code
- **As a** developer, **I want** to avoid manual duplication of types, **so that** code is easier to maintain and less error-prone
- **As a** QA engineer, **I want** API validation to match frontend expectations, **so that** integration issues are caught early

## Requirements

### Functional Requirements
- FR1: Shared TypeScript types package accessible to both frontend and backend
- FR2: Single source of truth for all data models (User, Household, Child, Task, Assignment, etc.)
- FR3: Automatic generation of OpenAPI schemas from TypeScript types
- FR4: Runtime validation using schemas (backend only)
- FR5: Type-safe API request/response interfaces for frontend
- FR6: Support for snake_case (backend/API) and camelCase (frontend) conversion
- FR7: Build pipeline integration (compile shared types before frontend/backend)

### Non-Functional Requirements
- Performance: Type compilation adds < 5 seconds to build time
- Developer Experience: Types auto-complete in IDE, clear error messages
- Maintainability: Single location for schema updates, clear documentation
- Backward Compatibility: Gradual migration path for existing code
- Testing: Schema validation tests, type consistency tests

## Acceptance Criteria
- [ ] `packages/types/` package created with TypeScript schemas
- [ ] Core domain models defined (User, Household, Child, Task, Assignment)
- [ ] OpenAPI schema generator working (from TypeScript → JSON Schema)
- [ ] Backend imports shared types for request/response validation
- [ ] Frontend imports shared types for API service methods
- [ ] Build order ensures types compile before frontend/backend
- [ ] At least 3 API endpoints migrated to use shared schemas
- [ ] Type mismatches caught in CI (TypeScript compilation)
- [ ] Documentation for adding new schemas and using shared types
- [ ] All existing tests passing after migration
- [ ] Zero runtime regressions after migration

## Tasks
**✅ Feature broken down into 7 implementation tasks (35-50 hours total)**

- [ ] **task-104**: Create shared types package structure and build setup (4-6 hours)
- [ ] **task-105**: Define core domain schemas with Zod (User, Household, Child, Task, Assignment) (6-8 hours)
- [ ] **task-106**: Implement OpenAPI schema generator (5-7 hours)
- [ ] **task-107**: Migrate backend to use shared types (3 endpoints: tasks, households, children) (6-8 hours)
- [ ] **task-108**: Migrate frontend services to use shared types (TaskService, HouseholdService, ChildrenService) (5-7 hours)
- [ ] **task-109**: Update build pipeline for type compilation order (3-4 hours)
- [ ] **task-110**: Integration testing and developer documentation (4-5 hours)

## Dependencies
- Epic-001 (Multi-Tenant Foundation) - ✅ Complete
- Epic-002 (Task Management Core) - ✅ Complete
- feature-013 (Task Templates) - ✅ Complete (provides schemas to migrate)
- feature-014 (Assignment Engine) - ✅ Complete (provides schemas to migrate)
- feature-015 (Task Viewing) - ✅ Complete (provides schemas to migrate)

## Technical Notes

### Current State Analysis

**Backend Schema Files:**
- `apps/backend/src/schemas/common.ts` - UUID, error, date schemas
- `apps/backend/src/schemas/auth.ts` - Register, login, token refresh
- `apps/backend/src/schemas/tasks.ts` - Task template CRUD
- `apps/backend/src/schemas/assignments.ts` - Assignment query and completion
- `apps/backend/src/schemas/households.ts` - Household CRUD
- `apps/backend/src/schemas/children.ts` - Children CRUD

**Frontend Service Types:**
- `apps/frontend/src/app/services/task.service.ts` - TaskTemplate, CreateTaskRequest, UpdateTaskRequest, TaskAssignment
- `apps/frontend/src/app/services/household.service.ts` - Household, HouseholdMember
- `apps/frontend/src/app/services/children.service.ts` - Child, CreateChildRequest
- `apps/frontend/src/app/services/invitation.service.ts` - Invitation, SendInvitationRequest
- `apps/frontend/src/app/services/dashboard.service.ts` - DashboardSummary, ChildTask

**Problems with Current Approach:**
1. **Type Duplication**: Same interfaces defined separately in frontend and backend
2. **Maintenance Burden**: Updates require changes in multiple places
3. **Inconsistency Risk**: Frontend expects camelCase, backend uses snake_case
4. **No Compile-Time Safety**: API changes don't trigger TypeScript errors in frontend
5. **Manual OpenAPI Schemas**: Backend schemas written by hand, easy to drift from code

### Proposed Solution

**Package Structure:**
```
packages/
└── types/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── schemas/
    │   │   ├── user.schema.ts
    │   │   ├── household.schema.ts
    │   │   ├── child.schema.ts
    │   │   ├── task.schema.ts
    │   │   ├── assignment.schema.ts
    │   │   ├── invitation.schema.ts
    │   │   └── index.ts
    │   ├── types/
    │   │   ├── api.types.ts (request/response interfaces)
    │   │   ├── domain.types.ts (core domain models)
    │   │   └── index.ts
    │   └── index.ts (main export)
    ├── generators/
    │   ├── openapi.generator.ts (TypeScript → OpenAPI)
    │   └── case-converter.ts (snake_case ↔ camelCase)
    └── dist/ (compiled output)
```

**Technology Stack:**
- **Schema Definition**: TypeScript interfaces + JSDoc decorators
- **Schema Validation**: [Zod](https://zod.dev/) or [TypeBox](https://github.com/sinclairzx81/typebox)
- **OpenAPI Generation**: [@fastify/type-provider-typebox](https://github.com/fastify/fastify-type-provider-typebox) or custom generator
- **Case Conversion**: [camelcase-keys](https://www.npmjs.com/package/camelcase-keys) / [snakecase-keys](https://www.npmjs.com/package/snakecase-keys)

**Migration Strategy:**
1. Phase 1: Create shared types package with 3 core schemas (User, Household, Task)
2. Phase 2: Migrate backend validation for those 3 schemas
3. Phase 3: Migrate frontend services for those 3 schemas
4. Phase 4: Verify E2E tests still pass with shared types
5. Phase 5: Migrate remaining schemas (Child, Assignment, Invitation)
6. Phase 6: Remove duplicated type definitions from frontend/backend

### Database Changes
None - this is a code architecture change only.

### API Endpoints
No new endpoints. Existing endpoints will be refactored to use shared schemas for validation.

### Frontend Components
No new components. Existing services will import types from shared package.

### Third-Party Integrations
- **Zod** or **TypeBox**: Runtime schema validation + TypeScript types
- **@fastify/type-provider-typebox** (optional): Fastify integration for type-safe routes

## UI/UX Considerations
This is a backend/infrastructure feature with no direct UI impact. However, better type safety will:
- Reduce API integration bugs (fewer error messages for users)
- Faster development velocity (IDE autocomplete, compile-time checks)
- More reliable API documentation (OpenAPI always in sync)

## Implementation Plan
[To be filled by Orchestrator Agent after task breakdown]

### Phase 1: Shared Types Package Setup (task-XXX)
- Create `packages/types/` directory structure
- Configure `package.json` with TypeScript exports
- Set up `tsconfig.json` with strict settings
- Configure build scripts (compile TypeScript → dist/)
- Add to monorepo workspace configuration

### Phase 2: Core Schema Definitions (task-XXX)
- Define User schema (id, email, google_id, etc.)
- Define Household schema (id, name, admin_user_id, etc.)
- Define Child schema (id, household_id, name, etc.)
- Define Task schema (id, household_id, name, rule_type, etc.)
- Define Assignment schema (id, task_id, child_id, date, status, etc.)
- Export TypeScript types and runtime schemas

### Phase 3: OpenAPI Schema Generator (task-XXX)
- Implement TypeScript → OpenAPI converter
- Handle snake_case vs camelCase conventions
- Generate JSON Schema for Fastify validation
- Test generator with existing schemas

### Phase 4: Backend Migration (task-XXX)
- Update backend package.json to depend on `@types` package
- Migrate 3 schema files (tasks, households, children)
- Replace manual schemas with imports from shared package
- Update route handlers to use shared types
- Verify existing backend tests still pass

### Phase 5: Frontend Migration (task-XXX)
- Update frontend package.json to depend on `@types` package
- Migrate TaskService to use shared types
- Migrate HouseholdService to use shared types
- Migrate ChildrenService to use shared types
- Update API service to use shared request/response types
- Verify existing frontend tests still pass

### Phase 6: Build Pipeline Integration (task-XXX)
- Configure build order: types → backend → frontend
- Add type compilation to root `package.json` scripts
- Update CI pipeline to compile types first
- Add type-check script for pre-commit hooks

### Phase 7: Testing & Documentation (task-XXX)
- Write schema validation tests (valid/invalid inputs)
- Write type consistency tests (backend ↔ frontend)
- Integration tests for 3 migrated endpoints
- Document adding new schemas
- Document using shared types in services
- Add examples to README

## Progress Log
- [2025-12-22 15:30] Feature created by Planner Agent
- [2025-12-22 15:45] Tasks created (task-104 through task-110) - 7 tasks, 35-50 hours
- [2025-12-22 15:45] Status: ready-for-implementation

## Testing Strategy
- [ ] Unit tests for schema validators (Zod/TypeBox)
- [ ] Unit tests for OpenAPI generator
- [ ] Unit tests for case conversion utilities
- [ ] Integration tests for backend endpoints using shared schemas
- [ ] Integration tests for frontend services using shared types
- [ ] E2E tests verify no regressions after migration
- [ ] Type compilation tests in CI (ensure types are valid)
- [ ] Schema validation tests (reject invalid data)

## Related PRs
[To be added during implementation]

## Demo/Screenshots
Not applicable - this is an infrastructure/architecture feature.

## Success Metrics
- **Type Safety**: 100% of API request/response interfaces typed
- **Code Reduction**: 30%+ reduction in duplicated type definitions
- **Build Time**: < 5 seconds added to total build time
- **Developer Velocity**: 20%+ faster API integration (fewer bugs, better autocomplete)
- **Maintenance**: Single location for all schema updates

## Lessons Learned
[To be filled after completion]

## References
- [Zod Documentation](https://zod.dev/)
- [TypeBox Documentation](https://github.com/sinclairzx81/typebox)
- [@fastify/type-provider-typebox](https://github.com/fastify/fastify-type-provider-typebox)
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [JSON Schema Specification](https://json-schema.org/)

