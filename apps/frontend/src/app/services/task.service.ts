import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, from, map, tap, catchError, throwError } from 'rxjs';
import { ApiService } from './api.service';

// Import shared types from @st44/types
import type {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  Assignment,
  AssignmentFilters,
  PaginationMeta,
} from '@st44/types';

/**
 * Pagination options for list queries
 */
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response with items and pagination metadata
 */
export interface PaginatedTasksResponse {
  tasks: Task[];
  pagination: PaginationMeta;
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
  private tasksSignal = signal<Task[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);
  private paginationSignal = signal<PaginationMeta | null>(null);

  // Task assignments state signals (private writable)
  private assignmentsSignal = signal<Assignment[]>([]);
  private assignmentsLoadingSignal = signal<boolean>(false);
  private assignmentsErrorSignal = signal<string | null>(null);

  // Public readonly signals for templates
  public readonly tasks = this.tasksSignal.asReadonly();
  public readonly loading = this.loadingSignal.asReadonly();
  public readonly error = this.errorSignal.asReadonly();
  public readonly pagination = this.paginationSignal.asReadonly();

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
  createTask(householdId: string, data: CreateTaskRequest): Observable<Task> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return from(this.apiService.post<Task>(`/households/${householdId}/tasks`, data)).pipe(
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
   * Get all task templates for a household with pagination
   *
   * @param householdId - ID of the household
   * @param activeOnly - Filter for active tasks only (default: true)
   * @param options - Pagination options (page, pageSize, sortBy, sortOrder)
   * @returns Observable of paginated tasks response
   */
  getTasks(
    householdId: string,
    activeOnly = true,
    options?: PaginationOptions,
  ): Observable<PaginatedTasksResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const params: string[] = [];
    if (activeOnly) params.push('active=true');
    if (options?.page) params.push(`page=${options.page}`);
    if (options?.pageSize) params.push(`pageSize=${options.pageSize}`);
    if (options?.sortBy) params.push(`sortBy=${options.sortBy}`);
    if (options?.sortOrder) params.push(`sortOrder=${options.sortOrder}`);

    const endpoint =
      params.length > 0
        ? `/households/${householdId}/tasks?${params.join('&')}`
        : `/households/${householdId}/tasks`;

    return from(this.apiService.get<PaginatedTasksResponse>(endpoint)).pipe(
      tap((response) => {
        this.tasksSignal.set(response.tasks);
        this.paginationSignal.set(response.pagination);
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
  getTask(householdId: string, taskId: string): Observable<Task> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return from(this.apiService.get<Task>(`/households/${householdId}/tasks/${taskId}`)).pipe(
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
  updateTask(householdId: string, taskId: string, data: UpdateTaskRequest): Observable<Task> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return from(this.apiService.put<Task>(`/households/${householdId}/tasks/${taskId}`, data)).pipe(
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
  getChildTasks(childId: string, date?: string, status?: string): Observable<Assignment[]> {
    this.assignmentsLoadingSignal.set(true);
    this.assignmentsErrorSignal.set(null);

    let endpoint = `/children/${childId}/tasks`;
    const params: string[] = [];
    if (date) params.push(`date=${date}`);
    if (status) params.push(`status=${status}`);
    if (params.length > 0) endpoint += `?${params.join('&')}`;

    return from(this.apiService.get<{ assignments: Assignment[] }>(endpoint)).pipe(
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
   * @param filters - Optional filters (date, childId, status)
   * @returns Observable of task assignment array
   */
  getHouseholdAssignments(
    householdId: string,
    filters?: AssignmentFilters,
  ): Observable<Assignment[]> {
    this.assignmentsLoadingSignal.set(true);
    this.assignmentsErrorSignal.set(null);

    let endpoint = `/households/${householdId}/assignments`;
    const params: string[] = [];
    if (filters?.date) params.push(`date=${filters.date}`);
    if (filters?.childId) params.push(`childId=${filters.childId}`);
    if (filters?.status) params.push(`status=${filters.status}`);
    if (params.length > 0) endpoint += `?${params.join('&')}`;

    return from(this.apiService.get<{ assignments: Assignment[] }>(endpoint)).pipe(
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
   * @returns Observable of the completion response (taskAssignment + completion)
   */
  completeTask(assignmentId: string): Observable<{
    taskAssignment: { id: string; status: string; completedAt: string };
    completion: { id: string; pointsEarned: number; completedAt: string };
  }> {
    // Optimistic update
    const previousAssignments = this.assignmentsSignal();
    const now = new Date().toISOString();

    this.assignmentsSignal.update((assignments) =>
      assignments.map((a) =>
        a.id === assignmentId ? { ...a, status: 'completed' as const, completedAt: now } : a,
      ),
    );

    // API call using POST
    return from(
      this.apiService.post<{
        taskAssignment: { id: string; status: string; completedAt: string };
        completion: { id: string; pointsEarned: number; completedAt: string };
      }>(`/assignments/${assignmentId}/complete`, {}),
    ).pipe(
      tap((response) => {
        // Update with server response
        this.assignmentsSignal.update((assignments) =>
          assignments.map((a) =>
            a.id === assignmentId
              ? {
                  ...a,
                  status: 'completed' as const,
                  completedAt: response.taskAssignment.completedAt,
                }
              : a,
          ),
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
  reassignTask(assignmentId: string, newChildId: string): Observable<Assignment> {
    this.assignmentsLoadingSignal.set(true);
    this.assignmentsErrorSignal.set(null);

    return from(
      this.apiService.put<Assignment>(`/assignments/${assignmentId}/reassign`, {
        childId: newChildId,
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
