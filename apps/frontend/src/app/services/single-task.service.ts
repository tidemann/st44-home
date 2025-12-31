import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { ApiService } from './api.service';

/**
 * Available Single Task - enriched task data with availability status
 */
export interface AvailableSingleTask {
  id: string;
  householdId: string;
  name: string;
  description: string | null;
  points: number;
  deadline: Date | null;
  candidateCount: number;
  declineCount: number;
  hasDeadline: boolean;
  daysUntilDeadline: number | null;
}

/**
 * Failed Task - task where all candidates declined or deadline expired
 */
export interface FailedTask {
  id: string;
  name: string;
  description: string | null;
  points: number;
  deadline: Date | null;
  candidateCount: number;
  declineCount: number;
}

/**
 * Candidate Status - child's response to a task
 */
export interface CandidateStatus {
  childId: string;
  childName: string;
  response: 'accepted' | 'declined' | null;
  respondedAt: string | null;
}

/**
 * Assignment response from accept endpoint
 */
export interface AcceptTaskResponse {
  assignment: {
    id: string;
    taskId: string;
    childId: string;
    title: string;
    description: string | null;
    ruleType: string;
    date: string;
    status: string;
    createdAt: string;
  };
}

/**
 * Service for managing single task operations
 *
 * This service provides:
 * - Accept/decline operations for single tasks
 * - Available tasks queries for children
 * - Failed/expired tasks queries for parents
 * - Reactive state management using signals
 */
@Injectable({
  providedIn: 'root',
})
export class SingleTaskService {
  private apiService = inject(ApiService);

  // Available tasks state (for children)
  private availableTasksSignal = signal<AvailableSingleTask[]>([]);
  private availableLoadingSignal = signal<boolean>(false);
  private availableErrorSignal = signal<string | null>(null);

  // Failed tasks state (for parents)
  private failedTasksSignal = signal<FailedTask[]>([]);
  private failedLoadingSignal = signal<boolean>(false);
  private failedErrorSignal = signal<string | null>(null);

  // Expired tasks state (for parents)
  private expiredTasksSignal = signal<FailedTask[]>([]);
  private expiredLoadingSignal = signal<boolean>(false);
  private expiredErrorSignal = signal<string | null>(null);

  // Public readonly signals for available tasks
  public readonly availableTasks = this.availableTasksSignal.asReadonly();
  public readonly availableLoading = this.availableLoadingSignal.asReadonly();
  public readonly availableError = this.availableErrorSignal.asReadonly();

  // Public readonly signals for failed tasks
  public readonly failedTasks = this.failedTasksSignal.asReadonly();
  public readonly failedLoading = this.failedLoadingSignal.asReadonly();
  public readonly failedError = this.failedErrorSignal.asReadonly();

  // Public readonly signals for expired tasks
  public readonly expiredTasks = this.expiredTasksSignal.asReadonly();
  public readonly expiredLoading = this.expiredLoadingSignal.asReadonly();
  public readonly expiredError = this.expiredErrorSignal.asReadonly();

  // Computed signals
  public readonly hasAvailableTasks = computed(() => this.availableTasksSignal().length > 0);
  public readonly hasFailedTasks = computed(() => this.failedTasksSignal().length > 0);
  public readonly hasExpiredTasks = computed(() => this.expiredTasksSignal().length > 0);
  public readonly totalProblemTasks = computed(() => this.failedTasksSignal().length + this.expiredTasksSignal().length);

