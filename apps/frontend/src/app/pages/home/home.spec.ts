import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Home } from './home';
import { TaskService } from '../../services/task.service';
import { ChildrenService } from '../../services/children.service';
import { AuthService } from '../../services/auth.service';
import { HouseholdService } from '../../services/household.service';
import type { Assignment, Task } from '@st44/types';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let mockTaskService: {
    getHouseholdAssignments: ReturnType<typeof vi.fn>;
    completeTask: ReturnType<typeof vi.fn>;
    getTask: ReturnType<typeof vi.fn>;
    updateTask: ReturnType<typeof vi.fn>;
    deleteTask: ReturnType<typeof vi.fn>;
    createTask: ReturnType<typeof vi.fn>;
  };
  let mockChildrenService: { listChildren: ReturnType<typeof vi.fn> };
  let mockAuthService: { currentUser: ReturnType<typeof vi.fn> };
  let mockHouseholdService: { listHouseholds: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    // Create mock services
    mockTaskService = {
      getHouseholdAssignments: vi.fn(),
      completeTask: vi.fn(),
      getTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      createTask: vi.fn(),
    };
    mockChildrenService = { listChildren: vi.fn() };
    mockAuthService = {
      currentUser: vi.fn().mockReturnValue({ id: '1', email: 'test@example.com' }),
    };
    mockHouseholdService = { listHouseholds: vi.fn() };

    // Default mock returns
    mockHouseholdService.listHouseholds.mockResolvedValue([
      { id: 'household-1', name: 'Test Household', createdAt: new Date().toISOString() },
    ]);
    mockChildrenService.listChildren.mockResolvedValue([]);
    mockTaskService.getHouseholdAssignments.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        { provide: TaskService, useValue: mockTaskService },
        { provide: ChildrenService, useValue: mockChildrenService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: HouseholdService, useValue: mockHouseholdService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('greeting', () => {
    it('should return appropriate greeting based on time', () => {
      // Just verify greeting is one of the three options
      const greeting = component['greeting']();
      expect(['Good morning', 'Good afternoon', 'Good evening']).toContain(greeting);
    });
  });

  describe('loadData', () => {
    it('should load household, children, and tasks on init', async () => {
      const mockAssignments: Partial<Assignment>[] = [
        { id: '1', status: 'pending', date: new Date().toISOString() },
      ];

      mockTaskService.getHouseholdAssignments.mockReturnValue(of(mockAssignments as Assignment[]));

      await component.ngOnInit();

      expect(mockHouseholdService.listHouseholds).toHaveBeenCalled();
      expect(mockChildrenService.listChildren).toHaveBeenCalledWith('household-1');
      expect(component['loading']()).toBe(false);
    });

    it('should handle error when user not authenticated', async () => {
      mockAuthService.currentUser.mockReturnValue(null);

      await component.ngOnInit();

      expect(component['error']()).toBe('User not authenticated');
      expect(component['loading']()).toBe(false);
    });

    it('should handle error when no household found', async () => {
      mockHouseholdService.listHouseholds.mockResolvedValue([]);

      await component.ngOnInit();

      expect(component['error']()).toBe('No household found');
      expect(component['loading']()).toBe(false);
    });
  });

  describe('task completion', () => {
    it('should complete task and update state', () => {
      const taskId = 'task-1';
      const mockTask: Partial<Assignment> = { id: taskId, status: 'pending' };
      component['todayTasks'].set([mockTask as Assignment]);
      component['stats'].set({ activeCount: 1, weekProgress: 0, totalPoints: 0 });

      mockTaskService.completeTask.mockReturnValue(
        of({
          taskAssignment: {
            id: taskId,
            status: 'completed',
            completedAt: new Date().toISOString(),
          },
          completion: { id: 'c1', pointsEarned: 10, completedAt: new Date().toISOString() },
        }),
      );

      component['onCompleteTask'](taskId);

      expect(mockTaskService.completeTask).toHaveBeenCalledWith(taskId);
      expect(component['todayTasks']().length).toBe(0);
      expect(component['stats']().activeCount).toBe(0);
      expect(component['stats']().totalPoints).toBe(10);
    });

    it('should handle completion error', () => {
      const taskId = 'task-1';
      mockTaskService.completeTask.mockReturnValue(throwError(() => new Error('Failed')));

      component['onCompleteTask'](taskId);

      expect(component['error']()).toBe('Failed to complete task. Please try again.');
    });
  });

  describe('modal management', () => {
    it('should open quick-add modal', () => {
      component['openQuickAdd']();
      expect(component['quickAddOpen']()).toBe(true);
    });

    it('should close quick-add modal', () => {
      component['quickAddOpen'].set(true);
      component['closeQuickAdd']();
      expect(component['quickAddOpen']()).toBe(false);
    });

    it('should open edit task modal with task data', () => {
      const mockTask: Partial<Task> = { id: 'task-1', name: 'Test' };
      component['householdId'].set('household-1');
      mockTaskService.getTask.mockReturnValue(of(mockTask as Task));

      component['onEditTask']('task-1');

      expect(mockTaskService.getTask).toHaveBeenCalledWith('household-1', 'task-1');
    });

    it('should close edit task modal', () => {
      component['editTaskOpen'].set(true);
      const mockTask: Partial<Task> = { id: 'task-1', name: 'Test' };
      component['selectedTask'].set(mockTask as Task);

      component['closeEditTask']();

      expect(component['editTaskOpen']()).toBe(false);
      expect(component['selectedTask']()).toBeNull();
    });
  });

  describe('navigation', () => {
    it('should update active screen on navigate', () => {
      component['onNavigate']('tasks');
      expect(component['activeScreen']()).toBe('tasks');
    });
  });

  describe('computed values', () => {
    it('should compute hasTodayTasks correctly', () => {
      expect(component['hasTodayTasks']()).toBe(false);

      const mockTask: Partial<Assignment> = { id: '1' };
      component['todayTasks'].set([mockTask as Assignment]);
      expect(component['hasTodayTasks']()).toBe(true);
    });

    it('should compute hasUpcomingTasks correctly', () => {
      expect(component['hasUpcomingTasks']()).toBe(false);

      const mockTask: Partial<Assignment> = { id: '1' };
      component['upcomingTasks'].set([mockTask as Assignment]);
      expect(component['hasUpcomingTasks']()).toBe(true);
    });
  });
});
