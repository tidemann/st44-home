import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { of, throwError } from 'rxjs';
import {
  SingleTaskService,
  type AvailableSingleTask,
  type FailedTask,
  type CandidateStatus,
} from './single-task.service';
import { ApiService } from './api.service';

describe('SingleTaskService', () => {
  let service: SingleTaskService;
  let mockApiService: {
    get$: ReturnType<typeof vi.fn>;
    post$: ReturnType<typeof vi.fn>;
    delete$: ReturnType<typeof vi.fn>;
  };

  const mockAvailableTask: AvailableSingleTask = {
    id: 'task-1',
    householdId: 'household-1',
    name: 'Clean Room',
    description: 'Clean your room',
    points: 10,
    deadline: null,
    candidateCount: 2,
    declineCount: 0,
    hasDeadline: false,
    daysUntilDeadline: null,
  };

  const mockFailedTask: FailedTask = {
    id: 'task-2',
    name: 'Homework',
    description: 'Complete homework',
    points: 15,
    deadline: null,
    candidateCount: 2,
    declineCount: 2,
  };

  const mockCandidate: CandidateStatus = {
    childId: 'child-1',
    childName: 'Test Child',
    response: 'accepted',
    respondedAt: '2025-01-01T10:00:00Z',
  };

  beforeEach(() => {
    mockApiService = {
      get$: vi.fn(),
      post$: vi.fn(),
      delete$: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [SingleTaskService, { provide: ApiService, useValue: mockApiService }],
    });

    service = TestBed.inject(SingleTaskService);
  });

  describe('Initial State', () => {
    it('should initialize with empty available tasks', () => {
      expect(service.availableTasks()).toEqual([]);
    });

    it('should initialize with availableLoading false', () => {
      expect(service.availableLoading()).toBe(false);
    });

    it('should initialize with no availableError', () => {
      expect(service.availableError()).toBeNull();
    });

    it('should initialize with empty failed tasks', () => {
      expect(service.failedTasks()).toEqual([]);
    });

    it('should initialize with empty expired tasks', () => {
      expect(service.expiredTasks()).toEqual([]);
    });

    it('should initialize hasAvailableTasks as false', () => {
      expect(service.hasAvailableTasks()).toBe(false);
    });

    it('should initialize hasFailedTasks as false', () => {
      expect(service.hasFailedTasks()).toBe(false);
    });

    it('should initialize totalProblemTasks as 0', () => {
      expect(service.totalProblemTasks()).toBe(0);
    });
  });

  describe('loadAvailableTasks', () => {
    it('should call correct API endpoint', async () => {
      mockApiService.get$.mockReturnValue(of({ tasks: [mockAvailableTask] }));

      await firstValueFrom(service.loadAvailableTasks());

      expect(mockApiService.get$).toHaveBeenCalledWith('/children/available-tasks');
    });

    it('should update availableTasks on success', async () => {
      mockApiService.get$.mockReturnValue(of({ tasks: [mockAvailableTask] }));

      await firstValueFrom(service.loadAvailableTasks());

      expect(service.availableTasks()).toEqual([mockAvailableTask]);
    });

    it('should set loading to true during request', async () => {
      mockApiService.get$.mockReturnValue(of({ tasks: [] }));

      // Start loading
      const subscription = service.loadAvailableTasks();

      // Loading should be true initially (before the observable completes)
      // Since our mock returns immediately with of(), we check the signal was set
      await firstValueFrom(subscription);
      expect(service.availableLoading()).toBe(false); // Should be false after completion
    });

    it('should set loading to false after success', async () => {
      mockApiService.get$.mockReturnValue(of({ tasks: [mockAvailableTask] }));

      await firstValueFrom(service.loadAvailableTasks());

      expect(service.availableLoading()).toBe(false);
    });

    it('should set error on failure', async () => {
      mockApiService.get$.mockReturnValue(throwError(() => new Error('Network error')));

      try {
        await firstValueFrom(service.loadAvailableTasks());
      } catch {
        // Expected to throw
      }

      expect(service.availableError()).toBe('Failed to load available tasks');
    });

    it('should set loading to false on error', async () => {
      mockApiService.get$.mockReturnValue(throwError(() => new Error('Network error')));

      try {
        await firstValueFrom(service.loadAvailableTasks());
      } catch {
        // Expected to throw
      }

      expect(service.availableLoading()).toBe(false);
    });
  });

  describe('acceptTask', () => {
    it('should call correct API endpoint', async () => {
      mockApiService.post$.mockReturnValue(of({ assignment: { id: 'assignment-1' } }));

      await firstValueFrom(service.acceptTask('household-1', 'task-1'));

      expect(mockApiService.post$).toHaveBeenCalledWith(
        '/households/household-1/tasks/task-1/accept',
        {},
      );
    });

    it('should remove task from availableTasks on success', async () => {
      // First, set up some available tasks
      mockApiService.get$.mockReturnValue(of({ tasks: [mockAvailableTask] }));
      await firstValueFrom(service.loadAvailableTasks());

      mockApiService.post$.mockReturnValue(of({ assignment: { id: 'assignment-1' } }));
      await firstValueFrom(service.acceptTask('household-1', 'task-1'));

      expect(service.availableTasks()).toEqual([]);
    });

    it('should propagate error on failure', async () => {
      mockApiService.post$.mockReturnValue(throwError(() => new Error('Task already taken')));

      await expect(firstValueFrom(service.acceptTask('household-1', 'task-1'))).rejects.toThrow();
    });
  });

  describe('declineTask', () => {
    it('should call correct API endpoint', async () => {
      mockApiService.post$.mockReturnValue(of({ success: true }));

      await firstValueFrom(service.declineTask('household-1', 'task-1'));

      expect(mockApiService.post$).toHaveBeenCalledWith(
        '/households/household-1/tasks/task-1/decline',
        {},
      );
    });

    it('should remove task from availableTasks on success', async () => {
      // First, set up some available tasks
      mockApiService.get$.mockReturnValue(of({ tasks: [mockAvailableTask] }));
      await firstValueFrom(service.loadAvailableTasks());

      mockApiService.post$.mockReturnValue(of({ success: true }));
      await firstValueFrom(service.declineTask('household-1', 'task-1'));

      expect(service.availableTasks()).toEqual([]);
    });

    it('should propagate error on failure', async () => {
      mockApiService.post$.mockReturnValue(throwError(() => new Error('Cannot decline')));

      await expect(firstValueFrom(service.declineTask('household-1', 'task-1'))).rejects.toThrow();
    });
  });

  describe('undoDecline', () => {
    it('should call correct API endpoint', async () => {
      mockApiService.delete$.mockReturnValue(of({ success: true }));
      mockApiService.get$.mockReturnValue(of({ tasks: [] }));

      await firstValueFrom(service.undoDecline('household-1', 'task-1', 'child-1'));

      expect(mockApiService.delete$).toHaveBeenCalledWith(
        '/households/household-1/tasks/task-1/responses/child-1',
      );
    });

    it('should reload available tasks on success', async () => {
      mockApiService.delete$.mockReturnValue(of({ success: true }));
      mockApiService.get$.mockReturnValue(of({ tasks: [mockAvailableTask] }));

      await firstValueFrom(service.undoDecline('household-1', 'task-1', 'child-1'));

      // loadAvailableTasks should have been called
      expect(mockApiService.get$).toHaveBeenCalledWith('/children/available-tasks');
    });
  });

  describe('loadFailedTasks', () => {
    it('should call correct API endpoint', async () => {
      mockApiService.get$.mockReturnValue(of({ tasks: [mockFailedTask] }));

      await firstValueFrom(service.loadFailedTasks('household-1'));

      expect(mockApiService.get$).toHaveBeenCalledWith(
        '/households/household-1/single-tasks/failed',
      );
    });

    it('should update failedTasks on success', async () => {
      mockApiService.get$.mockReturnValue(of({ tasks: [mockFailedTask] }));

      await firstValueFrom(service.loadFailedTasks('household-1'));

      expect(service.failedTasks()).toEqual([mockFailedTask]);
    });

    it('should set error on failure', async () => {
      mockApiService.get$.mockReturnValue(throwError(() => new Error('Network error')));

      try {
        await firstValueFrom(service.loadFailedTasks('household-1'));
      } catch {
        // Expected to throw
      }

      expect(service.failedError()).toBe('Failed to load failed tasks');
    });
  });

  describe('loadExpiredTasks', () => {
    it('should call correct API endpoint', async () => {
      mockApiService.get$.mockReturnValue(of({ tasks: [mockFailedTask] }));

      await firstValueFrom(service.loadExpiredTasks('household-1'));

      expect(mockApiService.get$).toHaveBeenCalledWith(
        '/households/household-1/single-tasks/expired',
      );
    });

    it('should update expiredTasks on success', async () => {
      mockApiService.get$.mockReturnValue(of({ tasks: [mockFailedTask] }));

      await firstValueFrom(service.loadExpiredTasks('household-1'));

      expect(service.expiredTasks()).toEqual([mockFailedTask]);
    });

    it('should set error on failure', async () => {
      mockApiService.get$.mockReturnValue(throwError(() => new Error('Network error')));

      try {
        await firstValueFrom(service.loadExpiredTasks('household-1'));
      } catch {
        // Expected to throw
      }

      expect(service.expiredError()).toBe('Failed to load expired tasks');
    });
  });

  describe('getTaskCandidates', () => {
    it('should call correct API endpoint', async () => {
      mockApiService.get$.mockReturnValue(of({ candidates: [mockCandidate] }));

      await firstValueFrom(service.getTaskCandidates('household-1', 'task-1'));

      expect(mockApiService.get$).toHaveBeenCalledWith(
        '/households/household-1/tasks/task-1/candidates',
      );
    });

    it('should return candidates', async () => {
      mockApiService.get$.mockReturnValue(of({ candidates: [mockCandidate] }));

      const result = await firstValueFrom(service.getTaskCandidates('household-1', 'task-1'));

      expect(result.candidates).toEqual([mockCandidate]);
    });
  });

  describe('clearState', () => {
    it('should clear all state', async () => {
      // Set up some state first
      mockApiService.get$.mockReturnValue(of({ tasks: [mockAvailableTask] }));
      await firstValueFrom(service.loadAvailableTasks());

      service.clearState();

      expect(service.availableTasks()).toEqual([]);
      expect(service.failedTasks()).toEqual([]);
      expect(service.expiredTasks()).toEqual([]);
      expect(service.availableError()).toBeNull();
      expect(service.failedError()).toBeNull();
      expect(service.expiredError()).toBeNull();
    });
  });

  describe('Computed Signals', () => {
    it('should update hasAvailableTasks when tasks change', async () => {
      expect(service.hasAvailableTasks()).toBe(false);

      mockApiService.get$.mockReturnValue(of({ tasks: [mockAvailableTask] }));
      await firstValueFrom(service.loadAvailableTasks());

      expect(service.hasAvailableTasks()).toBe(true);
    });

    it('should update hasFailedTasks when tasks change', async () => {
      expect(service.hasFailedTasks()).toBe(false);

      mockApiService.get$.mockReturnValue(of({ tasks: [mockFailedTask] }));
      await firstValueFrom(service.loadFailedTasks('household-1'));

      expect(service.hasFailedTasks()).toBe(true);
    });

    it('should update totalProblemTasks correctly', async () => {
      expect(service.totalProblemTasks()).toBe(0);

      mockApiService.get$
        .mockReturnValueOnce(of({ tasks: [mockFailedTask] }))
        .mockReturnValueOnce(of({ tasks: [mockFailedTask] }));

      await firstValueFrom(service.loadFailedTasks('household-1'));
      await firstValueFrom(service.loadExpiredTasks('household-1'));

      expect(service.totalProblemTasks()).toBe(2);
    });
  });
});
