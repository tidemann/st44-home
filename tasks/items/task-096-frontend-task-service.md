# Task: Frontend TaskService for Viewing & Completion

## Metadata
- **ID**: task-096
- **Feature**: [feature-015-task-viewing-completion](../features/feature-015-task-viewing-completion.md)
- **Epic**: [epic-002-task-management-core](../epics/epic-002-task-management-core.md)
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-19
- **Estimated Duration**: 3-4 hours
- **Agent Assignment**: frontend-agent

## Description
Create or extend TaskService to handle task assignment queries, completion, and reassignment. Uses Angular signals for reactive state management and optimistic updates.

## Requirements

### Service Methods

#### Query Methods
```typescript
getChildTasks(childId: string, date?: string, status?: string): Observable<TaskAssignment[]>
getHouseholdAssignments(householdId: string, filters?: AssignmentFilters): Observable<TaskAssignment[]>
```

#### Mutation Methods
```typescript
completeTask(assignmentId: string): Observable<TaskAssignment>
reassignTask(assignmentId: string, newChildId: string): Observable<TaskAssignment>
```

### State Management (Signals)
```typescript
private assignments = signal<TaskAssignment[]>([]);
public assignments$ = computed(() => this.assignments());

// Filtered views
public childTasks$ = computed(() => 
  this.assignments().filter(a => a.childId === this.currentChildId())
);

public pendingTasks$ = computed(() =>
  this.assignments().filter(a => a.status === 'pending')
);

public completedTasks$ = computed(() =>
  this.assignments().filter(a => a.status === 'completed')
);

public overdueTasks$ = computed(() =>
  this.assignments().filter(a => 
    a.status === 'pending' && new Date(a.date) < new Date()
  )
);
```

### Optimistic Updates
- Immediately update local state on mutation
- Rollback if API call fails
- Show loading indicator during API call

```typescript
completeTask(assignmentId: string): Observable<TaskAssignment> {
  // Optimistic update
  const previousAssignments = this.assignments();
  this.assignments.update(assignments =>
    assignments.map(a => 
      a.id === assignmentId 
        ? { ...a, status: 'completed', completedAt: new Date().toISOString() }
        : a
    )
  );

  // API call
  return this.http.put<TaskAssignment>(
    `${this.apiUrl}/assignments/${assignmentId}/complete`,
    {}
  ).pipe(
    catchError(error => {
      // Rollback on error
      this.assignments.set(previousAssignments);
      return throwError(() => error);
    })
  );
}
```

### TypeScript Interfaces
```typescript
export interface TaskAssignment {
  id: string;
  taskId: string;
  title: string;
  description: string;
  ruleType: 'daily' | 'repeating' | 'weekly_rotation';
  childId?: string;
  childName?: string;
  date: string; // ISO date
  status: 'pending' | 'completed';
  completedAt?: string; // ISO timestamp
}

export interface AssignmentFilters {
  date?: string;
  childId?: string;
  status?: 'pending' | 'completed' | 'overdue';
}
```

## Acceptance Criteria
- [ ] Service extends or creates new TaskService with assignments methods
- [ ] getChildTasks() calls GET /api/children/:childId/tasks
- [ ] getHouseholdAssignments() calls GET /api/households/:householdId/assignments
- [ ] Passes query parameters correctly
- [ ] completeTask() calls PUT /api/assignments/:id/complete
- [ ] Optimistic update for completion
- [ ] Rollback on error
- [ ] reassignTask() calls PUT /api/assignments/:id/reassign
- [ ] Uses signals for state management
- [ ] Computed signals for filtered views
- [ ] Handles loading states
- [ ] Handles error responses
- [ ] All methods tested with unit tests

## Dependencies
- task-094 ✅ Backend query API
- task-095 ✅ Backend completion/reassignment API
- Existing TaskService (if extending) from feature-013
- HttpClient for API calls

## Technical Notes

### Service Location
- Extend existing: `apps/frontend/src/app/services/task.service.ts`
- Or create new: `apps/frontend/src/app/services/assignment.service.ts`
- Recommendation: Extend TaskService to keep task-related logic together

### Environment Configuration
Use existing environment for API base URL:
```typescript
import { environment } from '../../environments/environment';
private apiUrl = environment.apiUrl;
```

### Error Handling
```typescript
catchError((error: HttpErrorResponse) => {
  let errorMessage = 'An error occurred';
  if (error.error?.message) {
    errorMessage = error.error.message;
  }
  // Show error notification
  this.notificationService?.showError(errorMessage);
  return throwError(() => new Error(errorMessage));
})
```

### Date Formatting
Use date-fns for date operations:
```typescript
import { format, parseISO, isToday, isBefore } from 'date-fns';

isOverdue(assignment: TaskAssignment): boolean {
  return assignment.status === 'pending' && 
         isBefore(parseISO(assignment.date), new Date());
}

formatDate(date: string): string {
  return format(parseISO(date), 'MMM d, yyyy');
}
```

## Implementation Plan
1. Extend or create TaskService in `apps/frontend/src/app/services/`
2. Add TaskAssignment and AssignmentFilters interfaces
3. Add signal-based state: assignments$, filtered views
4. Implement getChildTasks() method
5. Implement getHouseholdAssignments() method
6. Implement completeTask() with optimistic updates
7. Implement reassignTask() method
8. Add error handling and loading states
9. Add unit tests (covered in task-097)

## Testing Notes
- Mock HttpClient responses
- Test optimistic updates
- Test rollback on error
- Test signal computed values
- Test query parameter formatting
- Test error handling

## Progress Log
- [2025-12-19 23:55] Task created for feature-015 breakdown
