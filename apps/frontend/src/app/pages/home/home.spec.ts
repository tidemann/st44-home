import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { Home } from './home';
import { TaskService } from '../../services/task.service';
import { ChildrenService } from '../../services/children.service';
import { AuthService } from '../../services/auth.service';
import { HouseholdService } from '../../services/household.service';
import { HouseholdStore } from '../../stores/household.store';
import { PushNotificationService } from '../../services/push-notification.service';
import { HouseholdDayService } from '../../services/household-day.service';
import { isoDay } from '../../utils/poeng-format';
import { HttpErrorResponse } from '@angular/common/http';
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
  let mockAuthService: {
    currentUser: ReturnType<typeof vi.fn>;
    hasRole: ReturnType<typeof vi.fn>;
  };
  let mockPush: { remind: ReturnType<typeof vi.fn> };
  let mockHouseholdService: {
    listHouseholds: ReturnType<typeof vi.fn>;
    getHouseholdMembers: ReturnType<typeof vi.fn>;
  };
  let mockDay: { load: ReturnType<typeof vi.fn> };
  let mockHouseholdStore: {
    activeHouseholdId: ReturnType<typeof vi.fn>;
    autoActivateHousehold: ReturnType<typeof vi.fn>;
  };

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
      hasRole: vi.fn().mockReturnValue(false),
    };
    mockPush = { remind: vi.fn().mockResolvedValue(1) };
    mockHouseholdService = {
      listHouseholds: vi.fn(),
      getHouseholdMembers: vi.fn().mockResolvedValue([]),
    };
    mockDay = { load: vi.fn().mockResolvedValue({ today: [], overdue: [] }) };

    // Default mock returns
    mockHouseholdService.listHouseholds.mockResolvedValue([
      { id: 'household-1', name: 'Test Household', createdAt: new Date().toISOString() },
    ]);
    mockChildrenService.listChildren.mockResolvedValue([]);
    mockTaskService.getHouseholdAssignments.mockReturnValue(of([]));

    mockHouseholdStore = {
      activeHouseholdId: vi.fn().mockReturnValue('household-1'),
      autoActivateHousehold: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        { provide: TaskService, useValue: mockTaskService },
        { provide: ChildrenService, useValue: mockChildrenService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: HouseholdService, useValue: mockHouseholdService },
        { provide: HouseholdStore, useValue: mockHouseholdStore },
        { provide: PushNotificationService, useValue: mockPush },
        { provide: HouseholdDayService, useValue: mockDay },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('loadData', () => {
    it('should load household, children, and tasks on init', async () => {
      await component.ngOnInit();

      expect(mockHouseholdService.listHouseholds).toHaveBeenCalled();
      expect(mockChildrenService.listChildren).toHaveBeenCalledWith('household-1');
      expect(mockDay.load).toHaveBeenCalledWith('household-1');
      expect(mockHouseholdService.getHouseholdMembers).toHaveBeenCalledWith('household-1');
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
    it('should complete task and update state', async () => {
      const taskId = 'task-1';
      const mockTask: Partial<Assignment> = { id: taskId, status: 'pending' };
      component['todayTasks'].set([mockTask as Assignment]);

      mockTaskService.completeTask.mockResolvedValue({
        taskAssignment: {
          id: taskId,
          status: 'completed',
          completedAt: new Date().toISOString(),
        },
        completion: { id: 'c1', pointsEarned: 10, completedAt: new Date().toISOString() },
      });

      await component['onCompleteTask'](taskId);

      expect(mockTaskService.completeTask).toHaveBeenCalledWith(taskId);
      expect(component['todayTasks']().length).toBe(0);
      expect(mockHouseholdService.getHouseholdMembers).not.toHaveBeenCalled(); // no household set in this test
    });

    it('should handle completion error', async () => {
      const taskId = 'task-1';
      mockTaskService.completeTask.mockRejectedValue(new Error('Failed'));

      await component['onCompleteTask'](taskId);

      expect(component['error']()).toBe('Failed to complete task. Please try again.');
    });
  });

  describe('modal management', () => {
    // ST-691: the card hands over the assignment id, the template is under taskId
    it('loads the task template of the tapped assignment and opens the modal', () => {
      const mockTask: Partial<Task> = { id: 'task-1', name: 'Test' };
      component['householdId'].set('household-1');
      component['todayTasks'].set([{ id: 'assignment-1', taskId: 'task-1' } as Assignment]);
      mockTaskService.getTask.mockReturnValue(of(mockTask as Task));

      component['onEditTask']('assignment-1');

      expect(mockTaskService.getTask).toHaveBeenCalledWith('household-1', 'task-1');
      expect(component['editTaskOpen']()).toBe(true);
      expect(component['selectedTask']()).toEqual(mockTask as Task);
      expect(component['error']()).toBeNull();
    });

    it('finds assignments in "Kommende" too', () => {
      component['householdId'].set('household-1');
      component['upcomingTasks'].set([{ id: 'assignment-2', taskId: 'task-2' } as Assignment]);
      mockTaskService.getTask.mockReturnValue(of({ id: 'task-2' } as Task));

      component['onEditTask']('assignment-2');

      expect(mockTaskService.getTask).toHaveBeenCalledWith('household-1', 'task-2');
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

  describe('«Minn på» (ST-686)', () => {
    const open = {
      id: 'a-1',
      title: 'Gå på do',
      childId: 'c-1',
      childName: 'Emma',
      status: 'pending',
      date: '2026-10-05',
    } as Assignment;

    function remindButton(): HTMLButtonElement | null {
      fixture.detectChanges(); // first render starts the (mocked) load
      component['loading'].set(false);
      component['todayTasks'].set([open]);
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        'app-chore-row .rbtn',
      );
    }

    it('shows the button to parents on today’s open chores', () => {
      expect(remindButton()?.textContent).toContain('Minn på');
    });

    it('does not show it to a child', () => {
      mockAuthService.hasRole.mockImplementation((role: string) => role === 'child');
      expect(remindButton()).toBeNull();
    });

    it('says the reminder went to the child', async () => {
      component['todayTasks'].set([open]);
      await component['onRemind']('a-1');
      expect(mockPush.remind).toHaveBeenCalledWith('a-1');
      expect(component['remindMessage']()).toBe('Påminnelse sendt til Emma.');
      expect(component['remindingId']()).toBeNull();
    });

    it('says when the child has no phone with notifications on', async () => {
      component['todayTasks'].set([open]);
      mockPush.remind.mockResolvedValue(0);
      await component['onRemind']('a-1');
      expect(component['remindMessage']()).toContain('har ikke slått på varsler');
    });

    // ST-691: a failed send must never read as "sendt"
    it('says it could not send when the push service refused', async () => {
      mockPush.remind.mockRejectedValue(
        new HttpErrorResponse({
          status: 500,
          error: { message: 'push', details: { reason: 'pushFailed', pushStatus: 403 } },
        }),
      );
      await component['onRemind']('a-1');
      expect(component['remindMessage']()).toBe('Kunne ikke sende påminnelsen. Prøv igjen.');
      expect(component['remindMessage']()).not.toContain('sendt');
    });
  });

  describe('Poeng home (ST-777)', () => {
    const chore = (partial: Partial<Assignment>) =>
      ({
        id: crypto.randomUUID(),
        taskId: 't',
        title: 'Dekke bord',
        childId: 'c-jonas',
        childName: 'Jonas',
        status: 'pending',
        date: isoDay(),
        points: 10,
        ...partial,
      }) as Assignment;

    beforeEach(() => {
      mockHouseholdService.getHouseholdMembers.mockResolvedValue([
        { userId: 'c-emma', displayName: 'Emma', role: 'child', points: 340 },
        { userId: 'c-jonas', displayName: 'Jonas', role: 'child', points: 215 },
        { userId: 'p-1', displayName: 'Kari', role: 'parent', points: 0 },
      ]);
      mockDay.load.mockResolvedValue({
        today: [
          chore({ status: 'completed' }),
          chore({ points: 5 }),
          chore({ childId: 'c-emma', childName: 'Emma', status: 'completed' }),
          chore({ childId: 'c-emma', childName: 'Emma', points: 15 }),
        ],
        overdue: [chore({ title: 'Søppel og pant ut', date: isoDay(-1) })],
      });
    });

    it('draws one card per child with a done, open and late meter', async () => {
      await component.ngOnInit();

      const kids = component['childSummaries']();
      expect(kids.map((k) => [k.name, k.points])).toEqual([
        ['Emma', 340],
        ['Jonas', 215],
      ]);
      expect(kids[1].chores).toEqual(['done', 'open', 'late']);
    });

    it('counts the day in the sub-line and sums what is left', async () => {
      await component.ngOnInit();

      expect(component['subtitle']()).toMatch(/– 2 av 5 gjort$/);
      expect(component['leftToday']()).toBe('2 oppgaver – 20 poeng');
    });

    it('puts left-over chores under Forfalt, saying when they were due', async () => {
      await component.ngOnInit();

      const overdue = component['overdueTasks']();
      expect(overdue.map((a) => a.title)).toEqual(['Søppel og pant ut']);
      expect(component['rowMeta'](overdue[0], true)).toBe('Jonas – forfalt i går');
    });
  });
});
