import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskFormModal } from './task-form-modal';
import { FormArray } from '@angular/forms';
import type { Task, Child } from '@st44/types';

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskFormModal],
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
      expect(component['modalTitle']()).toBe('Create Task');
    });

    it('should have correct submit button text', () => {
      expect(component['submitButtonText']()).toBe('Create Task');
    });

    it('should have all task type options', () => {
      expect(component.taskTypes.length).toBe(4);
      expect(component.taskTypes.map((t) => t.value)).toEqual([
        'daily',
        'repeating',
        'weekly_rotation',
        'single',
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
      expect(component['modalTitle']()).toBe('Edit Task');
    });

    it('should have correct submit button text', () => {
      expect(component['submitButtonText']()).toBe('Save Changes');
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
