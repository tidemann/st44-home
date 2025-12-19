import { TestBed, ComponentFixture } from '@angular/core/testing';
import { TaskCreateComponent } from './task-create.component';
import { TaskService } from '../../services/task.service';
import { ChildrenService } from '../../services/children.service';
import { HouseholdService } from '../../services/household.service';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { FormArray } from '@angular/forms';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('TaskCreateComponent', () => {
  let component: TaskCreateComponent;
  let fixture: ComponentFixture<TaskCreateComponent>;
  let mockTaskService: any;
  let mockChildrenService: any;
  let mockHouseholdService: any;

  const mockChildren = [
    { id: '1', name: 'Emma', birthYear: 2015, createdAt: new Date().toISOString() },
    { id: '2', name: 'Noah', birthYear: 2017, createdAt: new Date().toISOString() },
  ];

  beforeEach(() => {
    mockTaskService = {
      createTask: vi.fn(),
      loading: signal(false),
      error: signal(null),
    };

    mockChildrenService = {
      listChildren: vi.fn().mockResolvedValue(mockChildren),
    };

    mockHouseholdService = {
      getActiveHouseholdId: vi.fn().mockReturnValue('1'),
    };

    TestBed.configureTestingModule({
      imports: [TaskCreateComponent],
      providers: [
        { provide: TaskService, useValue: mockTaskService },
        { provide: ChildrenService, useValue: mockChildrenService },
        { provide: HouseholdService, useValue: mockHouseholdService },
      ],
    });

    fixture = TestBed.createComponent(TaskCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form with default values', () => {
      expect(component.taskForm).toBeDefined();
      expect(component.taskForm.get('rule_type')?.value).toBe('daily');
      expect(component.taskForm.get('title')?.value).toBe('');
      expect(component.taskForm.get('description')?.value).toBe('');
    });

    it('should initialize repeat_days and assigned_children as FormArrays', () => {
      expect(component.taskForm.get('repeat_days')).toBeInstanceOf(FormArray);
      expect(component.taskForm.get('assigned_children')).toBeInstanceOf(FormArray);
    });

    it('should have daysOfWeek array with 7 days', () => {
      expect(component['daysOfWeek'].length).toBe(7);
    });
  });

  describe('Form Validation', () => {
    it('should require title', () => {
      const title = component.taskForm.get('title');
      title?.setValue('');
      expect(title?.hasError('required')).toBe(true);
    });

    it('should limit title to 200 characters', () => {
      const title = component.taskForm.get('title');
      title?.setValue('a'.repeat(201));
      expect(title?.hasError('maxlength')).toBe(true);
    });

    it('should accept title under 200 characters', () => {
      const title = component.taskForm.get('title');
      title?.setValue('Take out trash');
      expect(title?.valid).toBe(true);
    });

    it('should require rule_type', () => {
      const ruleType = component.taskForm.get('rule_type');
      ruleType?.setValue('');
      expect(ruleType?.hasError('required')).toBe(true);
    });
  });

  describe('Dynamic Validation - Daily Rule', () => {
    beforeEach(() => {
      component.taskForm.get('rule_type')?.setValue('daily');
      component.taskForm.get('title')?.setValue('Daily task');
    });

    it('should not require rotation_type for daily rule', () => {
      expect(component.taskForm.get('rotation_type')?.hasError('required')).toBe(false);
    });

    it('should not require repeat_days for daily rule', () => {
      expect(component.taskForm.get('repeat_days')?.hasError('required')).toBe(false);
    });

    it('should not require assigned_children for daily rule', () => {
      expect(component.taskForm.get('assigned_children')?.hasError('required')).toBe(false);
    });

    it('should have valid form with just title for daily rule', () => {
      expect(component.taskForm.valid).toBe(true);
    });
  });

  describe('Dynamic Validation - Repeating Rule', () => {
    beforeEach(() => {
      component.taskForm.get('rule_type')?.setValue('repeating');
      component.taskForm.get('title')?.setValue('Repeating task');
    });

    it('should require repeat_days for repeating rule', () => {
      expect(component.taskForm.get('repeat_days')?.hasError('required')).toBe(true);
    });

    it('should require assigned_children for repeating rule', () => {
      expect(component.taskForm.get('assigned_children')?.hasError('required')).toBe(true);
    });

    it('should require at least 1 day in repeat_days', () => {
      const repeatDays = component.taskForm.get('repeat_days') as FormArray;
      expect(repeatDays.hasError('minLength')).toBe(true);
    });

    it('should be valid with 1+ days and 1+ children', () => {
      component.onDayChange(1, true); // Monday
      component.onChildChange('1', true); // Emma
      fixture.detectChanges();
      expect(component.taskForm.valid).toBe(true);
    });

    it('should not require rotation_type for repeating rule', () => {
      expect(component.taskForm.get('rotation_type')?.hasError('required')).toBe(false);
    });
  });

  describe('Dynamic Validation - Weekly Rotation', () => {
    beforeEach(() => {
      component.taskForm.get('rule_type')?.setValue('weekly_rotation');
      component.taskForm.get('title')?.setValue('Rotation task');
    });

    it('should require rotation_type for weekly_rotation rule', () => {
      expect(component.taskForm.get('rotation_type')?.hasError('required')).toBe(true);
    });

    it('should require assigned_children for weekly_rotation rule', () => {
      expect(component.taskForm.get('assigned_children')?.hasError('required')).toBe(true);
    });

    it('should require at least 2 children for weekly_rotation', () => {
      component.onChildChange('1', true); // Emma
      fixture.detectChanges();
      const assignedChildren = component.taskForm.get('assigned_children');
      expect(assignedChildren?.hasError('minLength')).toBe(true);
    });

    it('should be valid with rotation_type and 2+ children', () => {
      component.taskForm.get('rotation_type')?.setValue('odd_even_week');
      component.onChildChange('1', true); // Emma
      component.onChildChange('2', true); // Noah
      fixture.detectChanges();
      expect(component.taskForm.valid).toBe(true);
    });

    it('should not require repeat_days for weekly_rotation rule', () => {
      expect(component.taskForm.get('repeat_days')?.hasError('required')).toBe(false);
    });
  });

  describe('Day Selection', () => {
    it('should add day to repeat_days when checked', () => {
      component.onDayChange(1, true); // Monday
      const repeatDays = component.taskForm.get('repeat_days') as FormArray;
      expect(repeatDays.length).toBe(1);
      expect(repeatDays.at(0).value).toBe(1);
    });

    it('should remove day from repeat_days when unchecked', () => {
      component.onDayChange(1, true); // Add Monday
      component.onDayChange(1, false); // Remove Monday
      const repeatDays = component.taskForm.get('repeat_days') as FormArray;
      expect(repeatDays.length).toBe(0);
    });

    it('should allow multiple days to be selected', () => {
      component.onDayChange(1, true); // Monday
      component.onDayChange(3, true); // Wednesday
      component.onDayChange(5, true); // Friday
      const repeatDays = component.taskForm.get('repeat_days') as FormArray;
      expect(repeatDays.length).toBe(3);
      expect(repeatDays.value).toEqual([1, 3, 5]);
    });

    it('isDaySelected should return true for selected day', () => {
      component.onDayChange(1, true);
      expect(component.isDaySelected(1)).toBe(true);
    });

    it('isDaySelected should return false for unselected day', () => {
      expect(component.isDaySelected(1)).toBe(false);
    });
  });

  describe('Child Selection', () => {
    it('should add child to assigned_children when checked', () => {
      component.onChildChange('1', true); // Emma
      const assignedChildren = component.taskForm.get('assigned_children') as FormArray;
      expect(assignedChildren.length).toBe(1);
      expect(assignedChildren.at(0).value).toBe('1');
    });

    it('should remove child from assigned_children when unchecked', () => {
      component.onChildChange('1', true); // Add Emma
      component.onChildChange('1', false); // Remove Emma
      const assignedChildren = component.taskForm.get('assigned_children') as FormArray;
      expect(assignedChildren.length).toBe(0);
    });

    it('should allow multiple children to be selected', () => {
      component.onChildChange('1', true); // Emma
      component.onChildChange('2', true); // Noah
      const assignedChildren = component.taskForm.get('assigned_children') as FormArray;
      expect(assignedChildren.length).toBe(2);
      expect(assignedChildren.value).toEqual(['1', '2']);
    });

    it('isChildSelected should return true for selected child', () => {
      component.onChildChange('1', true);
      expect(component.isChildSelected('1')).toBe(true);
    });

    it('isChildSelected should return false for unselected child', () => {
      expect(component.isChildSelected('1')).toBe(false);
    });
  });

  describe('Form Submission', () => {
    it('should not submit if form is invalid', () => {
      component.taskForm.get('title')?.setValue('');
      component.onSubmit();
      expect(mockTaskService.createTask).not.toHaveBeenCalled();
    });

    it('should not submit if no household selected', () => {
      mockHouseholdService.getActiveHouseholdId.mockReturnValue(null);
      component.taskForm.get('title')?.setValue('Test task');
      component.onSubmit();
      expect(mockTaskService.createTask).not.toHaveBeenCalled();
    });

    it('should call createTask with form data on valid submission', () => {
      const mockTask = { id: '1', title: 'Test task', rule_type: 'daily' };
      mockTaskService.createTask.mockReturnValue(of(mockTask));

      component.taskForm.patchValue({
        title: 'Test task',
        description: 'Test description',
        rule_type: 'daily',
      });

      component.onSubmit();

      expect(mockTaskService.createTask).toHaveBeenCalledWith('1', {
        title: 'Test task',
        description: 'Test description',
        rule_type: 'daily',
        rotation_type: '',
        repeat_days: [],
        assigned_children: [],
      });
    });

    it('should show success message and reset form on successful creation', async () => {
      mockTaskService.createTask.mockReturnValue(of({}));

      component.taskForm.patchValue({
        title: 'Test task',
        rule_type: 'daily',
      });

      component.onSubmit();

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(component.successMessage()).toBe('Task template created successfully!');
      expect(component.taskForm.get('title')?.value).toBe('');
    });

    it('should clear success message after 3 seconds', async () => {
      mockTaskService.createTask.mockReturnValue(of({}));

      component.taskForm.patchValue({
        title: 'Test task',
        rule_type: 'daily',
      });

      component.onSubmit();

      await new Promise((resolve) => setTimeout(resolve, 3100));
      expect(component.successMessage()).toBeNull();
    });

    it('should handle error from service', () => {
      mockTaskService.createTask.mockReturnValue(throwError(() => new Error('API error')));

      component.taskForm.patchValue({
        title: 'Test task',
        rule_type: 'daily',
      });

      component.onSubmit();

      expect(mockTaskService.createTask).toHaveBeenCalled();
      // Error is handled by service
    });
  });

  describe('Cancel', () => {
    it('should reset form on cancel', () => {
      component.taskForm.patchValue({
        title: 'Test task',
        description: 'Test description',
      });
      component.onDayChange(1, true);
      component.onChildChange('1', true);

      component.onCancel();

      expect(component.taskForm.get('title')?.value).toBe('');
      expect(component.taskForm.get('description')?.value).toBe('');
      expect((component.taskForm.get('repeat_days') as FormArray).length).toBe(0);
      expect((component.taskForm.get('assigned_children') as FormArray).length).toBe(0);
    });

    it('should reset rule_type to daily on cancel', () => {
      component.taskForm.get('rule_type')?.setValue('weekly_rotation');
      component.onCancel();
      expect(component.taskForm.get('rule_type')?.value).toBe('daily');
    });
  });

  describe('Getters', () => {
    it('titleChars should return character count', () => {
      component.taskForm.get('title')?.setValue('Hello');
      expect(component['titleChars']).toBe(5);
    });

    it('titleChars should return 0 for empty title', () => {
      component.taskForm.get('title')?.setValue('');
      expect(component['titleChars']).toBe(0);
    });

    it('ruleType should return current rule_type', () => {
      component.taskForm.get('rule_type')?.setValue('repeating');
      expect(component['ruleType']).toBe('repeating');
    });

    it('taskServiceLoading should return loading state', () => {
      expect(component['taskServiceLoading']).toBe(false);
    });

    it('taskServiceError should return error state', () => {
      expect(component['taskServiceError']).toBeNull();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle full repeating task creation', () => {
      mockTaskService.createTask.mockReturnValue(of({}));

      component.taskForm.patchValue({
        title: 'Water plants',
        description: 'Water all plants in the house',
        rule_type: 'repeating',
      });
      component.onDayChange(1, true); // Monday
      component.onDayChange(3, true); // Wednesday
      component.onDayChange(5, true); // Friday
      component.onChildChange('1', true); // Emma

      component.onSubmit();

      expect(mockTaskService.createTask).toHaveBeenCalledWith('1', {
        title: 'Water plants',
        description: 'Water all plants in the house',
        rule_type: 'repeating',
        rotation_type: '',
        repeat_days: [1, 3, 5],
        assigned_children: ['1'],
      });
    });

    it('should handle full weekly rotation task creation', () => {
      mockTaskService.createTask.mockReturnValue(of({}));

      component.taskForm.patchValue({
        title: 'Clean room',
        description: 'Clean entire bedroom',
        rule_type: 'weekly_rotation',
        rotation_type: 'odd_even_week',
      });
      component.onChildChange('1', true); // Emma
      component.onChildChange('2', true); // Noah

      component.onSubmit();

      expect(mockTaskService.createTask).toHaveBeenCalledWith('1', {
        title: 'Clean room',
        description: 'Clean entire bedroom',
        rule_type: 'weekly_rotation',
        rotation_type: 'odd_even_week',
        repeat_days: [],
        assigned_children: ['1', '2'],
      });
    });

    it('should validate form correctly when switching from repeating to daily', () => {
      component.taskForm.patchValue({
        title: 'Test task',
        rule_type: 'repeating',
      });
      component.onDayChange(1, true);
      component.onChildChange('1', true);
      expect(component.taskForm.valid).toBe(true);

      component.taskForm.get('rule_type')?.setValue('daily');
      fixture.detectChanges();
      expect(component.taskForm.valid).toBe(true); // Still valid without days/children
    });
  });
});
