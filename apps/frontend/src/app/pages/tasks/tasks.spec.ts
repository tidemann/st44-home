import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tasks } from './tasks';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Router, ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import type { Task, Assignment, Child } from '@st44/types';

describe('Tasks Component', () => {
  let component: Tasks;
  let fixture: ComponentFixture<Tasks>;
  let mockTaskService: Partial<TaskService>;
  let mockAuthService: Partial<AuthService>;
  let mockApiService: Partial<ApiService>;
  let mockRouter: Partial<Router>;
  let mockActivatedRoute: Partial<ActivatedRoute>;

  const mockTask: Task = {
    id: 'task-1',
    householdId: 'household-1',
    name: 'Clean bathroom',
    description: null,
    points: 10,
    ruleType: 'daily',
    ruleConfig: null,
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockAssignment: Assignment = {
    id: 'assignment-1',
    taskId: 'task-1',
    childId: 'child-1',
    childName: null,
    date: '2024-01-15',
    status: 'pending',
    title: 'Clean bathroom',
    description: null,
    ruleType: 'daily',
    completedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockChild: Child = {
    id: 'child-1',
    householdId: 'household-1',
    name: 'Alex',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    // Create writable signals for mocking
    const tasksSignal = signal([mockTask]);
    const assignmentsSignal = signal([mockAssignment]);
    const myTasksSignal = signal<
      {
        id: string;
        taskName: string;
        taskDescription: string | null;
        points: number;
        date: string;
        status: 'pending' | 'completed' | 'overdue';
        completedAt: string | null;
      }[]
    >([]);

    // Mock TaskService
    mockTaskService = {
      tasks: tasksSignal.asReadonly(),
      assignments: assignmentsSignal.asReadonly(),
      myTasks: myTasksSignal.asReadonly(),
      getTasks: vi.fn().mockReturnValue(of({ tasks: [mockTask] })),
      getHouseholdAssignments: vi.fn().mockReturnValue(of({ assignments: [mockAssignment] })),
      getMyTasks: vi
        .fn()
        .mockReturnValue(of({ tasks: [], totalPointsToday: 0, completedPoints: 0, childName: '' })),
      completeTask: vi.fn().mockResolvedValue({ taskAssignment: {}, completion: {} }),
      updateTask: vi.fn().mockReturnValue(of(mockTask)),
      deleteTask: vi.fn().mockReturnValue(of(undefined)),
      // Store writable signals for test manipulation
      _tasksSignal: tasksSignal,
      _assignmentsSignal: assignmentsSignal,
      _myTasksSignal: myTasksSignal,
    } as Partial<TaskService> & {
      _tasksSignal: typeof tasksSignal;
      _assignmentsSignal: typeof assignmentsSignal;
      _myTasksSignal: typeof myTasksSignal;
    };

    // Create writable signals for AuthService
    const currentUserSignal = signal({
      id: 'user-1',
      email: 'test@example.com',
      role: 'parent' as const,
    });
    const isAuthenticatedSignal = signal(true);

    // Mock AuthService
    mockAuthService = {
      currentUser: currentUserSignal.asReadonly(),
      isAuthenticated: isAuthenticatedSignal.asReadonly(),
      hasRole: vi.fn((role: string) => currentUserSignal()?.role === role),
      // Store writable signal for test manipulation
      _currentUserSignal: currentUserSignal,
    } as unknown as Partial<AuthService> & {
      _currentUserSignal: typeof currentUserSignal;
    };

    // Mock ApiService
    mockApiService = {
      get: vi.fn().mockResolvedValue({ children: [mockChild] }),
    };

    // Mock Router
    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    // Mock ActivatedRoute
    mockActivatedRoute = {
      snapshot: {
        queryParams: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    };

    // Setup localStorage mock
    const localStorageMock = {
      getItem: vi.fn((key: string): string | null => {
        if (key === 'activeHouseholdId') return 'household-1';
        if (key === 'tasksFilter') return 'all';
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn((): string | null => null),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    await TestBed.configureTestingModule({
      imports: [Tasks],
      providers: [
        { provide: TaskService, useValue: mockTaskService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ApiService, useValue: mockApiService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Tasks);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('Filter Functionality', () => {
    it('should initialize with "all" filter by default', () => {
      fixture.detectChanges();
      expect(component['activeFilter']()).toBe('all');
    });

    it('should load filter from URL query params', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockRoute = mockActivatedRoute as { snapshot: any };
      mockRoute.snapshot.queryParams = { filter: 'mine' };
      fixture.detectChanges();
      expect(component['activeFilter']()).toBe('mine');
    });

    it('should load filter from localStorage if no URL param', () => {
      const localStorageMock = window.localStorage;
      vi.spyOn(localStorageMock, 'getItem').mockImplementation((key: string): string | null => {
        if (key === 'activeHouseholdId') return 'household-1';
        if (key === 'tasksFilter') return 'completed';
        return null;
      });
      fixture.detectChanges();
      expect(component['activeFilter']()).toBe('completed');
    });

    it('should change filter when tab is clicked', () => {
      fixture.detectChanges();
      component['onFilterClick']('mine');
      expect(component['activeFilter']()).toBe('mine');
    });

    it('should update filter state when filter is clicked', () => {
      fixture.detectChanges();
      component['onFilterClick']('completed');
      expect(component['activeFilter']()).toBe('completed');
    });

    it('should not change filter if same filter is clicked', () => {
      fixture.detectChanges();
      component['activeFilter'].set('mine');
      const initialCallCount = (mockTaskService.getTasks as ReturnType<typeof vi.fn>).mock.calls
        .length;
      component['onFilterClick']('mine'); // Click same filter
      const afterCallCount = (mockTaskService.getTasks as ReturnType<typeof vi.fn>).mock.calls
        .length;
      expect(afterCallCount).toBe(initialCallCount); // No additional loadTasks call
    });
  });

  describe('Task Loading', () => {
    it('should load tasks on initialization', () => {
      fixture.detectChanges();
      expect(mockTaskService.getTasks).toHaveBeenCalledWith('household-1', true);
    });

    it('should load my tasks when filter is "mine"', () => {
      fixture.detectChanges();
      component['onFilterClick']('mine');
      expect(mockTaskService.getMyTasks).toHaveBeenCalledWith('household-1');
    });

    it('should load assignments when filter is "completed"', () => {
      fixture.detectChanges();
      component['onFilterClick']('completed');
      expect(mockTaskService.getHouseholdAssignments).toHaveBeenCalledWith(
        'household-1',
        expect.objectContaining({ status: 'completed' }),
      );
    });

    it('should load members when filter is "person"', () => {
      fixture.detectChanges();
      component['onFilterClick']('person');
      expect(mockApiService.get).toHaveBeenCalledWith('/households/household-1/children');
    });

    it('should set error when household ID is missing', () => {
      const localStorageMock = window.localStorage;
      vi.spyOn(localStorageMock, 'getItem').mockReturnValue(null);
      fixture.detectChanges();
      expect(component['error']()).toBe('No household selected');
    });

    it('should handle task loading errors', () => {
      const mockServiceWithMethods = mockTaskService as Partial<TaskService> & {
        getTasks: ReturnType<typeof vi.fn>;
      };
      mockServiceWithMethods.getTasks?.mockReturnValue(throwError(() => new Error('API Error')));
      fixture.detectChanges();
      expect(component['error']()).toBe('Failed to load tasks');
    });
  });

  describe('Filtered Tasks', () => {
    it('should filter active tasks for "all" filter', () => {
      fixture.detectChanges();
      component['onFilterClick']('all');
      const filtered = component['filteredTasks']();
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('task-1');
    });

    it('should filter pending tasks for "mine" filter using myTasks', () => {
      const mockServiceWithWritableSignals = mockTaskService as Partial<TaskService> & {
        _myTasksSignal: ReturnType<
          typeof signal<
            {
              id: string;
              taskName: string;
              taskDescription: string | null;
              points: number;
              date: string;
              status: 'pending' | 'completed' | 'overdue';
              completedAt: string | null;
            }[]
          >
        >;
      };
      mockServiceWithWritableSignals._myTasksSignal.set([
        {
          id: 'my-task-1',
          taskName: 'My Task',
          taskDescription: null,
          points: 5,
          date: '2024-01-15',
          status: 'pending',
          completedAt: null,
        },
      ]);
      fixture.detectChanges();
      component['onFilterClick']('mine');
      const filtered = component['filteredTasks']();
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('my-task-1');
    });

    it('should filter by selected person for "person" filter', () => {
      fixture.detectChanges();
      component['onFilterClick']('person');
      component['selectedPersonId'].set('child-1');
      const filtered = component['filteredTasks']();
      expect(filtered.length).toBe(1);
    });

    it('should filter completed assignments for "completed" filter', () => {
      const mockServiceWithWritableSignals = mockTaskService as Partial<TaskService> & {
        _assignmentsSignal: ReturnType<typeof signal<Assignment[]>>;
      };
      mockServiceWithWritableSignals._assignmentsSignal.set([
        { ...mockAssignment, status: 'completed', completedAt: '2024-01-15T10:00:00Z' },
      ]);
      fixture.detectChanges();
      component['onFilterClick']('completed');
      const filtered = component['filteredTasks']();
      expect(filtered.length).toBe(1);
    });
  });

  describe('Task Actions', () => {
    it('should complete a task', () => {
      fixture.detectChanges();
      component['onTaskComplete']('assignment-1');
      expect(mockTaskService.completeTask).toHaveBeenCalledWith('assignment-1');
    });

    it('should open edit modal when task is clicked', () => {
      fixture.detectChanges();
      component['onTaskEdit']('task-1');
      expect(component['editModalOpen']()).toBe(true);
      expect(component['editingTask']()).toEqual(mockTask);
    });

    it('should update task from modal', () => {
      fixture.detectChanges();
      component['editingTask'].set(mockTask);
      const updateData = { name: 'Updated task', points: 15, ruleType: 'daily' as const };
      component['onTaskUpdate'](updateData);
      expect(mockTaskService.updateTask).toHaveBeenCalledWith('household-1', 'task-1', updateData);
    });

    it('should delete task from modal', () => {
      fixture.detectChanges();
      component['editingTask'].set(mockTask);
      component['onTaskDelete']();
      expect(mockTaskService.deleteTask).toHaveBeenCalledWith('household-1', 'task-1');
    });

    it('should close modal', () => {
      fixture.detectChanges();
      component['editModalOpen'].set(true);
      component['editingTask'].set(mockTask);
      component['onModalClose']();
      expect(component['editModalOpen']()).toBe(false);
      expect(component['editingTask']()).toBeNull();
    });
  });

  describe('Person Filter', () => {
    it('should update selected person when dropdown changes', () => {
      fixture.detectChanges();
      const event = { target: { value: 'child-1' } } as unknown as Event;
      component['onPersonChange'](event);
      expect(component['selectedPersonId']()).toBe('child-1');
    });

    it('should reload tasks when person selection changes', () => {
      fixture.detectChanges();
      vi.clearAllMocks();
      const event = { target: { value: 'child-1' } } as unknown as Event;
      component['onPersonChange'](event);
      expect(mockTaskService.getTasks).toHaveBeenCalled();
    });
  });

  describe('Empty State Messages', () => {
    it('should show correct message for "all" filter with no tasks', () => {
      const mockServiceWithWritableSignals = mockTaskService as Partial<TaskService> & {
        _tasksSignal: ReturnType<typeof signal<Task[]>>;
      };
      mockServiceWithWritableSignals._tasksSignal.set([]);
      fixture.detectChanges();
      component['onFilterClick']('all');
      expect(component['emptyMessage']()).toContain('Create your first task');
    });

    it('should show correct message for "mine" filter with no tasks', () => {
      const mockServiceWithWritableSignals = mockTaskService as Partial<TaskService> & {
        _myTasksSignal: ReturnType<
          typeof signal<
            {
              id: string;
              taskName: string;
              taskDescription: string | null;
              points: number;
              date: string;
              status: 'pending' | 'completed' | 'overdue';
              completedAt: string | null;
            }[]
          >
        >;
      };
      mockServiceWithWritableSignals._myTasksSignal.set([]);
      fixture.detectChanges();
      component['onFilterClick']('mine');
      expect(component['emptyMessage']()).toContain('No tasks assigned to you');
    });

    it('should show correct message for "person" filter with no selection', () => {
      fixture.detectChanges();
      component['onFilterClick']('person');
      component['selectedPersonId'].set(null);
      expect(component['emptyMessage']()).toContain('Select a person');
    });

    it('should show correct message for "completed" filter with no tasks', () => {
      const mockServiceWithWritableSignals = mockTaskService as Partial<TaskService> & {
        _assignmentsSignal: ReturnType<typeof signal<Assignment[]>>;
      };
      mockServiceWithWritableSignals._assignmentsSignal.set([]);
      fixture.detectChanges();
      component['onFilterClick']('completed');
      expect(component['emptyMessage']()).toContain('No completed tasks yet');
    });
  });

  describe('activeFilter', () => {
    it('should match active filter after click', () => {
      fixture.detectChanges();
      component['onFilterClick']('mine');
      expect(component['activeFilter']()).toBe('mine');
    });

    it('should not match inactive filter', () => {
      fixture.detectChanges();
      component['onFilterClick']('mine');
      expect(component['activeFilter']()).not.toBe('all');
    });
  });
});
