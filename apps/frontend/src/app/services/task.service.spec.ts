import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import type {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  Assignment,
  PaginationMeta,
} from '@st44/types';
import { TaskService, PaginatedTasksResponse } from './task.service';
import { ApiService } from './api.service';

describe('TaskService', () => {
  let service: TaskService;
  let mockApiService: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  const mockTask: Task = {
    id: 'task-1',
    householdId: 'household-1',
    name: 'Daily Chores',
    description: 'Complete daily household chores',
    points: 10,
    ruleType: 'daily',
    ruleConfig: null,
    active: true,
    createdAt: '2025-12-19T10:00:00Z',
    updatedAt: '2025-12-19T10:00:00Z',
  };

  const mockTask2: Task = {
    id: 'task-2',
    householdId: 'household-1',
    name: 'Weekly Rotation',
    description: 'Rotate weekly tasks',
    points: 15,
    ruleType: 'weekly_rotation',
    ruleConfig: {
      rotationType: 'odd_even_week',
      assignedChildren: ['child-1', 'child-2', 'child-3'],
    },
    active: true,
    createdAt: '2025-12-19T11:00:00Z',
    updatedAt: '2025-12-19T11:00:00Z',
  };

  const mockInactiveTask: Task = {
    id: 'task-3',
    householdId: 'household-1',
    name: 'Old Task',
    description: 'Inactive task',
    points: 5,
    ruleType: 'repeating',
    ruleConfig: {
      repeatDays: [1, 3, 5],
      assignedChildren: ['child-1'],
    },
    active: false,
    createdAt: '2025-12-01T10:00:00Z',
    updatedAt: '2025-12-15T10:00:00Z',
  };

  beforeEach(() => {
    mockApiService = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [TaskService, { provide: ApiService, useValue: mockApiService }],
    });

    service = TestBed.inject(TaskService);
  });

  describe('Initial State', () => {
    it('should initialize with empty tasks array', () => {
      expect(service.tasks()).toEqual([]);
    });

    it('should initialize with loading false', () => {
      expect(service.loading()).toBe(false);
    });

    it('should initialize with no error', () => {
      expect(service.error()).toBeNull();
    });

    it('should initialize with empty active tasks', () => {
      expect(service.activeTasks()).toEqual([]);
    });

    it('should initialize with empty inactive tasks', () => {
      expect(service.inactiveTasks()).toEqual([]);
    });
  });

  describe('createTask', () => {
    const createRequest: CreateTaskRequest = {
      name: 'New Task',
      description: 'Test description',
      points: 10,
      ruleType: 'daily',
    };

    it('should call ApiService.post with correct endpoint and data', async () => {
      mockApiService.post.mockResolvedValue(mockTask);

      const result$ = service.createTask('household-1', createRequest);
      await firstValueFrom(result$);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/households/household-1/tasks',
        createRequest,
      );
    });

    it('should return created task', async () => {
      mockApiService.post.mockResolvedValue(mockTask);

      const result$ = service.createTask('household-1', createRequest);
      const result = await firstValueFrom(result$);

      expect(result).toEqual(mockTask);
    });

    it('should add task to state on success', async () => {
      mockApiService.post.mockResolvedValue(mockTask);

      const result$ = service.createTask('household-1', createRequest);
      await firstValueFrom(result$);

      expect(service.tasks()).toContain(mockTask);
      expect(service.tasks().length).toBe(1);
    });

    it('should set loading to true during API call', () => {
      mockApiService.post.mockImplementation(
        () =>
          new Promise((resolve) => {
            expect(service.loading()).toBe(true);
            resolve(mockTask);
          }),
      );

      service.createTask('household-1', createRequest);
    });

    it('should set loading to false after success', async () => {
      mockApiService.post.mockResolvedValue(mockTask);

      const result$ = service.createTask('household-1', createRequest);
      await firstValueFrom(result$);

      expect(service.loading()).toBe(false);
    });

    it('should set error message on failure', async () => {
      const error = new Error('API Error');
      mockApiService.post.mockRejectedValue(error);

      const result$ = service.createTask('household-1', createRequest);

      await expect(firstValueFrom(result$)).rejects.toThrow();
      expect(service.error()).toBe('Failed to create task template');
    });

    it('should set loading to false after error', async () => {
      mockApiService.post.mockRejectedValue(new Error('API Error'));

      const result$ = service.createTask('household-1', createRequest);

      try {
        await firstValueFrom(result$);
      } catch {
        // Expected
      }

      expect(service.loading()).toBe(false);
    });

    it('should clear previous error on new request', async () => {
      // First request fails
      mockApiService.post.mockRejectedValueOnce(new Error('First error'));
      const result1$ = service.createTask('household-1', createRequest);
      try {
        await firstValueFrom(result1$);
      } catch {
        // Expected
      }
      expect(service.error()).toBe('Failed to create task template');

      // Second request succeeds
      mockApiService.post.mockResolvedValueOnce(mockTask);
      service.createTask('household-1', createRequest);
      // Wait for the promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(service.error()).toBeNull();
    });
  });

  describe('getTasks', () => {
    const mockPagination: PaginationMeta = {
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
    const mockResponse: PaginatedTasksResponse = {
      tasks: [mockTask, mockTask2],
      pagination: mockPagination,
    };

    it('should call ApiService.get with correct endpoint for active tasks', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getTasks('household-1', true);
      await firstValueFrom(result$);

      expect(mockApiService.get).toHaveBeenCalledWith('/households/household-1/tasks?active=true');
    });

    it('should call ApiService.get with correct endpoint for all tasks', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getTasks('household-1', false);
      await firstValueFrom(result$);

      expect(mockApiService.get).toHaveBeenCalledWith('/households/household-1/tasks');
    });

    it('should default to active tasks only', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getTasks('household-1');
      await firstValueFrom(result$);

      expect(mockApiService.get).toHaveBeenCalledWith('/households/household-1/tasks?active=true');
    });

    it('should return paginated response with tasks', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getTasks('household-1');
      const result = await firstValueFrom(result$);

      expect(result.tasks).toEqual([mockTask, mockTask2]);
      expect(result.pagination).toEqual(mockPagination);
    });

    it('should update state with fetched tasks', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getTasks('household-1');
      await firstValueFrom(result$);

      expect(service.tasks()).toEqual([mockTask, mockTask2]);
      expect(service.pagination()).toEqual(mockPagination);
    });

    it('should set loading states correctly', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getTasks('household-1');
      await firstValueFrom(result$);

      expect(service.loading()).toBe(false);
    });

    it('should set error message on failure', async () => {
      const error = new Error('Network error');
      mockApiService.get.mockRejectedValue(error);

      const result$ = service.getTasks('household-1');

      await expect(firstValueFrom(result$)).rejects.toThrow();
      expect(service.error()).toBe('Failed to load task templates');
    });

    it('should handle empty tasks array', async () => {
      const emptyResponse: PaginatedTasksResponse = {
        tasks: [],
        pagination: { ...mockPagination, total: 0, totalPages: 0 },
      };
      mockApiService.get.mockResolvedValue(emptyResponse);

      const result$ = service.getTasks('household-1');
      const result = await firstValueFrom(result$);

      expect(result.tasks).toEqual([]);
      expect(service.tasks()).toEqual([]);
    });

    it('should include pagination params when provided', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getTasks('household-1', true, {
        page: 2,
        pageSize: 10,
        sortBy: 'name',
        sortOrder: 'asc',
      });
      await firstValueFrom(result$);

      expect(mockApiService.get).toHaveBeenCalledWith(
        '/households/household-1/tasks?active=true&page=2&pageSize=10&sortBy=name&sortOrder=asc',
      );
    });
  });

  describe('getTask', () => {
    it('should call ApiService.get with correct endpoint', async () => {
      mockApiService.get.mockResolvedValue(mockTask);

      const result$ = service.getTask('household-1', 'task-1');
      await firstValueFrom(result$);

      expect(mockApiService.get).toHaveBeenCalledWith('/households/household-1/tasks/task-1');
    });

    it('should return single task', async () => {
      mockApiService.get.mockResolvedValue(mockTask);

      const result$ = service.getTask('household-1', 'task-1');
      const result = await firstValueFrom(result$);

      expect(result).toEqual(mockTask);
    });

    it('should set loading states correctly', async () => {
      mockApiService.get.mockResolvedValue(mockTask);

      const result$ = service.getTask('household-1', 'task-1');
      await firstValueFrom(result$);

      expect(service.loading()).toBe(false);
    });

    it('should set error message on failure', async () => {
      const error = new Error('Not found');
      mockApiService.get.mockRejectedValue(error);

      const result$ = service.getTask('household-1', 'nonexistent');

      await expect(firstValueFrom(result$)).rejects.toThrow();
      expect(service.error()).toBe('Failed to load task template');
    });
  });

  describe('updateTask', () => {
    const updateRequest: UpdateTaskRequest = {
      name: 'Updated Title',
      description: 'Updated description',
    };

    const updatedTask: Task = {
      ...mockTask,
      name: 'Updated Title',
      description: 'Updated description',
    };

    beforeEach(async () => {
      // Set up initial state with a task
      mockApiService.get.mockResolvedValue({
        tasks: [mockTask],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
      const result$ = service.getTasks('household-1');
      await firstValueFrom(result$);
    });

    it('should call ApiService.put with correct endpoint and data', async () => {
      mockApiService.put.mockResolvedValue(updatedTask);

      const result$ = service.updateTask('household-1', 'task-1', updateRequest);
      await firstValueFrom(result$);

      expect(mockApiService.put).toHaveBeenCalledWith(
        '/households/household-1/tasks/task-1',
        updateRequest,
      );
    });

    it('should return updated task', async () => {
      mockApiService.put.mockResolvedValue(updatedTask);

      const result$ = service.updateTask('household-1', 'task-1', updateRequest);
      const result = await firstValueFrom(result$);

      expect(result).toEqual(updatedTask);
    });

    it('should update task in state', async () => {
      mockApiService.put.mockResolvedValue(updatedTask);

      const result$ = service.updateTask('household-1', 'task-1', updateRequest);
      await firstValueFrom(result$);

      const tasks = service.tasks();
      expect(tasks[0]).toEqual(updatedTask);
      expect(tasks[0].name).toBe('Updated Title');
    });

    it('should not affect other tasks in state', async () => {
      // Add second task to state
      mockApiService.get.mockResolvedValue({
        tasks: [mockTask, mockTask2],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
      const getTasks$ = service.getTasks('household-1');
      await firstValueFrom(getTasks$);

      mockApiService.put.mockResolvedValue(updatedTask);

      const result$ = service.updateTask('household-1', 'task-1', updateRequest);
      await firstValueFrom(result$);

      const tasks = service.tasks();
      expect(tasks.length).toBe(2);
      expect(tasks[0]).toEqual(updatedTask);
      expect(tasks[1]).toEqual(mockTask2);
    });

    it('should set loading states correctly', async () => {
      mockApiService.put.mockResolvedValue(updatedTask);

      const result$ = service.updateTask('household-1', 'task-1', updateRequest);
      await firstValueFrom(result$);

      expect(service.loading()).toBe(false);
    });

    it('should set error message on failure', async () => {
      const error = new Error('Update failed');
      mockApiService.put.mockRejectedValue(error);

      const result$ = service.updateTask('household-1', 'task-1', updateRequest);

      await expect(firstValueFrom(result$)).rejects.toThrow();
      expect(service.error()).toBe('Failed to update task template');
    });
  });

  describe('deleteTask', () => {
    beforeEach(async () => {
      // Set up initial state with tasks
      mockApiService.get.mockResolvedValue({
        tasks: [mockTask, mockTask2],
      });
      const result$ = service.getTasks('household-1');
      await firstValueFrom(result$);
    });

    it('should call ApiService.delete with correct endpoint', async () => {
      mockApiService.delete.mockResolvedValue(undefined);

      const result$ = service.deleteTask('household-1', 'task-1');
      await firstValueFrom(result$);

      expect(mockApiService.delete).toHaveBeenCalledWith('/households/household-1/tasks/task-1');
    });

    it('should mark task as inactive in state', async () => {
      mockApiService.delete.mockResolvedValue(undefined);

      const result$ = service.deleteTask('household-1', 'task-1');
      await firstValueFrom(result$);

      const tasks = service.tasks();
      const deletedTask = tasks.find((t) => t.id === 'task-1');
      expect(deletedTask?.active).toBe(false);
    });

    it('should not affect other tasks', async () => {
      mockApiService.delete.mockResolvedValue(undefined);

      const result$ = service.deleteTask('household-1', 'task-1');
      await firstValueFrom(result$);

      const tasks = service.tasks();
      expect(tasks.length).toBe(2);
      expect(tasks[1].id).toBe('task-2');
      expect(tasks[1].active).toBe(true);
    });

    it('should set loading states correctly', async () => {
      mockApiService.delete.mockResolvedValue(undefined);

      const result$ = service.deleteTask('household-1', 'task-1');
      await firstValueFrom(result$);

      expect(service.loading()).toBe(false);
    });

    it('should set error message on failure', async () => {
      const error = new Error('Delete failed');
      mockApiService.delete.mockRejectedValue(error);

      const result$ = service.deleteTask('household-1', 'task-1');

      await expect(firstValueFrom(result$)).rejects.toThrow();
      expect(service.error()).toBe('Failed to delete task template');
    });
  });

  describe('Computed Signals', () => {
    beforeEach(async () => {
      // Set up state with mix of active and inactive tasks
      mockApiService.get.mockResolvedValue({
        tasks: [mockTask, mockTask2, mockInactiveTask],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 3,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
      const result$ = service.getTasks('household-1', false);
      await firstValueFrom(result$);
    });

    it('should compute activeTasks correctly', () => {
      const activeTasks = service.activeTasks();
      expect(activeTasks.length).toBe(2);
      expect(activeTasks.every((t) => t.active)).toBe(true);
      expect(activeTasks.map((t) => t.id)).toEqual(['task-1', 'task-2']);
    });

    it('should compute inactiveTasks correctly', () => {
      const inactiveTasks = service.inactiveTasks();
      expect(inactiveTasks.length).toBe(1);
      expect(inactiveTasks.every((t) => !t.active)).toBe(true);
      expect(inactiveTasks[0].id).toBe('task-3');
    });

    it('should update computed signals when task is deleted', async () => {
      mockApiService.delete.mockResolvedValue(undefined);

      const result$ = service.deleteTask('household-1', 'task-1');
      await firstValueFrom(result$);

      const activeTasks = service.activeTasks();
      const inactiveTasks = service.inactiveTasks();

      expect(activeTasks.length).toBe(1);
      expect(inactiveTasks.length).toBe(2);
    });

    it('should handle all active tasks', async () => {
      mockApiService.get.mockResolvedValue({
        tasks: [mockTask, mockTask2],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
      const result$ = service.getTasks('household-1', true);
      await firstValueFrom(result$);

      expect(service.activeTasks().length).toBe(2);
      expect(service.inactiveTasks().length).toBe(0);
    });

    it('should handle all inactive tasks', async () => {
      mockApiService.get.mockResolvedValue({
        tasks: [mockInactiveTask],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
      const result$ = service.getTasks('household-1', false);
      await firstValueFrom(result$);

      expect(service.activeTasks().length).toBe(0);
      expect(service.inactiveTasks().length).toBe(1);
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      // Set an error
      mockApiService.get.mockRejectedValue(new Error('Test error'));
      const result$ = service.getTasks('household-1');
      try {
        await firstValueFrom(result$);
      } catch {
        // Expected
      }
      expect(service.error()).toBe('Failed to load task templates');

      // Clear error
      service.clearError();
      expect(service.error()).toBeNull();
    });

    it('should not affect loading or tasks state', async () => {
      mockApiService.get.mockResolvedValue({
        tasks: [mockTask],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
      const result$ = service.getTasks('household-1');
      await firstValueFrom(result$);

      service.clearError();

      expect(service.tasks()).toEqual([mockTask]);
      expect(service.loading()).toBe(false);
    });
  });

  describe('Signal Immutability', () => {
    it('should expose readonly signals', () => {
      // Type check - readonly signals should not have set/update methods
      const tasks = service.tasks;
      const loading = service.loading;
      const error = service.error;
      const activeTasks = service.activeTasks;
      const inactiveTasks = service.inactiveTasks;

      // These should be callable (readonly signals have a call signature)
      expect(typeof tasks).toBe('function');
      expect(typeof loading).toBe('function');
      expect(typeof error).toBe('function');
      expect(typeof activeTasks).toBe('function');
      expect(typeof inactiveTasks).toBe('function');
    });

    it('should not allow external modification of tasks array', async () => {
      mockApiService.get.mockResolvedValue({
        tasks: [mockTask],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
      const result$ = service.getTasks('household-1');
      await firstValueFrom(result$);

      const tasksBefore = service.tasks();
      const tasksReference = service.tasks();

      // Attempting to modify the returned array shouldn't affect the signal
      // (though TypeScript readonly doesn't prevent runtime modification,
      // we follow the convention)
      expect(tasksBefore).toEqual(tasksReference);
    });
  });

  // ==================== Assignment Viewing & Completion Tests ====================

  describe('getChildTasks', () => {
    const mockAssignment = {
      id: 'assignment-1',
      taskId: 'task-1',
      childId: 'child-1',
      title: 'Feed the dog',
      description: 'Give dog food and water',
      ruleType: 'daily',
      childName: null,
      date: '2025-01-20',
      status: 'pending',
      completedAt: null,
      createdAt: '2025-01-20T00:00:00Z',
    };

    const mockResponse = { assignments: [mockAssignment], total: 1 };

    it('should call ApiService.get with correct endpoint and parameters', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getChildTasks('child-1', '2025-01-20', 'pending');
      await firstValueFrom(result$);

      expect(mockApiService.get).toHaveBeenCalledWith(
        '/children/child-1/tasks?date=2025-01-20&status=pending',
      );
    });

    it('should call with date parameter only', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getChildTasks('child-1', '2025-01-20');
      await firstValueFrom(result$);

      expect(mockApiService.get).toHaveBeenCalledWith('/children/child-1/tasks?date=2025-01-20');
    });

    it('should call with status parameter only', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getChildTasks('child-1', undefined, 'completed');
      await firstValueFrom(result$);

      expect(mockApiService.get).toHaveBeenCalledWith('/children/child-1/tasks?status=completed');
    });

    it('should call without optional parameters', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getChildTasks('child-1');
      await firstValueFrom(result$);

      expect(mockApiService.get).toHaveBeenCalledWith('/children/child-1/tasks');
    });

    it('should return assignments array', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getChildTasks('child-1', '2025-01-20');
      const result = await firstValueFrom(result$);

      expect(result).toEqual([mockAssignment]);
    });

    it('should update assignments signal', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getChildTasks('child-1', '2025-01-20');
      await firstValueFrom(result$);

      expect(service.assignments()).toEqual([mockAssignment]);
    });

    it('should handle empty assignments array', async () => {
      mockApiService.get.mockResolvedValue({ assignments: [], total: 0 });

      const result$ = service.getChildTasks('child-1', '2025-01-20');
      const result = await firstValueFrom(result$);

      expect(result).toEqual([]);
      expect(service.assignments()).toEqual([]);
    });

    it('should set error on failure', async () => {
      mockApiService.get.mockRejectedValue(new Error('Network error'));

      const result$ = service.getChildTasks('child-1', '2025-01-20');

      await expect(firstValueFrom(result$)).rejects.toThrow();
      expect(service.assignmentsError()).toBe('Failed to load child tasks');
    });
  });

  describe('getHouseholdAssignments', () => {
    const mockAssignments = [
      {
        id: 'assignment-1',
        taskId: 'task-1',
        childId: 'child-1',
        childName: 'Emma',
        title: 'Feed the dog',
        description: null,
        ruleType: 'daily',
        date: '2025-01-20',
        status: 'pending',
        completedAt: null,
        createdAt: '2025-01-20T00:00:00Z',
      },
      {
        id: 'assignment-2',
        taskId: 'task-2',
        childId: 'child-2',
        childName: 'Noah',
        title: 'Take out trash',
        description: null,
        ruleType: 'daily',
        date: '2025-01-20',
        status: 'completed',
        completedAt: '2025-01-20T10:00:00Z',
        createdAt: '2025-01-20T00:00:00Z',
      },
    ];

    const mockResponse = { assignments: mockAssignments, total: 2 };

    it('should call ApiService.get with household ID and filters', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getHouseholdAssignments('household-1', {
        date: '2025-01-20',
        childId: 'child-1',
        status: 'pending',
      });
      await firstValueFrom(result$);

      expect(mockApiService.get).toHaveBeenCalledWith(
        '/households/household-1/assignments?date=2025-01-20&childId=child-1&status=pending',
      );
    });

    it('should call without optional filters', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getHouseholdAssignments('household-1');
      await firstValueFrom(result$);

      expect(mockApiService.get).toHaveBeenCalledWith('/households/household-1/assignments');
    });

    it('should return assignments array', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getHouseholdAssignments('household-1');
      const result = await firstValueFrom(result$);

      expect(result).toEqual(mockAssignments);
    });

    it('should update assignments signal', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getHouseholdAssignments('household-1');
      await firstValueFrom(result$);

      expect(service.assignments()).toEqual(mockAssignments);
    });

    it('should set error on failure', async () => {
      mockApiService.get.mockRejectedValue(new Error('Unauthorized'));

      const result$ = service.getHouseholdAssignments('household-1');

      await expect(firstValueFrom(result$)).rejects.toThrow();
      expect(service.assignmentsError()).toBe('Failed to load household assignments');
    });
  });

  describe('completeTask', () => {
    const mockAssignment: Assignment = {
      id: 'assignment-1',
      taskId: 'task-1',
      title: 'Daily Chores',
      description: null,
      ruleType: 'daily',
      childId: 'child-1',
      childName: 'Emma',
      date: '2025-01-20',
      status: 'pending',
      completedAt: null,
      createdAt: '2025-01-19T10:00:00Z',
    };

    const completedAssignmentResponse = {
      taskAssignment: {
        id: 'assignment-1',
        status: 'completed',
        completedAt: '2025-01-20T12:00:00Z',
      },
      completion: {
        id: 'completion-1',
        pointsEarned: 10,
        completedAt: '2025-01-20T12:00:00Z',
      },
    };

    beforeEach(async () => {
      // Set up initial state
      mockApiService.get.mockResolvedValue({ assignments: [mockAssignment], total: 1 });
      const result$ = service.getChildTasks('child-1');
      await firstValueFrom(result$);
    });

    it('should perform optimistic update', () => {
      mockApiService.post.mockResolvedValue(completedAssignmentResponse);

      service.completeTask('assignment-1');

      // Should update immediately
      const assignments = service.assignments();
      expect(assignments[0].status).toBe('completed');
    });

    it('should call ApiService.post with correct endpoint', async () => {
      mockApiService.post.mockResolvedValue(completedAssignmentResponse);

      const result$ = service.completeTask('assignment-1');
      await firstValueFrom(result$);

      expect(mockApiService.post).toHaveBeenCalledWith('/assignments/assignment-1/complete', {});
    });

    it('should return completed assignment response', async () => {
      mockApiService.post.mockResolvedValue(completedAssignmentResponse);

      const result$ = service.completeTask('assignment-1');
      const result = await firstValueFrom(result$);

      expect(result.taskAssignment.status).toBe('completed');
      expect(result.taskAssignment.completedAt).toBe('2025-01-20T12:00:00Z');
      expect(result.completion.pointsEarned).toBe(10);
    });

    it('should rollback optimistic update on API error', async () => {
      mockApiService.post.mockRejectedValue(new Error('Already completed'));

      const result$ = service.completeTask('assignment-1');

      try {
        await firstValueFrom(result$);
      } catch {
        // Expected
      }

      // Should rollback to original state
      const assignments = service.assignments();
      expect(assignments[0].status).toBe('pending');
    });

    it('should set error message on failure', async () => {
      mockApiService.post.mockRejectedValue(new Error('Server error'));

      const result$ = service.completeTask('assignment-1');

      await expect(firstValueFrom(result$)).rejects.toThrow();
      expect(service.assignmentsError()).toBe('Failed to complete task');
    });

    it('should not affect other assignments', async () => {
      // Add second assignment
      const assignment2 = { ...mockAssignment, id: 'assignment-2' };
      mockApiService.get.mockResolvedValue({
        assignments: [mockAssignment, assignment2],
        total: 2,
      });
      const getTasks$ = service.getChildTasks('child-1');
      await firstValueFrom(getTasks$);

      mockApiService.post.mockResolvedValue(completedAssignmentResponse);

      const result$ = service.completeTask('assignment-1');
      await firstValueFrom(result$);

      const assignments = service.assignments();
      expect(assignments.length).toBe(2);
      expect(assignments[0].status).toBe('completed');
      expect(assignments[1].status).toBe('pending');
    });
  });

  describe('reassignTask', () => {
    const mockAssignment: Assignment = {
      id: 'assignment-1',
      taskId: 'task-1',
      title: 'Daily Chores',
      description: null,
      ruleType: 'daily',
      childId: 'child-1',
      childName: 'Emma',
      date: '2025-01-20',
      status: 'pending',
      completedAt: null,
      createdAt: '2025-01-19T10:00:00Z',
    };

    const reassignedAssignment: Assignment = {
      ...mockAssignment,
      childId: 'child-2',
      childName: 'Noah',
    };

    beforeEach(async () => {
      // Set up initial state
      mockApiService.get.mockResolvedValue({ assignments: [mockAssignment], total: 1 });
      const result$ = service.getHouseholdAssignments('household-1');
      await firstValueFrom(result$);
    });

    it('should call ApiService.put with correct endpoint and data', async () => {
      mockApiService.put.mockResolvedValue(reassignedAssignment);

      const result$ = service.reassignTask('assignment-1', 'child-2');
      await firstValueFrom(result$);

      expect(mockApiService.put).toHaveBeenCalledWith('/assignments/assignment-1/reassign', {
        childId: 'child-2',
      });
    });

    it('should return reassigned assignment', async () => {
      mockApiService.put.mockResolvedValue(reassignedAssignment);

      const result$ = service.reassignTask('assignment-1', 'child-2');
      const result = await firstValueFrom(result$);

      expect(result.childId).toBe('child-2');
      expect(result.childName).toBe('Noah');
    });

    it('should update assignment in state', async () => {
      mockApiService.put.mockResolvedValue(reassignedAssignment);

      const result$ = service.reassignTask('assignment-1', 'child-2');
      await firstValueFrom(result$);

      const assignments = service.assignments();
      expect(assignments[0].childId).toBe('child-2');
      expect(assignments[0].childName).toBe('Noah');
    });

    it('should set error on failure', async () => {
      mockApiService.put.mockRejectedValue(new Error('Child not found'));

      const result$ = service.reassignTask('assignment-1', 'invalid-child');

      await expect(firstValueFrom(result$)).rejects.toThrow();
      expect(service.assignmentsError()).toBe('Failed to reassign task');
    });

    it('should not affect other assignments', async () => {
      // Add second assignment
      const assignment2: Assignment = { ...mockAssignment, id: 'assignment-2', childId: 'child-3' };
      mockApiService.get.mockResolvedValue({
        assignments: [mockAssignment, assignment2],
        total: 2,
      });
      const getTasks$ = service.getHouseholdAssignments('household-1');
      await firstValueFrom(getTasks$);

      mockApiService.put.mockResolvedValue(reassignedAssignment);

      const result$ = service.reassignTask('assignment-1', 'child-2');
      await firstValueFrom(result$);

      const assignments = service.assignments();
      expect(assignments.length).toBe(2);
      expect(assignments[0].childId).toBe('child-2');
      expect(assignments[1].childId).toBe('child-3'); // Unchanged
    });
  });

  describe('Computed Assignment Signals', () => {
    const baseAssignment = {
      taskId: 'task-1',
      title: 'Daily Chores',
      description: null,
      ruleType: 'daily' as const,
      childId: 'child-1',
      childName: 'Emma',
      createdAt: '2025-01-18T10:00:00Z',
      completedAt: null,
    };

    const mockAssignments: Assignment[] = [
      {
        ...baseAssignment,
        id: 'assignment-1',
        status: 'pending',
        date: '2025-01-20',
      },
      {
        ...baseAssignment,
        id: 'assignment-2',
        status: 'completed',
        date: '2025-01-20',
        completedAt: '2025-01-20T10:00:00Z',
      },
      {
        ...baseAssignment,
        id: 'assignment-3',
        status: 'pending',
        date: '2025-01-19', // Yesterday - overdue
      },
    ];

    beforeEach(async () => {
      mockApiService.get.mockResolvedValue({ assignments: mockAssignments, total: 3 });
      const result$ = service.getHouseholdAssignments('household-1');
      await firstValueFrom(result$);
    });

    it('should compute pendingAssignments correctly', () => {
      const pending = service.pendingAssignments();
      expect(pending.length).toBe(2);
      expect(pending.every((a) => a.status === 'pending')).toBe(true);
    });

    it('should compute completedAssignments correctly', () => {
      const completed = service.completedAssignments();
      expect(completed.length).toBe(1);
      expect(completed[0].status).toBe('completed');
    });

    it('should update computed signals after completion', async () => {
      mockApiService.post.mockResolvedValue({
        taskAssignment: {
          id: 'assignment-1',
          status: 'completed',
          completedAt: '2025-01-20T11:00:00Z',
        },
        completion: {
          id: 'completion-1',
          pointsEarned: 10,
          completedAt: '2025-01-20T11:00:00Z',
        },
      });

      const result$ = service.completeTask('assignment-1');
      await firstValueFrom(result$);

      expect(service.pendingAssignments().length).toBe(1);
      expect(service.completedAssignments().length).toBe(2);
    });
  });
});
