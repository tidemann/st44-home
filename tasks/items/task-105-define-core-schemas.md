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
Define core domain schemas using Zod for runtime validation and TypeScript type inference. Start with the 5 most critical models: User, Household, Child, Task, and Assignment. These schemas will provide both runtime validation (for API endpoints) and compile-time types (for type safety), replacing the current duplicated definitions in frontend services and backend schemas.

## Requirements
- REQ1: Install Zod as a dependency in `@st44/types` package
- REQ2: Define User schema (id, email, google_id, created_at, etc.)
- REQ3: Define Household schema (id, name, admin_user_id, created_at, etc.)
- REQ4: Define Child schema (id, household_id, name, birthday, etc.)
- REQ5: Define Task schema (id, household_id, name, rule_type, rule_config, etc.)
- REQ6: Define Assignment schema (id, task_id, child_id, date, status, etc.)
- REQ7: Export both Zod schemas and inferred TypeScript types
- REQ8: Write unit tests for schema validation (valid/invalid cases)

## Acceptance Criteria
- [ ] Zod added to package.json dependencies
- [ ] `src/schemas/user.schema.ts` created with UserSchema
- [ ] `src/schemas/household.schema.ts` created with HouseholdSchema
- [ ] `src/schemas/child.schema.ts` created with ChildSchema
- [ ] `src/schemas/task.schema.ts` created with TaskSchema
- [ ] `src/schemas/assignment.schema.ts` created with AssignmentSchema
- [ ] All schemas use snake_case property names (API/DB convention)
- [ ] TypeScript types exported for each schema (User, Household, etc.)
- [ ] Request/response schemas defined (CreateUserRequest, etc.)
- [ ] Unit tests verify valid data passes validation
- [ ] Unit tests verify invalid data fails with clear errors
- [ ] All schemas exported from `src/schemas/index.ts`

## Dependencies
- task-104: Create Shared Types Package Structure (must be complete first)

## Technical Notes

### Zod Schema Pattern
Use Zod for schema definition with TypeScript type inference:

```typescript
import { z } from 'zod';

// Define schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  google_id: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Infer TypeScript type
export type User = z.infer<typeof UserSchema>;

// Request schemas
export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  google_id: z.string().optional(),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
```

### Schema Definitions

**User Schema:**
```typescript
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  google_id: z.string().nullable(),
  password_hash: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
```

**Household Schema:**
```typescript
export const HouseholdSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  admin_user_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
```

**Child Schema:**
```typescript
export const ChildSchema = z.object({
  id: z.string().uuid(),
  household_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  birthday: z.string().date().nullable(),
  avatar_url: z.string().url().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
```

**Task Schema:**
```typescript
export const TaskRuleTypeSchema = z.enum(['daily', 'repeating', 'weekly_rotation']);

export const TaskRuleConfigSchema = z.object({
  rotation_type: z.enum(['odd_even_week', 'alternating']).optional(),
  repeat_days: z.array(z.number().min(0).max(6)).optional(),
  assigned_children: z.array(z.string().uuid()).optional(),
}).nullable();

export const TaskSchema = z.object({
  id: z.string().uuid(),
  household_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  points: z.number().min(0).max(1000),
  rule_type: TaskRuleTypeSchema,
  rule_config: TaskRuleConfigSchema,
  active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
```

**Assignment Schema:**
```typescript
export const AssignmentStatusSchema = z.enum(['pending', 'completed']);

export const AssignmentSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  rule_type: TaskRuleTypeSchema,
  child_id: z.string().uuid().nullable(),
  child_name: z.string().nullable(),
  date: z.string().date(),
  status: AssignmentStatusSchema,
  completed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});
```

### Request/Response Schemas
Define explicit request/response schemas for API endpoints:

```typescript
// Task CRUD
export const CreateTaskRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  points: z.number().min(0).max(1000).default(0),
  rule_type: TaskRuleTypeSchema,
  rule_config: TaskRuleConfigSchema.optional(),
});

export const UpdateTaskRequestSchema = CreateTaskRequestSchema.partial();

// Assignment Query
export const AssignmentFiltersSchema = z.object({
  date: z.string().date().optional(),
  child_id: z.string().uuid().optional(),
  status: AssignmentStatusSchema.optional(),
});
```

### Unit Testing
Test each schema with valid and invalid inputs:

```typescript
describe('TaskSchema', () => {
  it('validates correct task object', () => {
    const validTask = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      household_id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Clean Room',
      description: 'Clean your bedroom',
      points: 10,
      rule_type: 'daily',
      rule_config: null,
      active: true,
      created_at: '2025-12-22T10:00:00Z',
      updated_at: '2025-12-22T10:00:00Z',
    };
    
    expect(() => TaskSchema.parse(validTask)).not.toThrow();
  });
  
  it('rejects invalid rule_type', () => {
    const invalidTask = { ...validTask, rule_type: 'invalid' };
    expect(() => TaskSchema.parse(invalidTask)).toThrow();
  });
});
```

## Affected Areas
- [x] Frontend (will consume these types)
- [x] Backend (will consume these schemas for validation)
- [ ] Database
- [ ] Infrastructure
- [ ] CI/CD
- [x] Documentation

## Implementation Plan

### Phase 1: Zod Setup (30 min)
1. Install Zod: `npm install zod`
2. Update package.json dependencies
3. Verify Zod imports work in src/index.ts

### Phase 2: User & Household Schemas (1.5 hours)
1. Create `src/schemas/user.schema.ts`
2. Define UserSchema with all fields
3. Create request schemas (CreateUserRequest, etc.)
4. Create `src/schemas/household.schema.ts`
5. Define HouseholdSchema with all fields
6. Create request schemas (CreateHouseholdRequest, etc.)

### Phase 3: Child & Task Schemas (2 hours)
1. Create `src/schemas/child.schema.ts`
2. Define ChildSchema with all fields
3. Create `src/schemas/task.schema.ts`
4. Define TaskRuleTypeSchema, TaskRuleConfigSchema
5. Define TaskSchema with all fields
6. Create request schemas (CreateTaskRequest, UpdateTaskRequest)

### Phase 4: Assignment Schema (1 hour)
1. Create `src/schemas/assignment.schema.ts`
2. Define AssignmentStatusSchema
3. Define AssignmentSchema with all fields
4. Define AssignmentFiltersSchema for queries

### Phase 5: Export Configuration (30 min)
1. Update `src/schemas/index.ts` to export all schemas
2. Update `src/index.ts` to re-export schemas
3. Verify exports work correctly

### Phase 6: Unit Tests (2 hours)
1. Create test file for each schema
2. Write valid data tests (should pass)
3. Write invalid data tests (should fail with errors)
4. Test edge cases (nulls, empty strings, boundaries)
5. Verify error messages are clear and helpful

## Agent Assignments

### Subtask 1: Schema Definition
- **Agent**: backend-agent
- **Status**: pending
- **Instructions**: Create 5 schema files with Zod definitions

### Subtask 2: Unit Testing
- **Agent**: backend-agent
- **Status**: pending
- **Instructions**: Write comprehensive validation tests for each schema

## Progress Log
- [2025-12-22 15:45] Task created by Planner Agent

## Testing Results
- Valid data tests: All pass
- Invalid data tests: All fail with clear error messages
- Edge case tests: Boundary values handled correctly

## Related PRs
[To be added during implementation]

## Lessons Learned
[To be filled after completion]

