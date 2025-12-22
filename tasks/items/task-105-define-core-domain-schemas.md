# Task: Define Core Domain Schemas with Zod

## Metadata
- **ID**: task-105
- **Feature**: feature-016 - Shared TypeScript Schema & Type System
- **Epic**: epic-002 - Task Management Core
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-22
- **Assigned Agent**: backend-agent
- **Estimated Duration**: 6-8 hours

## Description
Define the core domain schemas using Zod that will serve as the single source of truth for all data models in the application. These schemas provide both TypeScript types (via type inference) and runtime validation. The schemas must handle conversion between snake_case (database/API) and camelCase (frontend) conventions.

## Requirements
- Requirement 1: Define Zod schemas for User, Household, Child, Task, Assignment models
- Requirement 2: Schemas match existing database schema and API contracts
- Requirement 3: Export TypeScript types inferred from Zod schemas
- Requirement 4: Include validation rules (required fields, string lengths, enums)
- Requirement 5: Document snake_case → camelCase mappings
- Requirement 6: Create base schemas for common fields (UUID, timestamps)
- Requirement 7: Define request/response schemas for API endpoints

## Acceptance Criteria
- [ ] `user.schema.ts` created with User schema (id, email, googleId, createdAt)
- [ ] `household.schema.ts` created with Household schema (id, name, adminUserId, createdAt)
- [ ] `child.schema.ts` created with Child schema (id, householdId, name, createdAt)
- [ ] `task.schema.ts` created with Task schema (id, name, ruleType, assignmentRule, points, etc.)
- [ ] `assignment.schema.ts` created with Assignment schema (id, taskId, childId, date, status, etc.)
- [ ] All schemas export TypeScript types (e.g., `export type User = z.infer<typeof UserSchema>`)
- [ ] Validation rules match backend Fastify schemas
- [ ] Common schemas defined (UUIDSchema, DateSchema, PaginationSchema)
- [ ] Request/response schemas defined (e.g., CreateTaskRequest, TaskResponse)
- [ ] Unit tests for each schema (valid/invalid inputs)
- [ ] Documentation comments for each field
- [ ] All schemas exported from `src/schemas/index.ts`

## Dependencies
- task-104: Create shared types package structure (must be completed first)

## Technical Notes

### Schema Design Principles
1. **Snake Case for API**: Database and API use snake_case (e.g., `created_at`, `admin_user_id`)
2. **Camel Case for Frontend**: TypeScript/Frontend uses camelCase (e.g., `createdAt`, `adminUserId`)
3. **Transformations**: Zod `.transform()` handles case conversion
4. **Validation**: Use Zod validators (`.min()`, `.max()`, `.email()`, `.uuid()`)
5. **Optional vs Required**: Match backend schema requirements

### Example Schema Structure
```typescript
import { z } from 'zod';

// Base schemas
export const UUIDSchema = z.string().uuid();
export const DateSchema = z.string().datetime();

// Domain schema (API/database format - snake_case)
export const UserSchemaAPI = z.object({
  id: UUIDSchema,
  email: z.string().email(),
  google_id: z.string().nullable(),
  created_at: DateSchema,
});

// Frontend format (camelCase)
export const UserSchema = UserSchemaAPI.transform(data => ({
  id: data.id,
  email: data.email,
  googleId: data.google_id,
  createdAt: data.created_at,
}));

// TypeScript type
export type User = z.infer<typeof UserSchema>;
export type UserAPI = z.infer<typeof UserSchemaAPI>;
```

### Schemas to Define

#### 1. Common Schemas (`common.schema.ts`)
```typescript
export const UUIDSchema = z.string().uuid();
export const DateSchema = z.string().datetime();
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});
```

#### 2. User Schema (`user.schema.ts`)
- Fields: id, email, google_id, created_at
- Validation: email format, UUID for id
- Types: User, UserAPI

#### 3. Household Schema (`household.schema.ts`)
- Fields: id, name, admin_user_id, created_at, updated_at
- Validation: name length (1-100 chars), UUID for ids
- Types: Household, HouseholdAPI, CreateHouseholdRequest, UpdateHouseholdRequest

#### 4. Child Schema (`child.schema.ts`)
- Fields: id, household_id, name, created_at
- Validation: name length (1-100 chars), UUID for ids
- Types: Child, ChildAPI, CreateChildRequest, UpdateChildRequest

#### 5. Task Schema (`task.schema.ts`)
- Fields: id, household_id, name, description, rule_type, assignment_rule, points, is_active, created_at
- Validation: rule_type enum ('daily' | 'repeating' | 'weekly_rotation')
- Types: Task, TaskAPI, CreateTaskRequest, UpdateTaskRequest, TaskResponse

#### 6. Assignment Schema (`assignment.schema.ts`)
- Fields: id, task_id, child_id, date, status, completed_at, notes
- Validation: status enum ('pending' | 'completed' | 'skipped'), date format
- Types: Assignment, AssignmentAPI, QueryAssignmentsRequest, CompleteAssignmentRequest

