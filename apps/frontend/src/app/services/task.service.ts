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

  // State signals (private writable)
  private tasksSignal = signal<TaskTemplate[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Public readonly signals
  public readonly tasks = this.tasksSignal.asReadonly();
  public readonly loading = this.loadingSignal.asReadonly();
  public readonly error = this.errorSignal.asReadonly();

  // Computed signals for filtered lists
  public readonly activeTasks = computed(() => this.tasksSignal().filter((t) => t.active));

  public readonly inactiveTasks = computed(() => this.tasksSignal().filter((t) => !t.active));

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
   * Clear error state
   */
  clearError(): void {
    this.errorSignal.set(null);
  }
}
