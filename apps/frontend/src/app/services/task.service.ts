import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, from, map, tap, catchError, throwError } from 'rxjs';
import { ApiService } from './api.service';

/**
 * Task template interface matching backend API response
 */
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

/**
 * Request payload for creating a new task template
 */
export interface CreateTaskRequest {
  name: string;
  description?: string;
  points?: number;
  rule_type: 'weekly_rotation' | 'repeating' | 'daily';
  rule_config?: {
    rotation_type?: 'odd_even_week' | 'alternating';
    repeat_days?: number[];
    assigned_children?: string[];
  };
}

/**
 * Request payload for updating an existing task template
 */
export interface UpdateTaskRequest {
  name?: string;
  description?: string;
  points?: number;
  rule_type?: 'weekly_rotation' | 'repeating' | 'daily';
  rule_config?: {
    rotation_type?: 'odd_even_week' | 'alternating';
    repeat_days?: number[];
    assigned_children?: string[];
  };
}

/**
 * Task assignment interface for viewing and completion
 */
export interface TaskAssignment {
  id: string;
  task_id: string;
  title: string;
  description: string | null;
  rule_type: 'daily' | 'repeating' | 'weekly_rotation';
  child_id?: string;
  child_name?: string;
  date: string; // ISO date
  status: 'pending' | 'completed';
  completed_at?: string; // ISO timestamp
}

/**
 * Filters for querying task assignments
 */
export interface AssignmentFilters {
  date?: string;
  child_id?: string;
  status?: 'pending' | 'completed';
}

/**
 * Service for managing task templates with signals-based state management
 *
 * This service provides:
 * - CRUD operations for task templates
 * - Reactive state management using signals
 * - Loading and error state tracking
 * - Computed signals for filtered task lists
 */
