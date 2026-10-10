import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { Tasks } from './tasks';
import { TaskService } from '../../services/task.service';
import { ChildrenService } from '../../services/children.service';
import { HouseholdDayService } from '../../services/household-day.service';
import { STORAGE_KEYS } from '../../services/storage-keys';
import { AuthService } from '../../services/auth.service';
import type { Task, Assignment, Child } from '@st44/types';

describe('Tasks (Poeng task list)', () => {
  let component: Tasks;
  let fixture: ComponentFixture<Tasks>;
  let mockTaskService: {
    tasks: ReturnType<typeof signal<Task[]>>;
    getTasks: ReturnType<typeof vi.fn>;
    getTask: ReturnType<typeof vi.fn>;
    completeTask: ReturnType<typeof vi.fn>;
    createTask: ReturnType<typeof vi.fn>;
    updateTask: ReturnType<typeof vi.fn>;
    deleteTask: ReturnType<typeof vi.fn>;
    reassignTask: ReturnType<typeof vi.fn>;
  };
  let mockChildren: { listChildren: ReturnType<typeof vi.fn> };
  let mockDay: { load: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let queryParams: Record<string, string>;

  const task: Task = {
    id: 'task-1',
    householdId: 'household-1',
    name: 'Rydde rommet',
    description: null,
    points: 10,
    ruleType: 'daily',
    ruleConfig: null,
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const assignment = (over: Partial<Assignment>): Assignment => ({
    id: 'a-1',
    taskId: 'task-1',
    childId: 'child-1',
    childName: 'Emma',
    date: '2024-01-15',
    status: 'pending',
    title: 'Rydde rommet',
    description: null,
    ruleType: 'daily',
    completedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    ...over,
  });

  const emma: Child = {
    id: 'child-1',
    householdId: 'household-1',
    name: 'Emma',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
  const jonas: Child = { ...emma, id: 'child-2', name: 'Jonas' };

  const day = {
    today: [
      assignment({ id: 'open-emma' }),
      assignment({ id: 'open-jonas', childId: 'child-2', childName: 'Jonas' }),
      assignment({ id: 'done-emma', status: 'completed', completedAt: '2024-01-15T16:10:00Z' }),
    ],
    overdue: [
      assignment({ id: 'late-jonas', childId: 'child-2', childName: 'Jonas', date: '2024-01-14' }),
    ],
  };

  beforeEach(async () => {
    queryParams = {};
    mockTaskService = {
      tasks: signal<Task[]>([task, { ...task, id: 'task-off', active: false }]),
      getTasks: vi.fn().mockReturnValue(of({ tasks: [task] })),
      getTask: vi.fn().mockReturnValue(of(task)),
      completeTask: vi.fn().mockResolvedValue({}),
      createTask: vi.fn().mockReturnValue(of(task)),
      updateTask: vi.fn().mockReturnValue(of(task)),
      deleteTask: vi.fn().mockReturnValue(of(undefined)),
      reassignTask: vi.fn().mockReturnValue(of({})),
    };
    mockChildren = { listChildren: vi.fn().mockResolvedValue([emma, jonas]) };
    mockDay = {
      load: vi.fn().mockResolvedValue({ today: [...day.today], overdue: [...day.overdue] }),
    };
    localStorage.setItem(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID, 'household-1');
    mockRouter = { navigate: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [Tasks],
      providers: [
        { provide: TaskService, useValue: mockTaskService },
        { provide: ChildrenService, useValue: mockChildren },
        { provide: HouseholdDayService, useValue: mockDay },
        {
          provide: AuthService,
          useValue: { currentUser: signal({ id: 'user-1', role: 'parent' }), logout: vi.fn() },
        },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Tasks);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('loading', () => {
    it('loads the day, the children and the templates for the household', async () => {
      await component['loadTasks']();

      expect(mockDay.load).toHaveBeenCalledWith('household-1');
      expect(mockChildren.listChildren).toHaveBeenCalledWith('household-1');
      expect(mockTaskService.getTasks).toHaveBeenCalledWith('household-1', true);
      expect(component['children']()).toEqual([emma, jonas]);
      expect(component['loading']()).toBe(false);
    });

    it('shows an error when no household is selected', async () => {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID);
      fixture = TestBed.createComponent(Tasks);
      component = fixture.componentInstance;

      await component['loadTasks']();

      expect(component['error']()).toBe('Ingen husstand valgt');
      expect(mockDay.load).not.toHaveBeenCalled();
    });

    it('shows an error when loading fails', async () => {
      mockDay.load.mockRejectedValue(new Error('down'));

      await component['loadTasks']();

      expect(component['error']()).toBe('Kunne ikke laste oppgavene');
      expect(component['loading']()).toBe(false);
    });

    it('takes the selected child from the URL', () => {
      queryParams['child'] = 'child-2';
      component.ngOnInit();
      expect(component['selectedChildId']()).toBe('child-2');
    });
  });

  describe('groups', () => {
    beforeEach(async () => {
      await component['loadTasks']();
    });

    it('splits the day into Forfalt, I dag and Gjort i dag', () => {
      expect(component['overdueRows']().map((a) => a.id)).toEqual(['late-jonas']);
      expect(component['openRows']().map((a) => a.id)).toEqual(['open-emma', 'open-jonas']);
      expect(component['doneRows']().map((a) => a.id)).toEqual(['done-emma']);
      expect(component['hasDay']()).toBe(true);
    });

    it('counts the day and the overdue chores in the subtitle', () => {
      expect(component['subtitle']()).toBe('4 i dag – 1 forfalt');
    });

    it('keeps only the selected child, matched by id or name', () => {
      component['onSelectChild']('child-2');

      expect(component['overdueRows']().map((a) => a.id)).toEqual(['late-jonas']);
      expect(component['openRows']().map((a) => a.id)).toEqual(['open-jonas']);
      expect(component['doneRows']()).toEqual([]);
      expect(component['subtitle']()).toBe('2 i dag – 1 forfalt');
    });

    it('lists only active templates under Alle oppgaver', () => {
      expect(component['templates']().map((t) => t.id)).toEqual(['task-1']);
    });

    it('offers Bytt only with one child selected', () => {
      expect(component['canReassign']()).toBe(false);
      component['onSelectChild']('child-1');
      expect(component['canReassign']()).toBe(true);
    });
  });

  describe('child chips', () => {
    it('keeps the chip in the URL', () => {
      component['onSelectChild']('child-1');

      expect(component['selectedChildId']()).toBe('child-1');
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { child: 'child-1', filter: null },
          replaceUrl: true,
        }),
      );
    });

    it('does nothing when the same chip is tapped again', () => {
      component['onSelectChild'](null);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('row meta', () => {
    it('names the child and the time', () => {
      expect(component['doneMeta'](assignment({ completedAt: null }))).toBe('Emma – Gjort');
      expect(component['points'](10)).toBe('10 p');
      expect(component['points'](undefined)).toBe('');
      expect(component['templateMeta']({ ...task, ruleType: 'single' })).toBe('Én gang');
      expect(component['templateMeta'](task)).toBe('Gjentas');
    });
  });

  describe('actions', () => {
    beforeEach(async () => {
      await component['loadTasks']();
    });

    it('ticks an open chore off and moves it to Gjort i dag', async () => {
      await component['onComplete'](component['openRows']()[0]);

      expect(mockTaskService.completeTask).toHaveBeenCalledWith('open-emma');
      expect(component['doneRows']().map((a) => a.id)).toContain('open-emma');
      expect(component['completingId']()).toBeNull();
    });

    it('ticks an overdue chore off and takes it out of Forfalt', async () => {
      await component['onComplete'](component['overdueRows']()[0]);

      expect(component['overdueRows']()).toEqual([]);
    });

    it('shows an error when ticking off fails', async () => {
      mockTaskService.completeTask.mockRejectedValue(new Error('nope'));

      await component['onComplete'](component['openRows']()[0]);

      expect(component['error']()).toBe('Kunne ikke hake av oppgaven');
      expect(component['openRows']().map((a) => a.id)).toContain('open-emma');
    });

    it('opens the edit modal with the template behind a row', () => {
      component['onEdit']('task-1');

      expect(component['editOpen']()).toBe(true);
      expect(component['editingTask']()).toEqual(task);
      expect(mockTaskService.getTask).not.toHaveBeenCalled();
    });

    it('fetches a template that is not in the list', () => {
      component['onEdit']('task-gone');

      expect(mockTaskService.getTask).toHaveBeenCalledWith('household-1', 'task-gone');
      expect(component['editOpen']()).toBe(true);
    });

    it('saves and deletes from the edit modal, then closes it', () => {
      component['onEdit']('task-1');
      component['onTaskUpdate']({ name: 'Ny' } as never);
      expect(mockTaskService.updateTask).toHaveBeenCalledWith('household-1', 'task-1', {
        name: 'Ny',
      });
      expect(component['editOpen']()).toBe(false);

      component['onEdit']('task-1');
      component['onTaskDelete']();
      expect(mockTaskService.deleteTask).toHaveBeenCalledWith('household-1', 'task-1');
      expect(component['editingTask']()).toBeNull();
    });

    it('shows an error when saving fails', () => {
      mockTaskService.updateTask.mockReturnValue(throwError(() => new Error('nope')));
      component['onEdit']('task-1');
      component['onTaskUpdate']({ name: 'Ny' } as never);

      expect(component['error']()).toBe('Kunne ikke lagre oppgaven');
    });

    it('creates a task and closes the modal', () => {
      component['createOpen'].set(true);
      component['onCreate']({
        name: 'Støvsuge',
        description: '',
        points: 5,
        ruleType: 'daily',
        ruleConfig: null,
      } as never);

      expect(mockTaskService.createTask).toHaveBeenCalledWith(
        'household-1',
        expect.objectContaining({ name: 'Støvsuge', points: 5 }),
      );
      expect(component['createOpen']()).toBe(false);
    });

    it('reassigns an open chore with Bytt', () => {
      const row = component['openRows']()[0];
      component['onReassign'](row);
      expect(component['reassignOpen']()).toBe(true);

      component['onReassignConfirm']('child-2');

      expect(mockTaskService.reassignTask).toHaveBeenCalledWith('open-emma', 'child-2');
      expect(component['reassignOpen']()).toBe(false);
      expect(component['reassigning']()).toBeNull();
    });
  });
});
