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
    bulkDeleteTasks: ReturnType<typeof vi.fn>;
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
      bulkDeleteTasks: vi.fn().mockReturnValue(of({ deleted: [], failed: [] })),
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

    it('keeps «Gjort i dag» with the rule-7 card when nothing is done (desktop only)', async () => {
      mockDay.load.mockResolvedValue({ today: [day.today[0]], overdue: [] });
      fixture.detectChanges();
      await component['loadTasks']();
      fixture.detectChanges();

      const empty = (fixture.nativeElement as HTMLElement).querySelector('.col-b .desk-empty')!;
      expect(empty.textContent).toContain('Gjort i dag');
      expect(empty.textContent).toContain('Ingen oppgaver er haket av i dag');
      expect(empty.textContent).toContain('Når noen haker av en oppgave, dukker den opp her.');
    });

    it('shows no empty card when something is done today', async () => {
      fixture.detectChanges();
      await component['loadTasks']();
      fixture.detectChanges();
      expect(
        (fixture.nativeElement as HTMLElement).querySelector('.col-b app-group-label'),
      ).not.toBeNull();
      expect((fixture.nativeElement as HTMLElement).querySelector('.desk-empty')).toBeNull();
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

  describe('chores whose children were deleted (ST-914)', () => {
    const orphan: Task = {
      ...task,
      id: 'task-orphan',
      name: 'Mate katten',
      ruleType: 'repeating',
      ruleConfig: { repeatDays: [1, 3], assignedChildren: ['gone-1'] },
    };
    const shared: Task = {
      ...task,
      id: 'task-shared',
      ruleConfig: { assignedChildren: ['gone-1', 'child-2'] },
    };

    beforeEach(async () => {
      mockTaskService.tasks.set([task, orphan, shared]);
      // The first change detection runs ngOnInit, which starts loading the page
      fixture.detectChanges();
      await component['loadTasks']();
      fixture.detectChanges();
    });

    it('lists only the chores with no child left under Mangler barn', () => {
      expect(component['noChildTasks']().map((t) => t.id)).toEqual(['task-orphan']);
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Mangler barn');
      expect(text).toContain('Barnet som hadde oppgaven, er slettet');
      expect(text).toContain('Velg et nytt barn');
    });

    it('marks the chore under Alle oppgaver too', () => {
      expect(component['templateMeta'](orphan)).toBe('Uten barn – velg et nytt');
      // A parent deletes by name: the children still on it are named (ST-1343)
      expect(component['templateMeta'](shared)).toBe('Gjentas – Jonas');
    });

    it('opens the chore for editing when tapped', () => {
      component['onEdit']('task-orphan');
      expect(component['editingTask']()).toEqual(orphan);
      expect(component['editOpen']()).toBe(true);
    });

    it('shows nothing when every chore has a child', () => {
      mockTaskService.tasks.set([task, shared]);
      fixture.detectChanges();
      expect(component['noChildTasks']()).toEqual([]);
      expect(fixture.nativeElement.textContent).not.toContain('Mangler barn');
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

      expect(component['error']()).toBe('Kunne ikke merke oppgaven som ferdig');
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

  describe('select and delete several (ST-1343, ST-1391)', () => {
    const t2: Task = { ...task, id: 'task-2', name: 'Dekke bord', points: 5 };
    const t3: Task = { ...task, id: 'task-3', name: 'Gå med Luna' };
    const t4: Task = { ...task, id: 'task-4', name: 'Vanne blomstene' };
    const t5: Task = { ...task, id: 'task-5', name: 'Brette håndklær' };

    const el = () => fixture.nativeElement as HTMLElement;
    const text = () => el().textContent as string;
    const button = (label: string) =>
      [...el().querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
    const selectRows = () => [...el().querySelectorAll<HTMLElement>('[role="checkbox"]')];

    beforeEach(async () => {
      mockTaskService.tasks.set([task, t2, t3, t4, t5]);
      fixture.detectChanges();
      await component['loadTasks']();
      fixture.detectChanges();
    });

    it('shows «Velg» on Alle oppgaver, and select mode shows the templates only', () => {
      button('Velg')!.click();
      fixture.detectChanges();

      expect(component['selecting']()).toBe(true);
      expect(text()).toContain('Velg oppgaver');
      expect(text()).toContain('Trykk på oppgavene du vil slette');
      expect(text()).not.toContain('I dag');
      expect(text()).not.toContain('Forfalt');
      expect(selectRows().length).toBe(5);
      expect(selectRows().every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true);
    });

    it('puts «Velg» under the last «Alle oppgaver» row, not in its label line (ST-1887)', () => {
      const velg = button('Velg')!;
      expect(velg.classList).toContain('select-start');
      expect(el().querySelector('app-group-label button')).toBeNull();
      const rows = el().querySelectorAll('app-chore-row');
      expect(rows[rows.length - 1].nextElementSibling).toBe(velg);

      velg.click();
      fixture.detectChanges();
      expect(button('Velg')).toBeUndefined();
    });

    it('has no «Velg» when «Alle oppgaver» is empty (ST-1887)', async () => {
      mockTaskService.tasks.set([]);
      await component['loadTasks']();
      fixture.detectChanges();
      expect(button('Velg')).toBeUndefined();
    });

    it('puts the select rows in one grid, so desktop lays them in two columns (frame d1)', () => {
      button('Velg')!.click();
      fixture.detectChanges();

      const grid = el().querySelector('.select-rows')!;
      expect(grid.querySelectorAll('app-chore-row').length).toBe(5);
      expect(el().querySelector('.cols')).toBeNull();
    });

    it('marks the list while selecting, so desktop can keep rows clear of the fixed strip (frame d1)', () => {
      expect(el().querySelector('.selecting')).toBeNull();

      button('Velg')!.click();
      fixture.detectChanges();

      const list = el().querySelector('.selecting')!;
      expect(list).not.toBeNull();
      expect(list.querySelector('.select-slot')).not.toBeNull();
      expect(list.querySelector('.select-rows')).not.toBeNull();
    });

    it('ticks rows with a tap and counts them in the title', () => {
      button('Velg')!.click();
      fixture.detectChanges();
      selectRows()[1].click();
      selectRows()[3].click();
      fixture.detectChanges();

      expect(selectRows()[1].getAttribute('aria-checked')).toBe('true');
      expect(text()).toContain('2 valgt');
      const del = el().querySelector('.sbtn-delete')!;
      expect(del.querySelector('.label-short')?.textContent?.trim()).toBe('Slett 2');
      expect(del.querySelector('.label-long')?.textContent?.trim()).toBe('Slett 2 oppgaver');

      selectRows()[1].click();
      fixture.detectChanges();
      expect(text()).toContain('1 valgt');
    });

    it('«Velg alle» ticks every template and flips to «Fjern alle»', () => {
      component['startSelect']();
      fixture.detectChanges();
      button('Velg alle')!.click();
      fixture.detectChanges();

      expect(component['chosenCount']()).toBe(5);
      expect(text()).toContain('5 valgt');
      button('Fjern alle')!.click();
      fixture.detectChanges();
      expect(component['chosenCount']()).toBe(0);
    });

    it('«Slett» with nothing chosen does not open the confirm', () => {
      component['startSelect']();
      fixture.detectChanges();
      const del = button('Slett')!;
      expect(del.getAttribute('aria-disabled')).toBe('true');
      del.click();
      expect(component['confirmOpen']()).toBe(false);
    });

    it('«Avbryt» leaves select mode and brings the day back', () => {
      component['startSelect']();
      component['toggleChosen']('task-2');
      fixture.detectChanges();
      button('Avbryt')!.click();
      fixture.detectChanges();

      expect(component['selecting']()).toBe(false);
      expect(component['chosenCount']()).toBe(0);
      expect(text()).toContain('I dag');
    });

    it('the confirm counts, names up to three and counts the rest', () => {
      component['startSelect']();
      for (const id of ['task-1', 'task-2', 'task-3', 'task-4', 'task-5']) {
        component['toggleChosen'](id);
      }
      component['onDeleteChosen']();
      fixture.detectChanges();

      expect(component['confirmOpen']()).toBe(true);
      expect(component['confirmTitle']()).toBe('Slette 5 oppgaver?');
      expect(component['confirmBody']()).toContain('De fem oppgavene forsvinner for hele familien');
      expect(component['confirmBody']()).toContain('Dette kan ikke angres.');
      expect(component['confirmNames']()).toEqual(['Rydde rommet', 'Dekke bord', 'Gå med Luna']);
      expect(component['confirmMore']()).toBe('+ 2 til');
    });

    it('speaks in the singular for one task', () => {
      component['startSelect']();
      component['toggleChosen']('task-2');
      expect(component['confirmTitle']()).toBe('Slette 1 oppgave?');
      expect(component['confirmBody']()).toMatch(/^Oppgaven forsvinner for hele familien/);
    });

    it('deletes in one call, leaves select mode, re-reads the list and shows the receipt', async () => {
      mockTaskService.bulkDeleteTasks.mockReturnValue(
        of({ deleted: ['task-2', 'task-3'], failed: [] }),
      );
      component['startSelect']();
      component['toggleChosen']('task-2');
      component['toggleChosen']('task-3');
      mockDay.load.mockClear();

      await component['deleteChosen']();
      fixture.detectChanges();

      expect(mockTaskService.bulkDeleteTasks).toHaveBeenCalledTimes(1);
      expect(mockTaskService.bulkDeleteTasks).toHaveBeenCalledWith('household-1', [
        'task-2',
        'task-3',
      ]);
      expect(mockDay.load).toHaveBeenCalled();
      expect(component['selecting']()).toBe(false);
      expect(component['confirmOpen']()).toBe(false);
      const receipt = el().querySelector('.receipt');
      expect(receipt?.getAttribute('role')).toBe('status');
      expect(receipt?.textContent).toContain('2 oppgaver slettet');
    });

    it('keeps what failed chosen and offers «Prøv igjen» without a second confirm', async () => {
      mockTaskService.bulkDeleteTasks.mockReturnValue(
        of({ deleted: ['task-2'], failed: [{ taskId: 'task-3', reason: 'not_found' }] }),
      );
      component['startSelect']();
      component['toggleChosen']('task-2');
      component['toggleChosen']('task-3');

      await component['deleteChosen']();
      fixture.detectChanges();

      expect(component['selecting']()).toBe(true);
      expect([...component['chosen']()]).toEqual(['task-3']);
      expect(el().querySelector('.bulk-failed')?.getAttribute('role')).toBe('alert');
      expect(text()).toContain('1 av 2 ble ikke slettet');

      mockTaskService.bulkDeleteTasks.mockReturnValue(of({ deleted: ['task-3'], failed: [] }));
      button('Prøv igjen')!.click();
      await Promise.resolve();
      expect(component['confirmOpen']()).toBe(false);
      expect(mockTaskService.bulkDeleteTasks).toHaveBeenLastCalledWith('household-1', ['task-3']);
    });

    it('says none went when the call fails', async () => {
      mockTaskService.bulkDeleteTasks.mockReturnValue(throwError(() => new Error('down')));
      component['startSelect']();
      component['toggleChosen']('task-2');

      await component['deleteChosen']();

      expect(component['failureTitle']()).toBe('Ingen av oppgavene ble slettet');
      expect([...component['chosen']()]).toEqual(['task-2']);
    });

    it('a long press on a template row opens select mode with that task ticked', () => {
      component['onLongPress']('task-3', 300);
      fixture.detectChanges();

      expect(component['selecting']()).toBe(true);
      expect([...component['chosen']()]).toEqual(['task-3']);
      expect(text()).toContain('1 valgt');
    });

    it('a long press on a day row ticks the template behind it', () => {
      // The «I dag» rows come from task-1
      component['onLongPress']('task-1', 300);
      expect([...component['chosen']()]).toEqual(['task-1']);
    });

    it('a long press on a row with no live template does nothing', () => {
      component['onLongPress']('task-off', 300);
      expect(component['selecting']()).toBe(false);
      expect(component['isLive']('task-off')).toBe(false);
    });

    it('the single delete in the edit modal is unchanged', () => {
      component['onEdit']('task-2');
      component['onTaskDelete']();
      expect(mockTaskService.deleteTask).toHaveBeenCalledWith('household-1', 'task-2');
      expect(mockTaskService.bulkDeleteTasks).not.toHaveBeenCalled();
    });
  });
});