@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private apiService = inject(ApiService);

  // Task templates state signals (private writable)
  private tasksSignal = signal<TaskTemplate[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Task assignments state signals (private writable)
  private assignmentsSignal = signal<TaskAssignment[]>([]);
  private assignmentsLoadingSignal = signal<boolean>(false);
  private assignmentsErrorSignal = signal<string | null>(null);

  // Public readonly signals for templates
  public readonly tasks = this.tasksSignal.asReadonly();
  public readonly loading = this.loadingSignal.asReadonly();
  public readonly error = this.errorSignal.asReadonly();

  // Public readonly signals for assignments
  public readonly assignments = this.assignmentsSignal.asReadonly();
  public readonly assignmentsLoading = this.assignmentsLoadingSignal.asReadonly();
  public readonly assignmentsError = this.assignmentsErrorSignal.asReadonly();

  // Computed signals for filtered template lists
  public readonly activeTasks = computed(() => this.tasksSignal().filter((t) => t.active));

  public readonly inactiveTasks = computed(() => this.tasksSignal().filter((t) => !t.active));

  // Computed signals for filtered assignment lists
  public readonly pendingAssignments = computed(() =>
    this.assignmentsSignal().filter((a) => a.status === 'pending'),
  );

  public readonly completedAssignments = computed(() =>
    this.assignmentsSignal().filter((a) => a.status === 'completed'),
  );

  public readonly overdueAssignments = computed(() =>
    this.assignmentsSignal().filter(
      (a) => a.status === 'pending' && new Date(a.date) < new Date(new Date().toDateString()),
    ),
  );

  /**
   * Create a new task template
   *
   * @param householdId - ID of the household
   * @param data - Task template data
   * @returns Observable of the created task template
   */
  createTask(householdId: string, data: CreateTaskRequest): Observable<TaskTemplate> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return from(this.apiService.post<TaskTemplate>(`/households/${householdId}/tasks`, data)).pipe(
      tap((task) => {
        // Add to state
        this.tasksSignal.update((tasks) => [...tasks, task]);
        this.loadingSignal.set(false);
      }),
      catchError((err) => {
        this.errorSignal.set('Failed to create task template');
        this.loadingSignal.set(false);
        return throwError(() => err);
      }),
    );
  }

  /**
   * Get all task templates for a household
   *
   * @param householdId - ID of the household
   * @param activeOnly - Filter for active tasks only (default: true)
   * @returns Observable of task template array
   */
  getTasks(householdId: string, activeOnly = true): Observable<TaskTemplate[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const endpoint = activeOnly
      ? `/households/${householdId}/tasks?active=true`
      : `/households/${householdId}/tasks`;

    return from(this.apiService.get<{ tasks: TaskTemplate[] }>(endpoint)).pipe(
      map((response) => response.tasks),
      tap((tasks) => {
        this.tasksSignal.set(tasks);
        this.loadingSignal.set(false);
      }),
      catchError((err) => {
        this.errorSignal.set('Failed to load task templates');
        this.loadingSignal.set(false);
        return throwError(() => err);
      }),
    );
  }

  /**
   * Get a single task template
   *
   * @param householdId - ID of the household
   * @param taskId - ID of the task template
   * @returns Observable of the task template
   */
  getTask(householdId: string, taskId: string): Observable<TaskTemplate> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return from(
      this.apiService.get<TaskTemplate>(`/households/${householdId}/tasks/${taskId}`),
    ).pipe(
      tap(() => {
        this.loadingSignal.set(false);
      }),
      catchError((err) => {
        this.errorSignal.set('Failed to load task template');
        this.loadingSignal.set(false);
        return throwError(() => err);
      }),
    );
  }

  /**
   * Update an existing task template
   *
   * @param householdId - ID of the household
   * @param taskId - ID of the task template
   * @param data - Updated task template data
   * @returns Observable of the updated task template
   */
  updateTask(
    householdId: string,
    taskId: string,
    data: UpdateTaskRequest,
  ): Observable<TaskTemplate> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return from(
      this.apiService.put<TaskTemplate>(`/households/${householdId}/tasks/${taskId}`, data),
    ).pipe(
      tap((updatedTask) => {
        // Update in state
        this.tasksSignal.update((tasks) => tasks.map((t) => (t.id === taskId ? updatedTask : t)));
        this.loadingSignal.set(false);
      }),
      catchError((err) => {
        this.errorSignal.set('Failed to update task template');
        this.loadingSignal.set(false);
        return throwError(() => err);
      }),
    );
  }

  /**
   * Delete a task template (soft delete - marks as inactive)
   *
   * @param householdId - ID of the household
   * @param taskId - ID of the task template
   * @returns Observable of void
   */
  deleteTask(householdId: string, taskId: string): Observable<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return from(this.apiService.delete<void>(`/households/${householdId}/tasks/${taskId}`)).pipe(
      tap(() => {
        // Mark as inactive in state (soft delete)
        this.tasksSignal.update((tasks) =>
          tasks.map((t) => (t.id === taskId ? { ...t, active: false } : t)),
        );
        this.loadingSignal.set(false);
      }),
      catchError((err) => {
        this.errorSignal.set('Failed to delete task template');
        this.loadingSignal.set(false);
        return throwError(() => err);
      }),
    );
  }

  /**
   * Get task assignments for a child
   *
   * @param childId - ID of the child
   * @param date - Optional date filter (ISO format YYYY-MM-DD)
   * @param status - Optional status filter ('pending' | 'completed')
   * @returns Observable of task assignment array
   */
  getChildTasks(childId: string, date?: string, status?: string): Observable<TaskAssignment[]> {
    this.assignmentsLoadingSignal.set(true);
    this.assignmentsErrorSignal.set(null);

    let endpoint = `/children/${childId}/tasks`;
    const params: string[] = [];
    if (date) params.push(`date=${date}`);
    if (status) params.push(`status=${status}`);
    if (params.length > 0) endpoint += `?${params.join('&')}`;

    return from(this.apiService.get<{ assignments: TaskAssignment[] }>(endpoint)).pipe(
      map((response) => response.assignments),
      tap((assignments) => {
        this.assignmentsSignal.set(assignments);
        this.assignmentsLoadingSignal.set(false);
      }),
      catchError((err) => {
        this.assignmentsErrorSignal.set('Failed to load child tasks');
        this.assignmentsLoadingSignal.set(false);
        return throwError(() => err);
      }),
    );
  }

  /**
   * Get task assignments for a household with optional filters
   *
   * @param householdId - ID of the household
   * @param filters - Optional filters (date, child_id, status)
   * @returns Observable of task assignment array
   */
  getHouseholdAssignments(
    householdId: string,
    filters?: AssignmentFilters,
  ): Observable<TaskAssignment[]> {
    this.assignmentsLoadingSignal.set(true);
    this.assignmentsErrorSignal.set(null);

    let endpoint = `/households/${householdId}/assignments`;
    const params: string[] = [];
    if (filters?.date) params.push(`date=${filters.date}`);
    if (filters?.child_id) params.push(`child_id=${filters.child_id}`);
    if (filters?.status) params.push(`status=${filters.status}`);
    if (params.length > 0) endpoint += `?${params.join('&')}`;

    return from(this.apiService.get<{ assignments: TaskAssignment[] }>(endpoint)).pipe(
      map((response) => response.assignments),
      tap((assignments) => {
        this.assignmentsSignal.set(assignments);
        this.assignmentsLoadingSignal.set(false);
      }),
      catchError((err) => {
        this.assignmentsErrorSignal.set('Failed to load household assignments');
        this.assignmentsLoadingSignal.set(false);
        return throwError(() => err);
      }),
    );
  }

  /**
   * Mark a task assignment as complete (with optimistic update)
   *
   * @param assignmentId - ID of the task assignment
   * @returns Observable of the updated task assignment
   */
  completeTask(assignmentId: string): Observable<TaskAssignment> {
    // Optimistic update
    const previousAssignments = this.assignmentsSignal();
    const now = new Date().toISOString();

    this.assignmentsSignal.update((assignments) =>
      assignments.map((a) =>
        a.id === assignmentId ? { ...a, status: 'completed' as const, completed_at: now } : a,
      ),
    );

    // API call
    return from(
      this.apiService.put<TaskAssignment>(`/assignments/${assignmentId}/complete`, {}),
    ).pipe(
      tap((updatedAssignment) => {
        // Update with server response
        this.assignmentsSignal.update((assignments) =>
          assignments.map((a) => (a.id === assignmentId ? updatedAssignment : a)),
        );
      }),
      catchError((err) => {
        // Rollback on error
        this.assignmentsSignal.set(previousAssignments);
        this.assignmentsErrorSignal.set('Failed to complete task');
        return throwError(() => err);
      }),
    );
  }

  /**
   * Reassign a task to a different child
   *
   * @param assignmentId - ID of the task assignment
   * @param newChildId - ID of the child to reassign to
   * @returns Observable of the updated task assignment
   */
  reassignTask(assignmentId: string, newChildId: string): Observable<TaskAssignment> {
    this.assignmentsLoadingSignal.set(true);
    this.assignmentsErrorSignal.set(null);

    return from(
      this.apiService.put<TaskAssignment>(`/assignments/${assignmentId}/reassign`, {
        child_id: newChildId,
      }),
    ).pipe(
      tap((updatedAssignment) => {
        // Update in state
        this.assignmentsSignal.update((assignments) =>
          assignments.map((a) => (a.id === assignmentId ? updatedAssignment : a)),
        );
        this.assignmentsLoadingSignal.set(false);
      }),
      catchError((err) => {
        this.assignmentsErrorSignal.set('Failed to reassign task');
        this.assignmentsLoadingSignal.set(false);
        return throwError(() => err);
      }),
    );
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.errorSignal.set(null);
    this.assignmentsErrorSignal.set(null);
  }
}
