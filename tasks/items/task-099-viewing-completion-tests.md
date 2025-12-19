# Task: Integration Tests for Viewing & Completion

## Metadata
- **ID**: task-099
- **Feature**: [feature-015-task-viewing-completion](../features/feature-015-task-viewing-completion.md)
- **Epic**: [epic-002-task-management-core](../epics/epic-002-task-management-core.md)
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-20
- **Estimated Duration**: 6-8 hours
- **Agent Assignment**: testing-agent

## Description
Comprehensive integration tests for task viewing and completion functionality. Covers backend API endpoints, frontend service methods, and E2E user flows for both child and parent perspectives.

## Requirements

### Backend Integration Tests

#### Assignment Query Tests (`assignments.test.ts`)
```typescript
describe('GET /api/children/:childId/tasks', () => {
  test('returns child tasks for specified date', async () => {
    // Setup: Create household, child, tasks, assignments
    // Test: GET /api/children/{childId}/tasks?date=2025-12-20
    // Assert: Returns only that child's tasks for that date
  });

  test('filters by status parameter', async () => {
    // Test: ?status=pending returns only pending
    // Test: ?status=completed returns only completed
  });

  test('returns 403 if child not in user household', async () => {
    // Test: User A tries to access User B's child
    // Assert: 403 Forbidden
  });

  test('defaults to today if no date parameter', async () => {
    // Test: GET without date param
    // Assert: Returns today's tasks
  });

  test('returns empty array if no tasks match', async () => {
    // Test: Query for date with no assignments
    // Assert: Empty array, 200 status
  });
});

describe('GET /api/households/:householdId/assignments', () => {
  test('returns all household assignments', async () => {
    // Setup: Multiple children with assignments
    // Test: GET /api/households/{id}/assignments
    // Assert: Returns all assignments with child names
  });

  test('filters by childId parameter', async () => {
    // Test: ?childId=xyz returns only that child's assignments
  });

  test('filters by status parameter', async () => {
    // Test: ?status=pending
    // Assert: Only pending assignments returned
  });

  test('requires household membership', async () => {
    // Test: User not in household tries to access
    // Assert: 403 Forbidden
  });
});
```

#### Completion & Reassignment Tests
```typescript
describe('PUT /api/assignments/:id/complete', () => {
  test('marks assignment as completed', async () => {
    // Setup: Create pending assignment
    // Test: PUT /api/assignments/{id}/complete
    // Assert: status=completed, completed_at set
  });

  test('returns 400 if already completed', async () => {
    // Setup: Assignment already completed
    // Test: Try to complete again
    // Assert: 400 Bad Request
  });

  test('allows parent to complete any household task', async () => {
    // Test: Parent completes child's task
    // Assert: Success
  });

  test('allows child to complete their own task', async () => {
    // Test: Child user completes their assignment
    // Assert: Success
  });

  test('forbids child from completing other child task', async () => {
    // Test: Child A tries to complete Child B's task
    // Assert: 403 Forbidden
  });
});

describe('PUT /api/assignments/:id/reassign', () => {
  test('reassigns task to different child', async () => {
    // Test: PUT with new childId
    // Assert: child_id updated
  });

  test('requires parent role', async () => {
    // Test: Child tries to reassign
    // Assert: 403 Forbidden
  });

  test('validates new child is in same household', async () => {
    // Test: Try to reassign to child in different household
    // Assert: 400 Bad Request
  });

  test('returns 400 if assignment already completed', async () => {
    // Test: Try to reassign completed task
    // Assert: 400 Bad Request
  });
});
```

### Frontend Service Tests (`task.service.spec.ts`)

```typescript
describe('TaskService - Assignments', () => {
  test('getChildTasks calls correct endpoint with parameters', () => {
    // Mock HTTP
    // Call service.getChildTasks(childId, date, status)
    // Assert: Correct URL and query params
  });

  test('getHouseholdAssignments passes filters correctly', () => {
    // Test: Filters object converted to query params
  });

  test('completeTask performs optimistic update', () => {
    // Setup: assignments signal with data
    // Call: completeTask(id)
    // Assert: Local state updated immediately
    // Assert: API called
  });

  test('completeTask rolls back on API error', () => {
    // Mock HTTP error
    // Call: completeTask(id)
    // Assert: Optimistic update reverted
  });

  test('reassignTask updates assignment child', () => {
    // Call: reassignTask(assignmentId, newChildId)
    // Assert: API called with correct body
  });

  test('computed signals filter correctly', () => {
    // Test: pendingTasks$, completedTasks$, overdueTasks$
    // Assert: Filters applied correctly
  });
});
```

### Frontend Component Tests

#### ChildTaskListComponent Tests
```typescript
describe('ChildTaskListComponent', () => {
  test('displays child tasks on load', () => {
    // Mock service response
    // Assert: Tasks rendered
  });

  test('filters by date (today/week)', () => {
    // Click filter button
    // Assert: Correct date parameter sent to service
  });

  test('shows progress indicator', () => {
    // Mock 3 tasks (1 completed, 2 pending)
    // Assert: "1 of 3 complete"
  });

  test('marks task complete on button click', () => {
    // Click "Mark Complete" button
    // Assert: Service.completeTask called
  });

  test('shows empty state when no tasks', () => {
    // Mock empty response
    // Assert: Empty state message displayed
  });

  test('shows loading spinner during API call', () => {
    // Mock delayed response
    // Assert: Loading indicator visible
  });
});
```