  /**
   * Accept a single task
   *
   * @param householdId - ID of the household
   * @param taskId - ID of the task to accept
   * @returns Observable of the created assignment
   */
  acceptTask(householdId: string, taskId: string): Observable<AcceptTaskResponse> {
    return this.apiService
      .post<AcceptTaskResponse>(`/households/${householdId}/tasks/${taskId}/accept`, {})
      .pipe(
        tap(() => {
          // Remove from available tasks
          this.availableTasksSignal.update((tasks) => tasks.filter((t) => t.id !== taskId));
        }),
        catchError((error) => {
          console.error('Failed to accept task:', error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Decline a single task
   *
   * @param householdId - ID of the household
   * @param taskId - ID of the task to decline
   * @returns Observable of success response
   */
  declineTask(householdId: string, taskId: string): Observable<{ success: boolean }> {
    return this.apiService
      .post<{ success: boolean }>(`/households/${householdId}/tasks/${taskId}/decline`, {})
      .pipe(
        tap(() => {
          // Remove from available tasks
          this.availableTasksSignal.update((tasks) => tasks.filter((t) => t.id !== taskId));
        }),
        catchError((error) => {
          console.error('Failed to decline task:', error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Undo a decline (child changes their mind)
   *
   * @param householdId - ID of the household
   * @param taskId - ID of the task
   * @param childId - ID of the child
   * @returns Observable of success response
   */
  undoDecline(
    householdId: string,
    taskId: string,
    childId: string,
  ): Observable<{ success: boolean }> {
    return this.apiService
      .delete<{
        success: boolean;
      }>(`/households/${householdId}/tasks/${taskId}/responses/${childId}`)
      .pipe(
        tap(() => {
          // Reload available tasks to show the task again
          this.loadAvailableTasks();
        }),
        catchError((error) => {
          console.error('Failed to undo decline:', error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Get available single tasks for current child
   *
   * @returns Observable of available tasks
   */
  loadAvailableTasks(): Observable<{ tasks: AvailableSingleTask[] }> {
    this.availableLoadingSignal.set(true);
    this.availableErrorSignal.set(null);

    return this.apiService.get<{ tasks: AvailableSingleTask[] }>('/children/available-tasks').pipe(
      tap((response) => {
        this.availableTasksSignal.set(response.tasks);
        this.availableLoadingSignal.set(false);
      }),
      catchError((error) => {
        this.availableErrorSignal.set('Failed to load available tasks');
        this.availableLoadingSignal.set(false);
        console.error('Failed to load available tasks:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get tasks where all candidates declined
   *
   * @param householdId - ID of the household
   * @returns Observable of failed tasks
   */
  loadFailedTasks(householdId: string): Observable<{ tasks: FailedTask[] }> {
    this.failedLoadingSignal.set(true);
    this.failedErrorSignal.set(null);

    return this.apiService
      .get<{ tasks: FailedTask[] }>(`/households/${householdId}/single-tasks/failed`)
      .pipe(
        tap((response) => {
          this.failedTasksSignal.set(response.tasks);
          this.failedLoadingSignal.set(false);
        }),
        catchError((error) => {
          this.failedErrorSignal.set('Failed to load failed tasks');
          this.failedLoadingSignal.set(false);
          console.error('Failed to load failed tasks:', error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Get tasks past deadline with no acceptance
   *
   * @param householdId - ID of the household
   * @returns Observable of expired tasks
   */
  loadExpiredTasks(householdId: string): Observable<{ tasks: FailedTask[] }> {
    this.expiredLoadingSignal.set(true);
    this.expiredErrorSignal.set(null);

    return this.apiService
      .get<{ tasks: FailedTask[] }>(`/households/${householdId}/single-tasks/expired`)
      .pipe(
        tap((response) => {
          this.expiredTasksSignal.set(response.tasks);
          this.expiredLoadingSignal.set(false);
        }),
        catchError((error) => {
          this.expiredErrorSignal.set('Failed to load expired tasks');
          this.expiredLoadingSignal.set(false);
          console.error('Failed to load expired tasks:', error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Get candidates for a task with their response status
   *
   * @param householdId - ID of the household
   * @param taskId - ID of the task
   * @returns Observable of candidate statuses
   */
  getTaskCandidates(
    householdId: string,
    taskId: string,
  ): Observable<{ candidates: CandidateStatus[] }> {
    return this.apiService
      .get<{
        candidates: CandidateStatus[];
      }>(`/households/${householdId}/tasks/${taskId}/candidates`)
      .pipe(
        catchError((error) => {
          console.error('Failed to load task candidates:', error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Clear all state (useful when logging out or switching households)
   */
  clearState(): void {
    this.availableTasksSignal.set([]);
    this.failedTasksSignal.set([]);
    this.expiredTasksSignal.set([]);
    this.availableErrorSignal.set(null);
    this.failedErrorSignal.set(null);
    this.expiredErrorSignal.set(null);
  }
}
