import { signal, computed, Signal, WritableSignal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

/**
 * Represents the possible states of an async operation.
 * Uses discriminated unions for type-safe state handling.
 */
export type AsyncStateValue<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: T };

/**
 * A generic utility class for managing async operation states.
 * Uses Angular signals for reactive state management.
 *
 * @example
 * ```typescript
 * // In a component
 * private tasksState = new AsyncState<Task[]>();
 *
 * readonly isLoading = this.tasksState.isLoading;
 * readonly error = this.tasksState.error;
 * readonly tasks = this.tasksState.data;
 *
 * loadTasks() {
 *   this.tasksState.execute(() =>
 *     firstValueFrom(this.taskService.getTasks(householdId))
 *   );
 * }
 * ```
 */
export class AsyncState<T> {
  /**
   * The internal state signal holding the current async state.
   * Exposed as readonly for direct access when needed.
   */
  readonly state: WritableSignal<AsyncStateValue<T>> = signal<AsyncStateValue<T>>({
    status: 'idle',
  });

  /**
   * Computed signal indicating if the operation is currently loading.
   */
  readonly isLoading: Signal<boolean> = computed(() => this.state().status === 'loading');

  /**
   * Computed signal containing the error message if the operation failed.
   * Returns null if not in error state.
   */
  readonly error: Signal<string | null> = computed(() => {
    const current = this.state();
    return current.status === 'error' ? current.error : null;
  });

  /**
   * Computed signal containing the data if the operation succeeded.
   * Returns null if not in success state.
   */
  readonly data: Signal<T | null> = computed(() => {
    const current = this.state();
    return current.status === 'success' ? current.data : null;
  });

  /**
   * Computed signal indicating if the operation completed successfully.
   */
  readonly isSuccess: Signal<boolean> = computed(() => this.state().status === 'success');

  /**
   * Computed signal indicating if the operation is in idle state (not started).
   */
  readonly isIdle: Signal<boolean> = computed(() => this.state().status === 'idle');

  /**
   * Computed signal indicating if the operation is in error state.
   */
  readonly isError: Signal<boolean> = computed(() => this.state().status === 'error');

  /**
   * Executes an async operation and updates the state accordingly.
   * Handles errors gracefully and updates state to reflect success or failure.
   *
   * @param fn - An async function that returns a Promise of type T
   * @returns Promise<void> - Resolves when the operation completes (success or failure)
   *
   * @example
   * ```typescript
   * // With a Promise
   * await asyncState.execute(async () => {
   *   return fetchData();
   * });
   *
   * // With an Observable (using firstValueFrom)
   * await asyncState.execute(() =>
   *   firstValueFrom(this.http.get<Data>('/api/data'))
   * );
   * ```
   */
  async execute(fn: () => Promise<T>): Promise<void> {
    this.state.set({ status: 'loading' });
    try {
      const data = await fn();
      this.state.set({ status: 'success', data });
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      this.state.set({ status: 'error', error: errorMessage });
    }
  }

  /**
   * Executes an Observable and updates the state accordingly.
   * Convenience method that wraps the Observable with firstValueFrom.
   *
   * @param observable - An Observable that emits the data
   * @returns Promise<void> - Resolves when the Observable completes
   *
   * @example
   * ```typescript
   * await asyncState.executeObservable(this.http.get<Data>('/api/data'));
   * ```
   */
  async executeObservable(observable: Observable<T>): Promise<void> {
    return this.execute(() => firstValueFrom(observable));
  }

  /**
   * Resets the state to idle.
   * Useful for clearing previous results before a new operation.
   */
  reset(): void {
    this.state.set({ status: 'idle' });
  }

  /**
   * Sets the state directly to success with the provided data.
   * Useful for initializing with known data or updating after local modifications.
   *
   * @param data - The data to set
   */
  setData(data: T): void {
    this.state.set({ status: 'success', data });
  }

  /**
   * Sets the state directly to error with the provided message.
   * Useful for setting errors from external sources.
   *
   * @param error - The error message
   */
  setError(error: string): void {
    this.state.set({ status: 'error', error });
  }

  /**
   * Extracts a user-friendly error message from various error types.
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return 'An unexpected error occurred';
  }
}

/**
 * Factory function to create a new AsyncState instance.
 * Provides a more functional approach to creating async state.
 *
 * @example
 * ```typescript
 * const tasksState = createAsyncState<Task[]>();
 * ```
 */
export function createAsyncState<T>(): AsyncState<T> {
  return new AsyncState<T>();
}