#### ParentTaskDashboardComponent Tests
```typescript
describe('ParentTaskDashboardComponent', () => {
  test('displays all household assignments', () => {
    // Mock service response with multiple children
    // Assert: All assignments rendered
  });

  test('filters by child selector', () => {
    // Select child from dropdown
    // Assert: Only that child's tasks shown
  });

  test('filters by status selector', () => {
    // Select "Pending" status
    // Assert: Only pending tasks shown
  });

  test('shows completion rate statistic', () => {
    // Mock 10 tasks (7 completed)
    // Assert: "70%" displayed
  });

  test('shows overdue count', () => {
    // Mock tasks with past dates
    // Assert: Overdue count correct
  });

  test('opens reassign modal on button click', () => {
    // Click "Reassign" button
    // Assert: Modal visible
  });

  test('reassigns task via modal', () => {
    // Open modal, select new child, click reassign
    // Assert: Service.reassignTask called
    // Assert: Modal closed
  });
});
```

### E2E Tests (`task-viewing-completion.spec.ts`)

```typescript
describe('Task Viewing & Completion - Child Flow', () => {
  test('child sees only their assigned tasks', async ({ page }) => {
    // Setup: Create household with 2 children, assign tasks
    // Login as child 1
    // Navigate to /tasks
    // Assert: Only child 1's tasks visible
  });

  test('child completes task successfully', async ({ page }) => {
    // Setup: Create pending task
    // Login as child
    // Click "Mark Complete"
    // Assert: Task status changes to completed
    // Assert: Database updated
  });

  test('completed tasks show checkmark', async ({ page }) => {
    // Setup: One completed task
    // Assert: Green badge with checkmark visible
  });

  test('overdue tasks highlighted', async ({ page }) => {
    // Setup: Task with yesterday's date
    // Assert: Red/orange badge visible
  });
});

describe('Task Viewing & Completion - Parent Flow', () => {
  test('parent sees all household tasks', async ({ page }) => {
    // Setup: Multiple children with tasks
    // Login as parent
    // Navigate to /household/tasks
    // Assert: All children's tasks visible
  });

  test('parent filters tasks by child', async ({ page }) => {
    // Select child from dropdown
    // Assert: Only that child's tasks shown
  });

  test('parent reassigns task', async ({ page }) => {
    // Click "Reassign" button
    // Select new child
    // Click "Reassign" in modal
    // Assert: Child name updated in UI
    // Assert: Database updated
  });

  test('parent cannot reassign completed task', async ({ page }) => {
    // Setup: Completed task
    // Assert: No "Reassign" button visible
  });
});
```

## Acceptance Criteria

### Backend Tests
- [ ] All assignment query endpoint tests pass
- [ ] All completion endpoint tests pass
- [ ] All reassignment endpoint tests pass
- [ ] Authorization tests verify role-based access
- [ ] Multi-tenant isolation verified
- [ ] Edge cases covered (empty results, invalid params)
- [ ] Error handling tested

### Frontend Tests
- [ ] Service methods tested with HTTP mocks
- [ ] Optimistic updates tested
- [ ] Error rollback tested
- [ ] Child component tests pass
- [ ] Parent component tests pass
- [ ] Filter logic tested
- [ ] Modal functionality tested

### E2E Tests
- [ ] Child can view and complete their tasks
- [ ] Parent can view all household tasks
- [ ] Parent can filter by child/status/date
- [ ] Parent can reassign tasks
- [ ] Visual status indicators working
- [ ] Empty states tested
- [ ] Database changes verified

### Coverage
- [ ] Backend: 80%+ line coverage
- [ ] Frontend: 80%+ line coverage
- [ ] E2E: All critical user flows covered

## Dependencies
- task-094 ✅ Backend query API
- task-095 ✅ Backend completion API
- task-096 ✅ Frontend TaskService
- task-097 ✅ Child component
- task-098 ✅ Parent component

## Technical Notes

### Test Data Setup
```typescript
async function setupTestData() {
  const household = await createHousehold('Test Family');
  const parent = await createUser('parent@example.com');
  await addMemberToHousehold(household.id, parent.id, 'parent');
  
  const child1 = await createChild(household.id, 'Emma');
  const child2 = await createChild(household.id, 'Noah');
  
  const task1 = await createTask(household.id, {
    title: 'Feed dog',
    ruleType: 'daily'
  });
  
  const assignment1 = await createAssignment({
    taskId: task1.id,
    childId: child1.id,
    date: '2025-12-20',
    status: 'pending'
  });
  
  return { household, parent, child1, child2, task1, assignment1 };
}
```

### Test Helpers
- `createTestHousehold()`: Setup household with members
- `createTestAssignments()`: Generate test assignments
- `loginAsParent()`: Authenticate as parent role
- `loginAsChild()`: Authenticate as child role
- `assertDatabaseState()`: Verify database after mutations

## Implementation Plan
1. Write backend integration tests for query endpoints
2. Write backend tests for completion/reassignment
3. Run backend tests, verify all pass
4. Write frontend service unit tests
5. Write child component tests
6. Write parent component tests
7. Run frontend tests, verify all pass
8. Write E2E tests for child flow
9. Write E2E tests for parent flow
10. Run E2E tests, verify all pass
11. Check coverage reports
12. Add missing test cases for edge conditions

## Progress Log
- [2025-12-20 00:10] Task created for feature-015 breakdown
