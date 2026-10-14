import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { Home, childCardColumns } from './home';
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
    setActiveHousehold: ReturnType<typeof vi.fn>;
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
      setActiveHousehold: vi.fn(),
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

  it('ignores a second household switch while the first is still loading', async () => {
    component['loading'].set(true);
    component['householdSheetOpen'].set(true);
    const loadData = vi
      .spyOn(component as unknown as { loadData: () => Promise<void> }, 'loadData')
      .mockResolvedValue();
    const setActiveHousehold = vi.spyOn(mockHouseholdStore, 'setActiveHousehold');

    await component['switchHousehold']('other-id');

    expect(setActiveHousehold).not.toHaveBeenCalled();
    expect(loadData).not.toHaveBeenCalled();
    expect(component['householdSheetOpen']()).toBe(false);
  });

  it('switches household and reloads when nothing is loading', async () => {
    const loadData = vi
      .spyOn(component as unknown as { loadData: () => Promise<void> }, 'loadData')
      .mockResolvedValue();

    await component['switchHousehold']('other-id');

    expect(mockHouseholdStore.setActiveHousehold).toHaveBeenCalledWith('other-id');
    expect(loadData).toHaveBeenCalledTimes(1);
  });

  describe('loadData', () => {
    it('uses the household name as the title', async () => {
      await component.ngOnInit();
      expect(component['homeTitle']()).toBe('Test Household');
    });

    it('shows «Hjemme» before the household is loaded', () => {
      expect(component['homeTitle']()).toBe('Hjemme');
    });

    it('hides the caret with one household', async () => {
      await component.ngOnInit();
      expect(component['showHouseholdCaret']()).toBe(false);
    });

    it('shows the caret with two households', async () => {
      mockHouseholdService.listHouseholds.mockResolvedValue([
        { id: 'household-1', name: 'Test Household', createdAt: new Date().toISOString() },
        { id: 'household-2', name: 'Hytta', createdAt: new Date().toISOString() },
      ]);
      await component.ngOnInit();
      expect(component['showHouseholdCaret']()).toBe(true);
      expect(component['homeTitle']()).toBe('Test Household');
    });

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

    function render(overdue: Assignment[], today: Assignment[]): HTMLElement {
      fixture.detectChanges(); // first render starts the (mocked) load
      component['loading'].set(false);
      component['overdueTasks'].set(overdue);
      component['todayTasks'].set(today);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    function remindButton(): HTMLButtonElement | null {
      return render([open], []).querySelector<HTMLButtonElement>('app-chore-row .rbtn');
    }

    it('shows the button to parents on overdue chores', () => {
      expect(remindButton()?.textContent).toContain('Minn på');
    });

    // ST-800: as in the signed-off picture, only Forfalt rows get «Minn på»
    it('shows points, not the button, on today’s open chores', () => {
      const el = render([], [{ ...open, points: 10 } as Assignment]);
      expect(el.querySelector('app-chore-row .rbtn')).toBeNull();
      expect(el.querySelector('app-chore-row')?.textContent).toContain('10');
    });

    it('puts one button on each overdue row and none on today’s rows', () => {
      const el = render(
        [open, { ...open, id: 'a-2' }],
        [
          { ...open, id: 'a-3' },
          { ...open, id: 'a-4' },
        ],
      );
      expect(el.querySelectorAll('app-chore-row').length).toBe(4);
      expect(el.querySelectorAll('app-chore-row .rbtn').length).toBe(2);
    });

    it('does not show it to a child', () => {
      mockAuthService.hasRole.mockImplementation((role: string) => role === 'child');
      expect(remindButton()).toBeNull();
    });

    it('says the reminder went to the child', async () => {
      component['todayTasks'].set([open]);
      await component['onRemind']('a-1');
      expect(mockPush.remind).toHaveBeenCalledWith('a-1');
      expect(component['remindAnnounce']()).toBe('Påminnelse sendt til Emma.');
      expect(component['remindMessage']()).toBeNull();
      expect(component['remindingId']()).toBeNull();
    });

    // ST-1066 C: thumbs up + «Sendt» in the button, «Påminnelse sendt HH.MM» stays in the row
    it('turns the button into «Sendt» and keeps the time in the row', async () => {
      render([open], []);
      await component['onRemind']('a-1');
      const el = render([open], []); // the mocked first load settled during the await
      const btn = el.querySelector<HTMLButtonElement>('app-chore-row .rbtn')!;
      expect(btn.textContent!.trim()).toBe('Sendt');
      expect(btn.classList).toContain('rbtn-sent');
      expect(btn.disabled).toBe(true);
      expect(btn.querySelector('svg')).not.toBeNull();
      const note = el.querySelector('app-chore-row .note')!;
      expect(note.textContent!.trim()).toMatch(/^Påminnelse sendt \d\d\.\d\d$/);
      expect(note.classList).not.toContain('rust');
    });

    it('offers «Prøv igjen» and a rust line when sending failed', async () => {
      render([open], []);
      mockPush.remind.mockRejectedValue(new HttpErrorResponse({ status: 500 }));
      await component['onRemind']('a-1');
      const el = render([open], []);
      const btn = el.querySelector<HTMLButtonElement>('app-chore-row .rbtn')!;
      expect(btn.textContent!.trim()).toBe('Prøv igjen');
      expect(btn.disabled).toBe(false);
      const note = el.querySelector('app-chore-row .note')!;
      expect(note.textContent!.trim()).toBe('Påminnelsen gikk ikke gjennom');
      expect(note.classList).toContain('rust');
    });

    it('moves a failed row to «Sendt» when «Prøv igjen» gets through', async () => {
      render([open], []);
      mockPush.remind.mockRejectedValueOnce(new HttpErrorResponse({ status: 500 }));
      await component['onRemind']('a-1');
      expect(component['reminders']()['a-1']).toEqual({ status: 'failed' });

      render([open], []); // the mocked first load settled during the await
      mockPush.remind.mockResolvedValueOnce(1);
      await component['onRemind']('a-1');
      expect(component['reminders']()['a-1'].status).toBe('sent');
      expect(component['remindMessage']()).toBeNull();

      const el = render([open], []);
      const btn = el.querySelector<HTMLButtonElement>('app-chore-row .rbtn')!;
      expect(btn.textContent!.trim()).toBe('Sendt');
      expect(btn.getAttribute('aria-label')).toBe('Påminnelse sendt til Emma om Gå på do');
      expect(el.querySelector('app-chore-row .note')!.classList).not.toContain('rust');
      // The success is read aloud, not shown as a second line under the list
      expect(el.querySelector('.visually-hidden[role="status"]')!.textContent!.trim()).toBe(
        'Påminnelse sendt til Emma.',
      );
      expect(el.querySelector('.remind-status')!.textContent!.trim()).toBe('');
    });

    it('shows no line under a row that was not reminded', () => {
      const el = render([open], []);
      expect(el.querySelector('app-chore-row .note')).toBeNull();
      expect(el.querySelector('app-chore-row .rbtn')!.textContent!.trim()).toBe('Minn på');
    });

    it('says when the child has no phone with notifications on', async () => {
      component['todayTasks'].set([open]);
      mockPush.remind.mockResolvedValue(0);
      await component['onRemind']('a-1');
      expect(component['remindMessage']()).toContain('har ikke slått på varsler');
      expect(component['reminders']()['a-1']).toEqual({ status: 'failed' });
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

    it('fills the row with the child cards: 1, 2, 3 across, 4 as 2 + 2, then rows of 3 (ST-864)', () => {
      expect([1, 2, 3, 4, 5, 6, 7].map(childCardColumns)).toEqual([1, 2, 3, 2, 3, 3, 3]);
    });

    it('sets the column count on the card row', async () => {
      fixture.detectChanges(); // first render starts the (mocked) load
      await component.ngOnInit(); // and wait for a whole load
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('.kids') as HTMLElement;
      expect(row.style.getPropertyValue('--kid-cols')).toBe('2');
      expect(row.querySelectorAll('app-child-points-card').length).toBe(2);
      expect(row.parentElement?.classList).toContain('page-band-slot');
    });

    it('leaves the band slot empty with no children, so the band ends 20 px under the sub-line (ST-1103)', async () => {
      mockHouseholdService.getHouseholdMembers.mockResolvedValue([
        { userId: 'p-1', displayName: 'Kari', role: 'parent', points: 0 },
      ]);
      fixture.detectChanges();
      await component.ngOnInit();
      fixture.detectChanges();

      const slot = fixture.nativeElement.querySelector('.page-band-slot') as HTMLElement;
      expect(slot.matches(':empty')).toBe(true);
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
