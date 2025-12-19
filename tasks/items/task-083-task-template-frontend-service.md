# Task: Task Template Frontend Service

## Metadata
- **ID**: task-083
- **Feature**: [feature-013-task-template-management](../features/feature-013-task-template-management.md)
- **Epic**: [epic-002-task-management-core](../epics/epic-002-task-management-core.md)
- **Status**: in-progress
- **Priority**: critical
- **Created**: 2025-12-19
- **Assigned Agent**: frontend-agent
- **Estimated Duration**: 3-4 hours

## Description
Create Angular service for task template API integration with signals-based state management. This service provides methods for CRUD operations on task templates and maintains reactive state for the frontend components.

## Requirements

### Service Interface
```typescript
export interface TaskTemplate {
  id: number;
  household_id: number;
  title: string;
  description: string | null;
  rule_type: 'weekly_rotation' | 'repeating' | 'daily';
  rotation_type: 'odd_even_week' | 'alternating' | null;
  repeat_days: number[] | null;
  assigned_children: number[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  rule_type: 'weekly_rotation' | 'repeating' | 'daily';
  rotation_type?: 'odd_even_week' | 'alternating';
  repeat_days?: number[];
  assigned_children?: number[];
  active?: boolean;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  rule_type?: 'weekly_rotation' | 'repeating' | 'daily';
  rotation_type?: 'odd_even_week' | 'alternating';
  repeat_days?: number[];
  assigned_children?: number[];
  active?: boolean;
}
```

### Service Methods
1. **createTask(householdId, data)** - Create task template
2. **getTasks(householdId, activeOnly?)** - List tasks with optional filter
3. **getTask(householdId, taskId)** - Get single task details
4. **updateTask(householdId, taskId, data)** - Update task template
5. **deleteTask(householdId, taskId)** - Soft delete task

### State Management with Signals
```typescript
private tasksSignal = signal<TaskTemplate[]>([]);
private loadingSignal = signal<boolean>(false);
private errorSignal = signal<string | null>(null);

// Public readonly signals
public readonly tasks = this.tasksSignal.asReadonly();
public readonly loading = this.loadingSignal.asReadonly();
public readonly error = this.errorSignal.asReadonly();

// Computed signals
public readonly activeTasks = computed(() => 
  this.tasksSignal().filter(t => t.active)
);

public readonly inactiveTasks = computed(() =>
  this.tasksSignal().filter(t => !t.active)
);
```

### API Integration
- Use `ApiService` for HTTP requests (follows existing pattern)
- All endpoints require authentication (handled by interceptor)
- Error handling with user-friendly messages

## Acceptance Criteria
- [ ] Service created at `apps/frontend/src/app/services/task.service.ts`
- [ ] TypeScript interfaces defined for all API request/response types
- [ ] createTask() sends POST request and adds to state on success
- [ ] getTasks() sends GET request and updates state
- [ ] getTasks() supports activeOnly parameter
- [ ] getTask() sends GET request for single task
- [ ] updateTask() sends PUT request and updates state on success
- [ ] deleteTask() sends DELETE request and removes from state on success
- [ ] All methods return Observables for component subscription
- [ ] Loading state managed with signals during API calls
- [ ] Error state managed with signals for display in components
- [ ] Signals are readonly from outside the service
- [ ] Computed signals for active/inactive tasks
- [ ] Error messages are user-friendly (not raw API errors)
- [ ] Service follows Angular standalone pattern
- [ ] Service uses inject() for dependencies
- [ ] Service has providedIn: 'root'

## Technical Implementation

