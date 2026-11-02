import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskFormModal } from './task-form-modal';
import { FormArray } from '@angular/forms';
import type { Task, Child } from '@st44/types';
import { HouseholdDayService } from '../../../services/household-day.service';
import { TurnService } from '../../../services/turn.service';

describe('TaskFormModal', () => {
  let component: TaskFormModal;
  let fixture: ComponentFixture<TaskFormModal>;

  const mockChildren: Child[] = [
    {
      id: 'child-1',
      householdId: 'household-1',
      name: 'Alex',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'child-2',
      householdId: 'household-1',
      name: 'Jordan',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  const mockTask: Task = {
    id: 'task-1',
    householdId: 'household-1',
    name: 'Test Task',
    description: 'Test description',
    points: 10,
    ruleType: 'daily',
    ruleConfig: null,
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  let mockDay: { thisWeekChildId: ReturnType<typeof vi.fn> };
  let mockTurns: { turns: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockDay = { thisWeekChildId: vi.fn().mockResolvedValue(null) };
    mockTurns = { turns: vi.fn().mockResolvedValue([]) };
    await TestBed.configureTestingModule({
      imports: [TaskFormModal],
      providers: [
        { provide: HouseholdDayService, useValue: mockDay },
        { provide: TurnService, useValue: mockTurns },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskFormModal);
    component = fixture.componentInstance;

    // Set default inputs
    fixture.componentRef.setInput('householdId', 'household-1');
    fixture.componentRef.setInput('children', mockChildren);
    fixture.componentRef.setInput('mode', 'create');
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('Create Mode', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('mode', 'create');
      fixture.detectChanges();
    });

    it('should initialize with default values', () => {
      const form = component['form'];
      expect(form.get('name')?.value).toBe('');
      expect(form.get('points')?.value).toBe(5);
      expect(form.get('ruleType')?.value).toBe('daily');
    });

    it('should have correct modal title', () => {
      expect(component['modalTitle']()).toBe('Ny oppgave');
    });

    it('should have correct submit button text', () => {
      expect(component['submitButtonText']()).toBe('Legg til');
    });

    it('should have all task type options', () => {
      expect(component.taskTypes.length).toBe(5);
      expect(component.taskTypes.map((t) => t.value)).toEqual([
        'daily',
        'repeating',
        'weekly_rotation',
        'single',
        'next_in_line',
      ]);
    });

    it('should have all days of week options', () => {
      expect(component.daysOfWeek.length).toBe(7);
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('mode', 'edit');
      fixture.componentRef.setInput('task', mockTask);
      fixture.detectChanges();
    });

    it('should prefill form with task data', () => {
      const form = component['form'];
      expect(form.get('name')?.value).toBe('Test Task');
      expect(form.get('description')?.value).toBe('Test description');
      expect(form.get('points')?.value).toBe(10);
      expect(form.get('ruleType')?.value).toBe('daily');
    });

    it('should have correct modal title', () => {
      expect(component['modalTitle']()).toBe('Rediger oppgave');
    });

    it('should have correct submit button text', () => {
      expect(component['submitButtonText']()).toBe('Lagre');
    });

    it('should prefill repeating task with days', () => {
      const repeatingTask: Task = {
        ...mockTask,
        ruleType: 'repeating',
        ruleConfig: {
          repeatDays: [1, 3, 5],
          assignedChildren: ['child-1'],
        },
      };

      fixture.componentRef.setInput('task', repeatingTask);
      fixture.detectChanges();

      const repeatDays = component['form'].get('repeatDays') as FormArray;
      expect(repeatDays.length).toBe(3);
      expect(repeatDays.value).toEqual([1, 3, 5]);
    });

    it('should prefill weekly rotation task', () => {
      const rotationTask: Task = {
        ...mockTask,
        ruleType: 'weekly_rotation',
        ruleConfig: {
          rotationType: 'odd_even_week',
          assignedChildren: ['child-1', 'child-2'],
        },
      };

      fixture.componentRef.setInput('task', rotationTask);
      fixture.detectChanges();

      expect(component['form'].get('rotationType')?.value).toBe('odd_even_week');
      const assignedChildren = component['form'].get('assignedChildren') as FormArray;
      expect(assignedChildren.length).toBe(2);
    });

    it('ST-2030: an alternating rotation opens with next week first and names this week', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      // Wednesday of week 46; the rotation started week 45 with Alex, so Jordan has this week
      vi.setSystemTime(new Date(2026, 10, 11, 12));
      try {
        fixture.componentRef.setInput('task', {
          ...mockTask,
          ruleType: 'weekly_rotation',
          ruleConfig: {
            rotationType: 'alternating',
            assignedChildren: ['child-1', 'child-2'],
            rotationStart: '2026-11-02',
          },
        });
        fixture.detectChanges();

        expect(component['form'].get('assignedChildren')?.value).toEqual(['child-1', 'child-2']);
        expect(component['thisWeekName']()).toBe('Jordan');
      } finally {
        vi.useRealTimers();
      }
    });

    it("ST-2030: after a change this week, names the child who has this week's chore", async () => {
      // Alex had this week; the parent took Alex out of the rotation (rule 2). The server kept
      // this week's chores on Alex, and the new order alone would have guessed Jordan
      mockDay.thisWeekChildId.mockResolvedValue('child-1');
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 10, 4, 12));
      try {
        fixture.componentRef.setInput('task', {
          ...mockTask,
          ruleType: 'weekly_rotation',
          ruleConfig: {
            rotationType: 'alternating',
            assignedChildren: ['child-2'],
            rotationStart: '2026-11-09',
          },
        });
        fixture.componentRef.setInput('mode', 'edit');
        fixture.detectChanges();
        expect(component['thisWeekName']()).toBeNull();

        await vi.waitFor(() => expect(component['thisWeekName']()).toBe('Alex'));
        expect(mockDay.thisWeekChildId).toHaveBeenCalledWith('household-1', 'task-1');
        expect(component['form'].get('assignedChildren')?.value).toEqual(['child-2']);
      } finally {
        vi.useRealTimers();
      }
    });

    it('leaves deleted children out of the form', () => {
      fixture.componentRef.setInput('task', {
        ...mockTask,
        ruleConfig: { assignedChildren: ['gone-1', 'child-2'] },
      });
      fixture.detectChanges();

      const assignedChildren = component['form'].get('assignedChildren') as FormArray;
      expect(assignedChildren.value).toEqual(['child-2']);
      expect(component['childrenGone']()).toBe(false);
    });

    describe('when every chosen child is deleted (ST-914)', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('task', {
          ...mockTask,
          ruleType: 'repeating',
          ruleConfig: { repeatDays: [1, 3], assignedChildren: ['gone-1'] },
        });
        fixture.componentRef.setInput('open', true);
        fixture.detectChanges();
      });

      it('tells the parent and asks for a new child', () => {
        expect(component['childrenGone']()).toBe(true);
        const text = fixture.nativeElement.textContent as string;
        expect(text).toContain('Barnet som hadde denne oppgaven, er slettet');
        expect(text).toContain('Velg minst ett barn');
      });

      it('cannot be saved until a child is picked', () => {
        expect(component['isFormValid']()).toBe(false);

        component.onChildChange('child-1', true);
        expect(component['isFormValid']()).toBe(true);
      });

      it('can still be deleted', () => {
        component['onDeleteClick']();
        expect(component['showDeleteConfirm']()).toBe(true);
      });

      it('is cleared when the form is reset for a new task', () => {
        fixture.componentRef.setInput('mode', 'create');
        fixture.detectChanges();
        expect(component['childrenGone']()).toBe(false);
      });
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should be invalid when name is empty', () => {
      component['form'].patchValue({ name: '' });
      expect(component['isFormValid']()).toBe(false);
    });

    it('should be valid for daily task with name and points', () => {
      component['form'].patchValue({
        name: 'Test Task',
        points: 10,
        ruleType: 'daily',
      });
      expect(component['isFormValid']()).toBe(true);
    });

    it('should be invalid for repeating task without days selected', () => {
      component['form'].patchValue({
        name: 'Test Task',
        points: 10,
        ruleType: 'repeating',
      });
      expect(component['isFormValid']()).toBe(false);
    });

    it('should be valid for repeating task with days selected', () => {
      component['form'].patchValue({
        name: 'Test Task',
        points: 10,
        ruleType: 'repeating',
      });
      component.onDayChange(1, true);
      component.onDayChange(3, true);
      expect(component['isFormValid']()).toBe(true);
    });

    it('should be invalid for weekly rotation with less than 2 children', () => {
      component['form'].patchValue({
        name: 'Test Task',
        points: 10,
        ruleType: 'weekly_rotation',
      });
      component.onChildChange('child-1', true);
      expect(component['isFormValid']()).toBe(false);
    });

    it('should be valid for weekly rotation with 2 or more children', () => {
      component['form'].patchValue({
        name: 'Test Task',
        points: 10,
        ruleType: 'weekly_rotation',
      });
      component.onChildChange('child-1', true);
      component.onChildChange('child-2', true);
      expect(component['isFormValid']()).toBe(true);
    });

    it('should be invalid for single task without candidates', () => {
      component['form'].patchValue({
        name: 'Test Task',
        points: 10,
        ruleType: 'single',
      });
      expect(component['isFormValid']()).toBe(false);
    });

    it('should be valid for single task with candidates', () => {
      component['form'].patchValue({
        name: 'Test Task',
        points: 10,
        ruleType: 'single',
      });
      component.onChildChange('child-1', true);
      expect(component['isFormValid']()).toBe(true);
    });
  });

  describe('Day Selection', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should add day when onDayChange is called with true', () => {
      component.onDayChange(1, true);
      expect(component.isDaySelected(1)).toBe(true);
    });

    it('should remove day when onDayChange is called with false', () => {
      component.onDayChange(1, true);
      component.onDayChange(1, false);
      expect(component.isDaySelected(1)).toBe(false);
    });

    it('should correctly check if day is selected', () => {
      component.onDayChange(3, true);
      expect(component.isDaySelected(3)).toBe(true);
      expect(component.isDaySelected(4)).toBe(false);
    });
  });

  describe('Child Selection', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should add child when onChildChange is called with true', () => {
      component.onChildChange('child-1', true);
      expect(component.isChildSelected('child-1')).toBe(true);
    });

    it('should remove child when onChildChange is called with false', () => {
      component.onChildChange('child-1', true);
      component.onChildChange('child-1', false);
      expect(component.isChildSelected('child-1')).toBe(false);
    });

    it('should correctly check if child is selected', () => {
      component.onChildChange('child-1', true);
      expect(component.isChildSelected('child-1')).toBe(true);
      expect(component.isChildSelected('child-2')).toBe(false);
    });
  });

  describe('Sub-tasks (ST-2074)', () => {
    const draft = (name: string, points: number | null, id?: string) => ({
      key: `k-${name}`,
      ...(id && { id }),
      name,
      points,
    });

    beforeEach(() => {
      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();
    });

    it('«Poeng» becomes the sum while there are sub-tasks, and comes back after the last', () => {
      component['form'].patchValue({ points: 7 });
      component['setSubtasks']([draft('Re opp sengen', 5), draft('Støvsug gulvet', 15)]);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('#points')).toBeNull();
      expect(el.textContent).toContain('20 poeng til sammen');
      expect(el.textContent).toContain('Regnet ut fra deloppgavene under.');

      component['setSubtasks']([]);
      fixture.detectChanges();
      expect(el.querySelector<HTMLInputElement>('#points')?.value).toBe('7');
    });

    it('sends the sub-tasks in order, with ids on kept rows, and the sum as points', () => {
      const spy = vi.spyOn(component.formSubmitted, 'emit');
      component['form'].patchValue({ name: 'Rydd rommet', ruleType: 'daily' });
      component['setSubtasks']([draft(' Re opp sengen ', 5, 's1'), draft('Rydd pulten', 5)]);
      component.onSubmit();
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          points: 10,
          subtasks: [
            { id: 's1', name: 'Re opp sengen', points: 5 },
            { name: 'Rydd pulten', points: 5 },
          ],
        }),
      );
    });

    it('a sub-task without a name stops the save', () => {
      const spy = vi.spyOn(component.formSubmitted, 'emit');
      component['form'].patchValue({ name: 'Rydd rommet', ruleType: 'daily' });
      component['setSubtasks']([draft('', 5)]);
      component.onSubmit();
      expect(spy).not.toHaveBeenCalled();
    });

    it('edit fills the rows from the task, keeping their ids', () => {
      fixture.componentRef.setInput('mode', 'edit');
      fixture.componentRef.setInput('task', {
        ...mockTask,
        points: 20,
        subtasks: [{ id: 's1', name: 'Re opp sengen', points: 20, position: 0 }],
      });
      fixture.detectChanges();
      expect(component['subtasks']()).toEqual([
        expect.objectContaining({ id: 's1', name: 'Re opp sengen', points: 20 }),
      ]);
    });

    it('the main action is live at every width; the press shows the error (ST-2104)', () => {
      const spy = vi.spyOn(component.formSubmitted, 'emit');
      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const submit = el.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      expect(submit.disabled).toBe(false);
      submit.click();
      fixture.detectChanges();
      expect(spy).not.toHaveBeenCalled();
      expect(el.querySelector('#task-name-error')?.textContent).toContain(
        'Oppgavenavn er obligatorisk',
      );
    });

    it('a normal chore sends no sub-tasks', () => {
      const spy = vi.spyOn(component.formSubmitted, 'emit');
      component['form'].patchValue({ name: 'Dekke bord', points: 5, ruleType: 'daily' });
      component.onSubmit();
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ points: 5, subtasks: [] }));
    });

    it('«Etter tur» has no sub-tasks: the list is hidden and switching clears it (ST-2075)', () => {
      component['setSubtasks']([draft('Re opp sengen', 5)]);
      component['form'].patchValue({ ruleType: 'next_in_line' });
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-subtask-list')).toBeNull();
      expect(component['subtasks']()).toEqual([]);
      expect(el.querySelector('#points')).not.toBeNull();
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      fixture.detectChanges();
      vi.clearAllMocks();
    });

    it('should emit formSubmitted for daily task', () => {
      const formSubmittedSpy = vi.spyOn(component.formSubmitted, 'emit');

      component['form'].patchValue({
        name: 'Daily Test Task',
        points: 15,
        ruleType: 'daily',
      });
      fixture.detectChanges();

      component.onSubmit();

      expect(formSubmittedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Daily Test Task',
          points: 15,
          ruleType: 'daily',
          ruleConfig: expect.objectContaining({
            assignedChildren: [],
          }),
        }),
      );
    });

    it('should emit formSubmitted for repeating task with days', () => {
      const formSubmittedSpy = vi.spyOn(component.formSubmitted, 'emit');

      component['form'].patchValue({
        name: 'Repeating Task',
        points: 10,
        ruleType: 'repeating',
      });
      component.onDayChange(1, true);
      component.onDayChange(3, true);
      fixture.detectChanges();

      component.onSubmit();

      expect(formSubmittedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleType: 'repeating',
          ruleConfig: expect.objectContaining({
            repeatDays: expect.arrayContaining([1, 3]),
          }),
        }),
      );
    });

    it('should emit formSubmitted for weekly rotation task', () => {
      const formSubmittedSpy = vi.spyOn(component.formSubmitted, 'emit');

      component['form'].patchValue({
        name: 'Rotation Task',
        points: 20,
        ruleType: 'weekly_rotation',
        rotationType: 'alternating',
      });
      component.onChildChange('child-1', true);
      component.onChildChange('child-2', true);
      fixture.detectChanges();

      component.onSubmit();

      expect(formSubmittedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleType: 'weekly_rotation',
          ruleConfig: expect.objectContaining({
            rotationType: 'alternating',
            assignedChildren: expect.arrayContaining(['child-1', 'child-2']),
          }),
        }),
      );
    });

    it('ST-2075: «Etter tur» sends the children in turn order, and needs two', () => {
      const formSubmittedSpy = vi.spyOn(component.formSubmitted, 'emit');
      component['form'].patchValue({
        name: 'Tømme oppvaskmaskinen',
        points: 5,
        ruleType: 'next_in_line',
      });
      component['setRotationOrder'](['child-2']);
      component.onSubmit();
      expect(formSubmittedSpy).not.toHaveBeenCalled();

      component['setRotationOrder'](['child-2', 'child-1']);
      component.onSubmit();
      expect(formSubmittedSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ruleType: 'next_in_line',
          ruleConfig: { assignedChildren: ['child-2', 'child-1'] },
        }),
      );
    });

    it('ST-2075: editing «Etter tur» opens with the child who has the turn on top', async () => {
      fixture.componentRef.setInput('children', [
        ...mockChildren,
        { ...mockChildren[0], id: 'child-3', name: 'Kim' },
      ]);
      mockTurns.turns.mockResolvedValue([{ taskId: 'task-1', turnChildId: 'child-2' }]);
      fixture.componentRef.setInput('task', {
        ...mockTask,
        ruleType: 'next_in_line',
        ruleConfig: { assignedChildren: ['child-1', 'child-2', 'child-3'] },
      });
      fixture.componentRef.setInput('mode', 'edit');
      fixture.detectChanges();

      await vi.waitFor(() =>
        expect(component['form'].get('assignedChildren')?.value).toEqual([
          'child-2',
          'child-3',
          'child-1',
        ]),
      );
    });

    it('ST-2030: the dragged order is sent as it stands; odd/even only with two', () => {
      const formSubmittedSpy = vi.spyOn(component.formSubmitted, 'emit');
      fixture.componentRef.setInput('children', [
        ...mockChildren,
        { ...mockChildren[0], id: 'child-3', name: 'Kim' },
      ]);
      component['form'].patchValue({ name: 'Rotation', points: 5, ruleType: 'weekly_rotation' });
      component['setOddEven'](true);
      component['setRotationOrder'](['child-3', 'child-1', 'child-2']);
      component.onSubmit();
      expect(formSubmittedSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ruleConfig: {
            rotationType: 'alternating',
            assignedChildren: ['child-3', 'child-1', 'child-2'],
          },
        }),
      );

      component['setRotationOrder'](['child-2', 'child-1']);
      component.onSubmit();
      expect(formSubmittedSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ruleConfig: { rotationType: 'odd_even_week', assignedChildren: ['child-2', 'child-1'] },
        }),
      );
    });

    it('should not submit when form is invalid', () => {
      const formSubmittedSpy = vi.spyOn(component.formSubmitted, 'emit');

      component['form'].patchValue({ name: '' });
      component.onSubmit();

      expect(formSubmittedSpy).not.toHaveBeenCalled();
    });

    it('should not submit when already submitting', () => {
      const formSubmittedSpy = vi.spyOn(component.formSubmitted, 'emit');

      component['form'].patchValue({
        name: 'Test Task',
        points: 10,
        ruleType: 'daily',
      });
      component['submitting'].set(true);

      component.onSubmit();

      expect(formSubmittedSpy).not.toHaveBeenCalled();
    });
  });

  describe('Delete Functionality', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('mode', 'edit');
      fixture.componentRef.setInput('task', mockTask);
      fixture.detectChanges();
    });

    it('should show delete confirmation on delete click', () => {
      component.onDeleteClick();
      expect(component['showDeleteConfirm']()).toBe(true);
    });

    it('should emit taskDeleted on confirm delete', () => {
      const taskDeletedSpy = vi.spyOn(component.taskDeleted, 'emit');

      component.onDeleteClick();
      component.onConfirmDelete();

      expect(taskDeletedSpy).toHaveBeenCalled();
      expect(component['showDeleteConfirm']()).toBe(false);
    });

    it('should hide confirmation on cancel delete', () => {
      component.onDeleteClick();
      component.onCancelDelete();

      expect(component['showDeleteConfirm']()).toBe(false);
    });

    it('drops the × on «Slette oppgaven?» and focuses «Avbryt» (guide: Popups)', () => {
      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.modal-close')).not.toBeNull();

      component.onDeleteClick();
      fixture.detectChanges();

      expect(el.querySelector('.modal-close')).toBeNull();
      const cancel = el.querySelector('.popup-actions .btn-secondary');
      expect(cancel?.textContent?.trim()).toBe('Avbryt');
      expect(document.activeElement).toBe(cancel);
    });
  });

  describe('Modal Controls', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should emit closeRequested on close', () => {
      const closeRequestedSpy = vi.spyOn(component.closeRequested, 'emit');

      component.onClose();

      expect(closeRequestedSpy).toHaveBeenCalled();
    });

    it('should emit closeRequested on cancel', () => {
      const closeRequestedSpy = vi.spyOn(component.closeRequested, 'emit');

      component.onCancel();

      expect(closeRequestedSpy).toHaveBeenCalled();
    });

    it('should reset form on close', () => {
      component['form'].patchValue({
        name: 'Test',
        points: 50,
        ruleType: 'repeating',
      });
      component.onDayChange(1, true);
      component.setError('Some error');

      component.onClose();

      expect(component['form'].get('name')?.value).toBe('');
      expect(component['form'].get('points')?.value).toBe(5);
      expect(component['form'].get('ruleType')?.value).toBe('daily');
      expect(component['repeatDaysArray'].length).toBe(0);
      expect(component['errorMessage']()).toBeNull();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should set error message', () => {
      component.setError('Test error');
      expect(component['errorMessage']()).toBe('Test error');
    });

    it('should reset submitting state on error', () => {
      component['submitting'].set(true);
      component.setError('Test error');
      expect(component['submitting']()).toBe(false);
    });
  });
});
