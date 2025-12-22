# Task: Migrate Frontend Services to Use Shared Types

## Metadata
- **ID**: task-108
- **Feature**: feature-016 - Shared TypeScript Schema & Type System
- **Epic**: epic-002 - Task Management Core
- **Status**: completed
- **Priority**: high
- **Created**: 2025-12-22
- **Started**: 2025-12-22
- **Completed**: 2025-12-22
- **Assigned Agent**: frontend-agent | orchestrator-agent
- **Estimated Duration**: 5-7 hours

## Description
Migrate frontend Angular services to use shared TypeScript types from `@st44/types` instead of manually defined interfaces. Start with 3 core services: TaskService, HouseholdService, and ChildrenService. This migration eliminates type duplication, ensures frontend types match backend schemas exactly, and provides compile-time safety for API integrations. Replace local interface definitions with imports from the shared package.

## Requirements
- REQ1: Add `@st44/types` as dependency in frontend package.json
- REQ2: Migrate TaskService to use shared types (TaskTemplate, CreateTaskRequest, etc.)
- REQ3: Migrate HouseholdService to use shared types (Household, HouseholdMember, etc.)
- REQ4: Migrate ChildrenService to use shared types (Child, CreateChildRequest, etc.)
- REQ5: Remove duplicate interface definitions from service files
- REQ6: Update all service methods to use shared types for parameters and return values
- REQ7: Ensure existing frontend tests still pass (222 tests)
- REQ8: Handle snake_case → camelCase conversion if needed

## Acceptance Criteria
- [x] Frontend package.json includes `@st44/types` dependency
- [x] TaskService imports types from `@st44/types`
- [x] HouseholdService imports types from `@st44/types`
- [x] ChildrenService imports types from `@st44/types`
- [x] No duplicate interface definitions remain in service files
- [x] All service method signatures use shared types
- [x] HTTP request/response bodies use shared types
- [x] All existing frontend unit tests pass (222 tests)
- [x] TypeScript compilation succeeds with no errors
- [x] Components using services still work correctly

## Dependencies
- task-104: Create Shared Types Package (must be built)
- task-105: Define Core Domain Schemas (must have types to import)
- task-107: Backend Migration (recommended to complete first for API consistency)

## Technical Notes

### Adding Dependency

Update `apps/frontend/package.json`:
```json
{
  "dependencies": {
    "@st44/types": "workspace:*"
  }
}
```

Run `npm install` at root to link the workspace package.

### Migration Pattern for Services

**Before (apps/frontend/src/app/services/task.service.ts):**
```typescript
// Local interface definition (duplicated from backend)
export interface TaskTemplate {
  id: string;
  household_id: string;
  name: string;
  description: string | null;
  points: number;
  rule_type: 'weekly_rotation' | 'repeating' | 'daily';
  rule_config: {
    rotation_type?: 'odd_even_week' | 'alternating';
    repeat_days?: number[];
    assigned_children?: string[];
  } | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskRequest {
  name: string;
  description?: string;
  points?: number;
  rule_type: 'weekly_rotation' | 'repeating' | 'daily';
  rule_config?: { ... };
}
```

**After (with shared types):**
```typescript
// Import from shared package - single source of truth!
import type { Task, CreateTaskRequest, UpdateTaskRequest } from '@st44/types';

// Use imported types directly, no local definitions needed
@Injectable({ providedIn: 'root' })
export class TaskService {
  createTask(householdId: string, request: CreateTaskRequest): Observable<Task> {
    // Type-safe request and response!
  }
}
```

### Handling snake_case vs camelCase

Backend uses snake_case (database convention), but Angular typically uses camelCase. Options:

**Option 1: Keep snake_case (Recommended)**
- Use snake_case in shared types to match backend/database
- Frontend uses snake_case for API communication
- Simpler - no conversion needed
- TypeScript will enforce consistent naming

**Option 2: Convert at API Boundary**
- Create utility to convert snake_case ↔ camelCase
- Convert in ApiService before/after HTTP calls
- More work, but allows camelCase in components

For MVP, **Option 1** is recommended for simplicity.

### Files to Migrate

1. **apps/frontend/src/app/services/task.service.ts**
   - Remove: TaskTemplate, CreateTaskRequest, UpdateTaskRequest, TaskAssignment, AssignmentFilters
   - Import: Task, CreateTaskRequest, UpdateTaskRequest, Assignment, AssignmentFilters from @st44/types
   - Update all method signatures

2. **apps/frontend/src/app/services/household.service.ts**
   - Remove: Household, HouseholdMember
   - Import: Household, HouseholdMember from @st44/types
   - Update all method signatures

3. **apps/frontend/src/app/services/children.service.ts**
   - Remove: Child, CreateChildRequest
   - Import: Child, CreateChildRequest from @st44/types
   - Update all method signatures

### Service Migration Example

**TaskService Migration:**

```typescript
import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

// Import shared types
import type {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  Assignment,
  AssignmentFilters
} from '@st44/types';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private apiService = inject(ApiService);
  
  // Signals use shared types
  private tasksSignal = signal<Task[]>([]);
  
  // Methods use shared types
  getTasks(householdId: string, active?: boolean): Observable<Task[]> {
    // ...
  }
  
  createTask(householdId: string, request: CreateTaskRequest): Observable<Task> {
    // ...
  }
  
  updateTask(taskId: string, request: UpdateTaskRequest): Observable<Task> {
    // ...
  }
  
  getAssignments(householdId: string, filters?: AssignmentFilters): Observable<Assignment[]> {
    // ...
  }
}
```

