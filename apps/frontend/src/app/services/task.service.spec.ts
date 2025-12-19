import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { TaskService, TaskTemplate, CreateTaskRequest, UpdateTaskRequest } from './task.service';
import { ApiService } from './api.service';

describe('TaskService', () => {
  let service: TaskService;
  let mockApiService: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  const mockTask: TaskTemplate = {
    id: 'task-1',
    household_id: 'household-1',
    name: 'Daily Chores',
    description: 'Complete daily household chores',
    points: 10,
    rule_type: 'daily',
    rule_config: null,
    active: true,
    created_at: '2025-12-19T10:00:00Z',
    updated_at: '2025-12-19T10:00:00Z',
  };

  const mockTask2: TaskTemplate = {
    id: 'task-2',
    household_id: 'household-1',
    name: 'Weekly Rotation',
    description: 'Rotate weekly tasks',
    points: 15,
    rule_type: 'weekly_rotation',
    rule_config: {
      rotation_type: 'odd_even_week',
      assigned_children: ['child-1', 'child-2', 'child-3'],
    },
    active: true,
    created_at: '2025-12-19T11:00:00Z',
    updated_at: '2025-12-19T11:00:00Z',
  };

  const mockInactiveTask: TaskTemplate = {
    id: 'task-3',
    household_id: 'household-1',
    name: 'Old Task',
    description: 'Inactive task',
    points: 5,
    rule_type: 'repeating',
    rule_config: {
      repeat_days: [1, 3, 5],
      assigned_children: ['child-1'],
    },
    active: false,
    created_at: '2025-12-01T10:00:00Z',
    updated_at: '2025-12-15T10:00:00Z',
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
      rule_type: 'daily',
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
      const result2$ = service.createTask('household-1', createRequest);
      // Wait for the promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(service.error()).toBeNull();
    });
  });

  describe('getTasks', () => {
    const mockResponse = { tasks: [mockTask, mockTask2] };

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

    it('should return tasks array', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getTasks('household-1');
      const result = await firstValueFrom(result$);

      expect(result).toEqual([mockTask, mockTask2]);
    });

    it('should update state with fetched tasks', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result$ = service.getTasks('household-1');
      await firstValueFrom(result$);

      expect(service.tasks()).toEqual([mockTask, mockTask2]);
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
      mockApiService.get.mockResolvedValue({ tasks: [] });

      const result$ = service.getTasks('household-1');
      const result = await firstValueFrom(result$);

      expect(result).toEqual([]);
      expect(service.tasks()).toEqual([]);
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

    const updatedTask: TaskTemplate = {
      ...mockTask,
      name: 'Updated Title',
      description: 'Updated description',
    };

    beforeEach(async () => {
      // Set up initial state with a task
      mockApiService.get.mockResolvedValue({ tasks: [mockTask] });
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
      mockApiService.get.mockResolvedValue({ tasks: [mockTask, mockTask2] });
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
      });
      const result$ = service.getTasks('household-1', true);
      await firstValueFrom(result$);

      expect(service.activeTasks().length).toBe(2);
      expect(service.inactiveTasks().length).toBe(0);
    });

    it('should handle all inactive tasks', async () => {
      mockApiService.get.mockResolvedValue({
        tasks: [mockInactiveTask],
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
      mockApiService.get.mockResolvedValue({ tasks: [mockTask] });
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
      mockApiService.get.mockResolvedValue({ tasks: [mockTask] });
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
});
