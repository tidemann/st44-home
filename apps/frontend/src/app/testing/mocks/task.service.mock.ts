/**
 * Mock TaskService for testing
 *
 * Provides mock implementations for TaskService with configurable
 * return values and state.
 *
 * @example
 * const { service, mockApi } = createMockTaskService();
 * mockApi.get.mockResolvedValue({ tasks: mockTasks, pagination: mockPagination });
 *
 * TestBed.configureTestingModule({
 *   providers: [{ provide: TaskService, useValue: service }]
 * });
 */

import { signal, computed } from '@angular/core';
import { vi } from 'vitest';
import { of, throwError } from 'rxjs';
import type { Task, Assignment, PaginationMeta } from '@st44/types';

export interface MockTaskServiceState {
  tasks: Task[];
  assignments: Assignment[];
  loading: boolean;
  error: string | null;
  assignmentsError: string | null;
  pagination: PaginationMeta | null;
}

export interface MockTaskService {
  // Signals (matching real service)
  tasks: ReturnType<typeof signal<Task[]>>;
  assignments: ReturnType<typeof signal<Assignment[]>>;
  loading: ReturnType<typeof signal<boolean>>;
  error: ReturnType<typeof signal<string | null>>;
  assignmentsError: ReturnType<typeof signal<string | null>>;
  pagination: ReturnType<typeof signal<PaginationMeta | null>>;

  // Computed signals
  activeTasks: ReturnType<typeof computed<Task[]>>;
  inactiveTasks: ReturnType<typeof computed<Task[]>>;
  pendingAssignments: ReturnType<typeof computed<Assignment[]>>;
  completedAssignments: ReturnType<typeof computed<Assignment[]>>;

  // Methods (as spies)
  getTasks: ReturnType<typeof vi.fn>;
  getTask: ReturnType<typeof vi.fn>;
  createTask: ReturnType<typeof vi.fn>;
  updateTask: ReturnType<typeof vi.fn>;
  deleteTask: ReturnType<typeof vi.fn>;
  getChildTasks: ReturnType<typeof vi.fn>;
  getHouseholdAssignments: ReturnType<typeof vi.fn>;
  completeTask: ReturnType<typeof vi.fn>;
  reassignTask: ReturnType<typeof vi.fn>;
  clearError: ReturnType<typeof vi.fn>;
  clearAssignmentsError: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock TaskService with configurable initial state
 */
export function createMockTaskService(
  initialState: Partial<MockTaskServiceState> = {},
): MockTaskService {
  const state = {
    tasks: initialState.tasks ?? [],
    assignments: initialState.assignments ?? [],
    loading: initialState.loading ?? false,
    error: initialState.error ?? null,
    assignmentsError: initialState.assignmentsError ?? null,
    pagination: initialState.pagination ?? null,
  };

  const tasksSignal = signal<Task[]>(state.tasks);
  const assignmentsSignal = signal<Assignment[]>(state.assignments);
  const loadingSignal = signal<boolean>(state.loading);
  const errorSignal = signal<string | null>(state.error);
  const assignmentsErrorSignal = signal<string | null>(state.assignmentsError);
  const paginationSignal = signal<PaginationMeta | null>(state.pagination);

  return {
    // Signals
    tasks: tasksSignal,
    assignments: assignmentsSignal,
    loading: loadingSignal,
    error: errorSignal,
    assignmentsError: assignmentsErrorSignal,
    pagination: paginationSignal,

    // Computed signals
    activeTasks: computed(() => tasksSignal().filter((t) => t.active)),
    inactiveTasks: computed(() => tasksSignal().filter((t) => !t.active)),
    pendingAssignments: computed(() => assignmentsSignal().filter((a) => a.status === 'pending')),
    completedAssignments: computed(() =>
      assignmentsSignal().filter((a) => a.status === 'completed'),
    ),

    // Methods
    getTasks: vi.fn().mockReturnValue(of({ tasks: state.tasks, pagination: state.pagination })),
    getTask: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    getChildTasks: vi.fn().mockReturnValue(of(state.assignments)),
    getHouseholdAssignments: vi.fn().mockReturnValue(of(state.assignments)),
    completeTask: vi.fn(),
    reassignTask: vi.fn(),
    clearError: vi.fn(() => errorSignal.set(null)),
    clearAssignmentsError: vi.fn(() => assignmentsErrorSignal.set(null)),
  };
}

/**
 * Configure getTasks to return specific data
 */
export function mockGetTasks(
  service: MockTaskService,
  tasks: Task[],
  pagination?: Partial<PaginationMeta>,
): void {
  const paginationMeta: PaginationMeta = {
    page: 1,
    pageSize: 20,
    total: tasks.length,
    totalPages: Math.ceil(tasks.length / 20) || 1,
    hasNextPage: false,
    hasPreviousPage: false,
    ...pagination,
  };
  service.getTasks.mockReturnValue(of({ tasks, pagination: paginationMeta }));
  service.tasks.set(tasks);
  service.pagination.set(paginationMeta);
}

/**
 * Configure getHouseholdAssignments to return specific data
 */
export function mockGetAssignments(service: MockTaskService, assignments: Assignment[]): void {
  service.getHouseholdAssignments.mockReturnValue(of(assignments));
  service.assignments.set(assignments);
}

/**
 * Configure completeTask to succeed
 */
export function mockCompleteTaskSuccess(
  service: MockTaskService,
  response: {
    taskAssignment: { id: string; status: string; completedAt: string };
    completion: { id: string; pointsEarned: number; completedAt: string };
  },
): void {
  service.completeTask.mockResolvedValue(response);
}

/**
 * Configure a method to fail with error
 */
export function mockTaskServiceError(
  method: ReturnType<typeof vi.fn>,
  errorMessage = 'Service error',
): void {
  method.mockReturnValue(throwError(() => new Error(errorMessage)));
}
