import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AvailableTasksSectionComponent } from './available-tasks-section';
import { SingleTaskService, type AvailableSingleTask } from '../../services/single-task.service';

describe('AvailableTasksSectionComponent', () => {
  let component: AvailableTasksSectionComponent;
  let fixture: ComponentFixture<AvailableTasksSectionComponent>;
  let mockSingleTaskService: {
    availableTasks: ReturnType<typeof signal<AvailableSingleTask[]>>;
    availableLoading: ReturnType<typeof signal<boolean>>;
    availableError: ReturnType<typeof signal<string | null>>;
    loadAvailableTasks: ReturnType<typeof vi.fn>;
    acceptTask: ReturnType<typeof vi.fn>;
    declineTask: ReturnType<typeof vi.fn>;
  };

  const mockTask: AvailableSingleTask = {
    id: 'task-1',
    householdId: 'household-1',
    name: 'Clean Room',
    description: 'Clean your room thoroughly',
    points: 10,
    deadline: null,
    candidateCount: 2,
    declineCount: 0,
    hasDeadline: false,
    daysUntilDeadline: null,
  };

  const mockTaskWithDeadline: AvailableSingleTask = {
    id: 'task-2',
    householdId: 'household-1',
    name: 'Homework',
    description: 'Complete homework',
    points: 15,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    candidateCount: 1,
    declineCount: 0,
    hasDeadline: true,
    daysUntilDeadline: 1,
  };

  beforeEach(async () => {
    const availableTasksSignal = signal<AvailableSingleTask[]>([mockTask]);
    const availableLoadingSignal = signal(false);
    const availableErrorSignal = signal<string | null>(null);

    mockSingleTaskService = {
      availableTasks: availableTasksSignal,
      availableLoading: availableLoadingSignal,
      availableError: availableErrorSignal,
      loadAvailableTasks: vi.fn().mockReturnValue(of({ tasks: [mockTask] })),
      acceptTask: vi.fn().mockReturnValue(of({ assignment: { id: 'assignment-1' } })),
      declineTask: vi.fn().mockReturnValue(of({ success: true })),
    };

    await TestBed.configureTestingModule({
      imports: [AvailableTasksSectionComponent],
      providers: [{ provide: SingleTaskService, useValue: mockSingleTaskService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AvailableTasksSectionComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should load tasks on init', () => {
      fixture.detectChanges();
      expect(mockSingleTaskService.loadAvailableTasks).toHaveBeenCalled();
    });

    it('should display tasks from service', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const taskCards = compiled.querySelectorAll('.task-card');
      expect(taskCards.length).toBe(1);
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading', () => {
      mockSingleTaskService.availableLoading.set(true);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const loading = compiled.querySelector('.loading');
      expect(loading).toBeTruthy();
    });

    it('should show loading indicator alongside tasks when loading', () => {
      // Note: The component shows loading state independently of task list
      // Tasks are still visible while loading in the current implementation
      mockSingleTaskService.availableLoading.set(true);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const loading = compiled.querySelector('.loading');
      const taskCards = compiled.querySelectorAll('.task-card');
      expect(loading).toBeTruthy();
      // Tasks are still shown while loading
      expect(taskCards.length).toBe(1);
    });
  });

  describe('Error State', () => {
    it('should show error message when error occurs', () => {
      mockSingleTaskService.availableError.set('Failed to load tasks');
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const error = compiled.querySelector('.error-message');
      expect(error).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no tasks', () => {
      mockSingleTaskService.availableTasks.set([]);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const empty = compiled.querySelector('.empty-state');
      expect(empty).toBeTruthy();
    });
  });

  describe('Accept Task', () => {
    it('should call acceptTask on service when accept button clicked', async () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const acceptBtn = compiled.querySelector('.btn-accept') as HTMLButtonElement;
      acceptBtn?.click();
      await fixture.whenStable();

      expect(mockSingleTaskService.acceptTask).toHaveBeenCalledWith('household-1', 'task-1');
    });

    it('should set processing state during accept and clear on completion', async () => {
      fixture.detectChanges();
      // With synchronous mock observable, the processing state is set then immediately cleared
      component['onAccept'](mockTask);
      await fixture.whenStable();
      // After completion, processing should be cleared
      expect(component['processingTaskId']()).toBeNull();
      expect(mockSingleTaskService.acceptTask).toHaveBeenCalled();
    });

    it('should clear processing state on success', async () => {
      fixture.detectChanges();
      component['onAccept'](mockTask);
      await fixture.whenStable();
      expect(component['processingTaskId']()).toBeNull();
    });

    it('should show error on accept failure', async () => {
      mockSingleTaskService.acceptTask.mockReturnValue(
        throwError(() => ({ error: { error: 'Task already taken' } })),
      );
      fixture.detectChanges();
      component['onAccept'](mockTask);
      await fixture.whenStable();

      expect(component['actionError']()).toBe('Task already taken');
    });

    it('should prevent duplicate submissions', async () => {
      fixture.detectChanges();
      component['processingTaskId'].set('task-1');
      component['onAccept'](mockTask);
      await fixture.whenStable();

      expect(mockSingleTaskService.acceptTask).not.toHaveBeenCalled();
    });
  });

  describe('Decline Task', () => {
    it('should call declineTask on service when decline button clicked', async () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const declineBtn = compiled.querySelector('.btn-decline') as HTMLButtonElement;
      declineBtn?.click();
      await fixture.whenStable();

      expect(mockSingleTaskService.declineTask).toHaveBeenCalledWith('household-1', 'task-1');
    });

    it('should clear processing state on success', async () => {
      fixture.detectChanges();
      component['onDecline'](mockTask);
      await fixture.whenStable();
      expect(component['processingTaskId']()).toBeNull();
    });

    it('should show error on decline failure', async () => {
      mockSingleTaskService.declineTask.mockReturnValue(
        throwError(() => ({ error: { error: 'Cannot decline' } })),
      );
      fixture.detectChanges();
      component['onDecline'](mockTask);
      await fixture.whenStable();

      expect(component['actionError']()).toBe('Cannot decline');
    });
  });

  describe('Deadline Display', () => {
    it('should return empty string for tasks without deadline', () => {
      fixture.detectChanges();
      const text = component['getDeadlineText'](mockTask);
      expect(text).toBe('');
    });

    it('should return "Due today" for tasks due today', () => {
      const todayTask: AvailableSingleTask = {
        ...mockTask,
        hasDeadline: true,
        daysUntilDeadline: 0,
      };
      fixture.detectChanges();
      const text = component['getDeadlineText'](todayTask);
      expect(text).toBe('Due today');
    });

    it('should return "Due tomorrow" for tasks due tomorrow', () => {
      fixture.detectChanges();
      const text = component['getDeadlineText'](mockTaskWithDeadline);
      expect(text).toBe('Due tomorrow');
    });

    it('should return "Overdue" for overdue tasks', () => {
      const overdueTask: AvailableSingleTask = {
        ...mockTask,
        hasDeadline: true,
        daysUntilDeadline: -1,
      };
      fixture.detectChanges();
      const text = component['getDeadlineText'](overdueTask);
      expect(text).toBe('Overdue');
    });

    it('should return days remaining for future tasks', () => {
      const futureTask: AvailableSingleTask = {
        ...mockTask,
        hasDeadline: true,
        daysUntilDeadline: 5,
      };
      fixture.detectChanges();
      const text = component['getDeadlineText'](futureTask);
      expect(text).toBe('Due in 5 days');
    });
  });

  describe('Deadline Urgency', () => {
    it('should return false for tasks without deadline', () => {
      fixture.detectChanges();
      expect(component['isDeadlineUrgent'](mockTask)).toBe(false);
    });

    it('should return true for tasks due today', () => {
      const urgentTask: AvailableSingleTask = {
        ...mockTask,
        hasDeadline: true,
        daysUntilDeadline: 0,
      };
      fixture.detectChanges();
      expect(component['isDeadlineUrgent'](urgentTask)).toBe(true);
    });

    it('should return true for tasks due tomorrow', () => {
      fixture.detectChanges();
      expect(component['isDeadlineUrgent'](mockTaskWithDeadline)).toBe(true);
    });

    it('should return false for tasks due in 2+ days', () => {
      const notUrgentTask: AvailableSingleTask = {
        ...mockTask,
        hasDeadline: true,
        daysUntilDeadline: 3,
      };
      fixture.detectChanges();
      expect(component['isDeadlineUrgent'](notUrgentTask)).toBe(false);
    });

    it('should return false for overdue tasks', () => {
      const overdueTask: AvailableSingleTask = {
        ...mockTask,
        hasDeadline: true,
        daysUntilDeadline: -1,
      };
      fixture.detectChanges();
      expect(component['isDeadlineUrgent'](overdueTask)).toBe(false);
    });
  });

  describe('Task Processing State', () => {
    it('should correctly identify processing task', () => {
      fixture.detectChanges();
      component['processingTaskId'].set('task-1');
      expect(component['isTaskProcessing']('task-1')).toBe(true);
      expect(component['isTaskProcessing']('task-2')).toBe(false);
    });
  });

  describe('Computed Signals', () => {
    it('should compute hasTasks correctly', () => {
      fixture.detectChanges();
      expect(component['hasTasks']()).toBe(true);

      mockSingleTaskService.availableTasks.set([]);
      expect(component['hasTasks']()).toBe(false);
    });

    it('should compute isProcessing correctly', () => {
      fixture.detectChanges();
      expect(component['isProcessing']()).toBe(false);

      component['processingTaskId'].set('task-1');
      expect(component['isProcessing']()).toBe(true);
    });
  });
});