### Request/Response Schema Pattern
```typescript
// API Request (from frontend - camelCase)
export const CreateTaskRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  ruleType: z.enum(['daily', 'repeating', 'weekly_rotation']),
  assignmentRule: z.record(z.unknown()),
  points: z.number().int().min(0).default(1),
});

export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;

// API Response (to frontend - camelCase)
export const TaskResponseSchema = TaskSchema;
export type TaskResponse = Task;
```

### Testing Strategy
For each schema:
1. **Valid Input Test**: Verify schema accepts valid data
2. **Invalid Input Test**: Verify schema rejects invalid data
3. **Type Inference Test**: Verify TypeScript types are correct
4. **Transformation Test**: Verify snake_case → camelCase works
5. **Validation Rules Test**: Test min/max lengths, enums, etc.

Example test:
```typescript
import { describe, it, expect } from 'vitest';
import { UserSchema, UserSchemaAPI } from './user.schema';

describe('UserSchema', () => {
  it('should validate a valid user', () => {
    const result = UserSchemaAPI.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      google_id: null,
      created_at: '2025-12-22T10:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = UserSchemaAPI.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'not-an-email',
      google_id: null,
      created_at: '2025-12-22T10:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('should transform snake_case to camelCase', () => {
    const apiData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      google_id: 'google-123',
      created_at: '2025-12-22T10:00:00Z',
    };
    const result = UserSchema.parse(apiData);
    expect(result.googleId).toBe('google-123');
    expect(result.createdAt).toBe('2025-12-22T10:00:00Z');
  });
});
```

## Affected Areas
- [x] Frontend (Angular) - will use inferred TypeScript types
- [x] Backend (Fastify/Node.js) - will use schemas for validation
- [ ] Database (PostgreSQL) - no direct impact (schemas match existing DB schema)
- [ ] Infrastructure (Docker/Nginx) - no impact
- [ ] CI/CD - tests will run in CI
- [x] Documentation - JSDoc comments on schemas

## Implementation Plan

### Phase 1: Common Schemas
1. Create `src/schemas/common.schema.ts`
2. Define `UUIDSchema`, `DateSchema`, `PaginationSchema`
3. Export from `src/schemas/index.ts`
4. Write unit tests

### Phase 2: User Schema
1. Create `src/schemas/user.schema.ts`
2. Define `UserSchemaAPI` (snake_case)
3. Define `UserSchema` with transformation (camelCase)
4. Export types: `User`, `UserAPI`
5. Write unit tests (valid, invalid, transformation)

### Phase 3: Household Schema
1. Create `src/schemas/household.schema.ts`
2. Define schemas: HouseholdSchemaAPI, HouseholdSchema
3. Define request schemas: CreateHouseholdRequest, UpdateHouseholdRequest
4. Export types
5. Write unit tests

### Phase 4: Child Schema
1. Create `src/schemas/child.schema.ts`
2. Define schemas: ChildSchemaAPI, ChildSchema
3. Define request schemas: CreateChildRequest, UpdateChildRequest
4. Export types
5. Write unit tests

### Phase 5: Task Schema
1. Create `src/schemas/task.schema.ts`
2. Define TaskSchemaAPI with all fields
3. Define CreateTaskRequest, UpdateTaskRequest
4. Handle nested `assignment_rule` JSON field
5. Export types
6. Write unit tests (including enum validation)

### Phase 6: Assignment Schema
1. Create `src/schemas/assignment.schema.ts`
2. Define AssignmentSchemaAPI
3. Define QueryAssignmentsRequest, CompleteAssignmentRequest
4. Export types
5. Write unit tests (including status enum)

### Phase 7: Integration and Documentation
1. Update `src/schemas/index.ts` to export all schemas
2. Update `src/types/domain.types.ts` to re-export all types
3. Update `src/types/api.types.ts` with request/response types
4. Write comprehensive JSDoc comments
5. Update package README with usage examples

## Agent Assignments

### Subtask 1: Common and User Schemas
- **Agent**: backend-agent
- **Status**: pending
- **Instructions**: Implement Phase 1 and Phase 2

### Subtask 2: Household and Child Schemas
- **Agent**: backend-agent
- **Status**: pending
- **Instructions**: Implement Phase 3 and Phase 4

### Subtask 3: Task and Assignment Schemas
- **Agent**: backend-agent
- **Status**: pending
- **Instructions**: Implement Phase 5 and Phase 6

### Subtask 4: Integration and Testing
- **Agent**: backend-agent
- **Status**: pending
- **Instructions**: Implement Phase 7, ensure all tests pass

## Progress Log
- [2025-12-22 16:15] Task created by Orchestrator Agent

## Testing Results
[To be filled during testing phase]

## Review Notes
[To be filled during review phase]

## Related PRs
[To be added during implementation]

## Lessons Learned
[To be filled after completion]