### Service Structure
```typescript
import { Injectable, signal, computed } from '@angular/core';
import { inject } from '@angular/core';
import { Observable, tap, catchError, of } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private apiService = inject(ApiService);
  
  // State signals
  private tasksSignal = signal<TaskTemplate[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);
  
  // Public readonly signals
  public readonly tasks = this.tasksSignal.asReadonly();
  public readonly loading = this.loadingSignal.asReadonly();
  public readonly error = this.errorSignal.asReadonly();
  
  // Computed signals
  public readonly activeTasks = computed(() => 
    this.tasksSignal().filter(t => t.active)
  );
  
  public readonly inactiveTasks = computed(() =>
    this.tasksSignal().filter(t => !t.active)
  );
  
  /**
   * Create a new task template
   */
  createTask(householdId: number, data: CreateTaskRequest): Observable<TaskTemplate> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    
    return this.apiService.post<TaskTemplate>(
      `/households/${householdId}/tasks`,
      data
    ).pipe(
      tap(task => {
        // Add to state
        this.tasksSignal.update(tasks => [...tasks, task]);
        this.loadingSignal.set(false);
      }),
      catchError(err => {
        this.errorSignal.set('Failed to create task template');
        this.loadingSignal.set(false);
        throw err;
      })
    );
  }
  
  /**
   * Get all task templates for household
   */
  getTasks(householdId: number, activeOnly: boolean = true): Observable<TaskTemplate[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    
    const params = activeOnly ? { active: 'true' } : {};
    
    return this.apiService.get<TaskTemplate[]>(
      `/households/${householdId}/tasks`,
      params
    ).pipe(
      tap(tasks => {
        this.tasksSignal.set(tasks);
        this.loadingSignal.set(false);
      }),
      catchError(err => {
        this.errorSignal.set('Failed to load task templates');
        this.loadingSignal.set(false);
        throw err;
      })
    );
  }
  
  /**
   * Get single task template
   */
  getTask(householdId: number, taskId: number): Observable<TaskTemplate> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    
    return this.apiService.get<TaskTemplate>(
      `/households/${householdId}/tasks/${taskId}`
    ).pipe(
      tap(() => this.loadingSignal.set(false)),
      catchError(err => {
        this.errorSignal.set('Failed to load task template');
        this.loadingSignal.set(false);
        throw err;
      })
    );
  }
  
  /**
   * Update task template
   */
  updateTask(
    householdId: number,
    taskId: number,
    data: UpdateTaskRequest
  ): Observable<TaskTemplate> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    
    return this.apiService.put<TaskTemplate>(
      `/households/${householdId}/tasks/${taskId}`,
      data
    ).pipe(
      tap(updatedTask => {
        // Update in state
        this.tasksSignal.update(tasks =>
          tasks.map(t => t.id === taskId ? updatedTask : t)
        );
        this.loadingSignal.set(false);
      }),
      catchError(err => {
        this.errorSignal.set('Failed to update task template');
        this.loadingSignal.set(false);
        throw err;
      })
    );
  }
  
  /**
   * Delete task template (soft delete)
   */
  deleteTask(householdId: number, taskId: number): Observable<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    
    return this.apiService.delete<void>(
      `/households/${householdId}/tasks/${taskId}`
    ).pipe(
      tap(() => {
        // Remove from state or mark inactive
        this.tasksSignal.update(tasks =>
          tasks.map(t => t.id === taskId ? { ...t, active: false } : t)
        );
        this.loadingSignal.set(false);
      }),
      catchError(err => {
        this.errorSignal.set('Failed to delete task template');
        this.loadingSignal.set(false);
        throw err;
      })
    );
  }
  
  /**
   * Clear error state
   */
  clearError(): void {
    this.errorSignal.set(null);
  }
}
```

### File Location
- `apps/frontend/src/app/services/task.service.ts`

### Pattern Consistency
Follow patterns from existing services:
- `AuthService` - JWT token management, signals
- `HouseholdService` - API integration, state management
- `ChildrenService` - CRUD operations with signals

## Dependencies
- task-082 (Backend API) ✅ Must be implemented first
- `ApiService` ✅ Already exists
- `HouseholdService` ✅ Already exists (for household context)

## Testing Strategy
Unit tests should cover:
- All service methods make correct API calls
- State signals update correctly on success
- Error signals set correctly on failure
- Loading state managed properly
- Computed signals calculate correctly
- Observable streams complete properly

## Files to Create
- `apps/frontend/src/app/services/task.service.ts`
- `apps/frontend/src/app/services/task.service.spec.ts`

## Progress Log
- [2025-12-19] Task created for feature-013 breakdown
- [2025-12-19 12:25] Status changed to in-progress - Delegating to frontend-agent