### Testing Considerations

Frontend tests should continue to pass without changes:
- Tests use service method signatures (now type-safe!)
- Mock data must match shared type structure
- Test fixtures may need minor adjustments for snake_case

Update test fixtures if needed:

```typescript
const mockTask: Task = {
  id: '123',
  household_id: '456', // snake_case (matches backend)
  name: 'Clean Room',
  description: null,
  points: 10,
  rule_type: 'daily',
  rule_config: null,
  active: true,
  created_at: '2025-12-22T10:00:00Z',
  updated_at: '2025-12-22T10:00:00Z',
};
```

## Affected Areas
- [x] Frontend (major refactor of service types)
- [ ] Backend
- [ ] Database
- [ ] Infrastructure
- [ ] CI/CD (types package must build first)
- [x] Documentation

## Implementation Plan

### Phase 1: Setup (30 min)
1. Add `@st44/types` to frontend package.json
2. Run `npm install` at root
3. Verify imports work: `import type { Task } from '@st44/types'`
4. Check TypeScript configuration allows workspace imports

### Phase 2: Migrate TaskService (2 hours)
1. Import Task, CreateTaskRequest, UpdateTaskRequest, Assignment, AssignmentFilters from @st44/types
2. Remove local interface definitions
3. Update all method signatures to use imported types
4. Update signal types: `signal<Task[]>([])`
5. Update test fixtures to match shared types
6. Run tests: `npm test` (verify TaskService tests pass)
7. Check TypeScript compilation: `npm run type-check`

### Phase 3: Migrate HouseholdService (1.5 hours)
1. Import Household, HouseholdMember, CreateHouseholdRequest, UpdateHouseholdRequest from @st44/types
2. Remove local interface definitions
3. Update all method signatures to use imported types
4. Update signal types: `signal<Household[]>([])`
5. Update test fixtures to match shared types
6. Run tests: `npm test` (verify HouseholdService tests pass)
7. Check TypeScript compilation: `npm run type-check`

### Phase 4: Migrate ChildrenService (1.5 hours)
1. Import Child, CreateChildRequest, UpdateChildRequest from @st44/types
2. Remove local interface definitions
3. Update all method signatures to use imported types
4. Update signal types: `signal<Child[]>([])`
5. Update test fixtures to match shared types
6. Run tests: `npm test` (verify ChildrenService tests pass)
7. Check TypeScript compilation: `npm run type-check`

### Phase 5: Update Components (1 hour)
1. Check components using TaskService (TaskListComponent, TaskCreateComponent, etc.)
2. Verify components still compile and work with shared types
3. Update component imports if they import types from services
4. Run component tests: `npm test`

### Phase 6: Verification (30 min)
1. Run all frontend tests: `npm test` (222 tests should pass)
2. Run E2E tests to verify no regressions
3. Check for TypeScript errors: `npm run type-check`
4. Manual testing: Create household, add child, create task in browser
5. Verify no console errors in browser dev tools

## Agent Assignments

### Subtask 1: Service Migration
- **Agent**: frontend-agent
- **Status**: pending
- **Instructions**: Migrate 3 service files to use shared types

### Subtask 2: Testing & Verification
- **Agent**: frontend-agent
- **Status**: pending
- **Instructions**: Verify all 222 frontend tests pass after migration

## Progress Log
- [2025-12-22 15:45] Task created by Planner Agent
- [2025-12-22 21:30] Started migration - added @st44/types dependency, migrated TaskService, HouseholdService, ChildrenService
- [2025-12-22 21:45] Updated 9 component files to use shared types
- [2025-12-22 21:50] Local build passed, tests timed out locally
- [2025-12-22 22:00] PR #137 created
- [2025-12-22 22:05] CI failed - missing types build step in frontend workflow + type errors
- [2025-12-22 22:30] Fixed CI: Added types build step, fixed HouseholdListItem interface, corrected day parameter type
- [2025-12-22 22:45] Fixed pre-existing backend test failure in children.test.ts
- [2025-12-22 23:15] All CI checks passing - PR merged successfully

## Testing Results
- Frontend unit tests: 222/222 passing
- Component tests: All passing
- E2E tests: No regressions
- TypeScript compilation: Success, no errors
- Manual browser testing: All features working

## Related PRs
- PR #137: feat(task-108): Migrate frontend services to shared types - **MERGED**
  - https://github.com/tidemann/st44-home/pull/137
  - 26 files changed, 187 insertions(+), 205 deletions(-)

## Lessons Learned
1. **CI Configuration Critical**: Frontend CI workflow was missing "Build shared types package" step that backend had, causing module not found errors. Always verify CI builds dependencies before tests.
2. **Type Strictness Differs**: Local TypeScript compilation was more lenient than CI. Using `Omit<>` utility type created index signatures that CI's strict mode rejected. Prefer explicit interface definitions for clarity.
3. **Test Data Types Matter**: Used `string` type annotation for `day` parameter but schema defines it as `number` (0-6 for days of week). Always check schema definitions before adding type annotations.
4. **Pre-existing Test Failures**: Backend had unrelated test failure (children list expecting array instead of {children: []}). Important to investigate test failures even if they seem unrelated - blocking PR merge.
5. **Successful Pattern**: Migration eliminated 205 lines of duplicate code while adding only 187 lines, demonstrating value of shared type system.

