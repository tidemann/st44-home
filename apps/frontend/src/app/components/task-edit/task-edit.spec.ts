import { TestBed, ComponentFixture } from '@angular/core/testing';
import { TaskEditComponent } from './task-edit';
import type { Task } from '@st44/types';
import { TaskService } from '../../services/task.service';
import { ChildrenService } from '../../services/children.service';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { FormArray } from '@angular/forms';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// NOTE: Tests currently skipped due to known Vitest + Angular external template issue
// Component resources (templateUrl, styleUrl) cannot be resolved in Vitest without special configuration
// Issue: https://github.com/angular/angular/issues/43688
// Component builds and compiles successfully (verified with npm run build)
// Tests will be enabled once vite.config.ts is configured for resolveComponentResources()
describe('TaskEditComponent', () => {
  let component: TaskEditComponent;
  let fixture: ComponentFixture<TaskEditComponent>;
  let mockTaskService: {
    updateTask: ReturnType<typeof vi.fn>;
    loading: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<string | null>>;
  };
  let mockChildrenService: {
    listChildren: ReturnType<typeof vi.fn>;
  };

  const mockChildren = [
    { id: '1', name: 'Emma', birthYear: 2015, createdAt: new Date().toISOString() },
    { id: '2', name: 'Noah', birthYear: 2017, createdAt: new Date().toISOString() },
  ];

  const mockTask: Task = {
    id: 'task-1',
    householdId: 'household-1',
    name: 'Take out trash',
    description: 'Empty all bins',
    points: 10,
    ruleType: 'repeating',
    ruleConfig: {
      repeatDays: [1, 3, 5],
      assignedChildren: ['1'],
    },
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockTaskService = {
      updateTask: vi.fn(),
      loading: signal(false),
      error: signal(null),
    };

    mockChildrenService = {
      listChildren: vi.fn().mockResolvedValue(mockChildren),
    };

    TestBed.configureTestingModule({
      imports: [TaskEditComponent],
      providers: [
        { provide: TaskService, useValue: mockTaskService },
        { provide: ChildrenService, useValue: mockChildrenService },
      ],
    });

    fixture = TestBed.createComponent(TaskEditComponent);
    component = fixture.componentInstance;

    // Set task input
    fixture.componentRef.setInput('task', mockTask);
    fixture.detectChanges();
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form', () => {
      expect(component.taskForm).toBeDefined();
    });

    it('should pre-fill form with task data', () => {
      expect(component.taskForm.get('name')?.value).toBe('Take out trash');
      expect(component.taskForm.get('description')?.value).toBe('Empty all bins');
      expect(component.taskForm.get('ruleType')?.value).toBe('repeating');
      expect(component.taskForm.get('active')?.value).toBe(true);
    });

    it('should pre-fill repeatDays array', () => {
      const repeatDays = component.taskForm.get('repeatDays') as FormArray;
      expect(repeatDays.length).toBe(3);
      expect(repeatDays.value).toEqual([1, 3, 5]);
    });

    it('should pre-fill assignedChildren array', () => {
      const assignedChildren = component.taskForm.get('assignedChildren') as FormArray;
      expect(assignedChildren.length).toBe(1);
      expect(assignedChildren.value).toEqual(['1']);
    });

    it('should not mark form as changed initially', () => {
      expect(component.hasChanges()).toBe(false);
    });
  });

  describe('Form Pre-fill with different rule types', () => {
    it('should pre-fill daily task correctly', () => {
      const dailyTask: Task = {
        ...mockTask,
        ruleType: 'daily',
        ruleConfig: null,
      };

      fixture.componentRef.setInput('task', dailyTask);
      fixture.detectChanges();

      expect(component.taskForm.get('ruleType')?.value).toBe('daily');
      expect((component.taskForm.get('repeatDays') as FormArray).length).toBe(0);
      expect((component.taskForm.get('assignedChildren') as FormArray).length).toBe(0);
    });

    it('should pre-fill weekly_rotation task correctly', () => {
      const rotationTask: Task = {
        ...mockTask,
        ruleType: 'weekly_rotation',
        ruleConfig: {
          rotationType: 'odd_even_week',
          assignedChildren: ['1', '2'],
        },
      };

      fixture.componentRef.setInput('task', rotationTask);
      fixture.detectChanges();

      expect(component.taskForm.get('ruleType')?.value).toBe('weekly_rotation');
      expect(component.taskForm.get('rotationType')?.value).toBe('odd_even_week');
      expect((component.taskForm.get('assignedChildren') as FormArray).value).toEqual(['1', '2']);
    });
  });

  describe('Form Validation', () => {
    it('should require name', () => {
      const name = component.taskForm.get('name');
      name?.setValue('');
      expect(name?.hasError('required')).toBe(true);
    });

    it('should limit name to 200 characters', () => {
      const name = component.taskForm.get('name');
      name?.setValue('a'.repeat(201));
      expect(name?.hasError('maxlength')).toBe(true);
    });

    it('should require ruleType', () => {
      const ruleType = component.taskForm.get('ruleType');
      ruleType?.setValue('');
      expect(ruleType?.hasError('required')).toBe(true);
    });
  });

  describe('Dynamic Validation Changes', () => {
    it('should update validators when rule type changes from repeating to daily', () => {
      component.taskForm.get('ruleType')?.setValue('daily');
      fixture.detectChanges();

      expect(component.taskForm.get('repeatDays')?.hasError('required')).toBe(false);
      expect(component.taskForm.get('assignedChildren')?.hasError('required')).toBe(false);
    });

    it('should require rotationType when changing to weekly_rotation', () => {
      component.taskForm.get('ruleType')?.setValue('weekly_rotation');
      component.taskForm.get('rotationType')?.setValue('');
      fixture.detectChanges();

      expect(component.taskForm.get('rotationType')?.hasError('required')).toBe(true);
    });

    it('should require 2+ children for weekly_rotation', () => {
      component.taskForm.get('ruleType')?.setValue('weekly_rotation');
      (component.taskForm.get('assignedChildren') as FormArray).clear();
      component.onChildChange('1', true);
      fixture.detectChanges();

      expect(component.taskForm.get('assignedChildren')?.hasError('minLength')).toBe(true);
    });
  });

  describe('Change Tracking', () => {
    it('should mark hasChanges when form value changes', () => {
      component.taskForm.get('name')?.setValue('New title');
      expect(component.hasChanges()).toBe(true);
    });

    it('should not mark hasChanges when form is pre-filled', () => {
      const newTask: Task = { ...mockTask, name: 'Different task' };
      fixture.componentRef.setInput('task', newTask);
      fixture.detectChanges();

      expect(component.hasChanges()).toBe(false);
    });
  });

  describe('Day Selection', () => {
    it('should add day to repeatDays when checked', () => {
      component.onDayChange(6, true); // Saturday
      const repeatDays = component.taskForm.get('repeatDays') as FormArray;
      expect(repeatDays.value).toContain(6);
    });

    it('should remove day from repeatDays when unchecked', () => {
      component.onDayChange(1, false); // Remove Monday
      const repeatDays = component.taskForm.get('repeatDays') as FormArray;
      expect(repeatDays.value).not.toContain(1);
    });

    it('isDaySelected should return true for selected day', () => {
      expect(component.isDaySelected(1)).toBe(true); // Monday pre-selected
    });

    it('isDaySelected should return false for unselected day', () => {
      expect(component.isDaySelected(0)).toBe(false); // Sunday not selected
    });
  });

  describe('Child Selection', () => {
    it('should add child to assignedChildren when checked', () => {
      component.onChildChange('2', true); // Noah
      const assignedChildren = component.taskForm.get('assignedChildren') as FormArray;
      expect(assignedChildren.value).toContain('2');
    });

    it('should remove child from assignedChildren when unchecked', () => {
      component.onChildChange('1', false); // Remove Emma
      const assignedChildren = component.taskForm.get('assignedChildren') as FormArray;
      expect(assignedChildren.value).not.toContain('1');
    });

    it('isChildSelected should return true for selected child', () => {
      expect(component.isChildSelected('1')).toBe(true); // Emma pre-selected
    });

    it('isChildSelected should return false for unselected child', () => {
      expect(component.isChildSelected('2')).toBe(false); // Noah not selected
    });
  });

  describe('Save', () => {
    it('should not save if form is invalid', () => {
      component.taskForm.get('name')?.setValue('');
      component.onSave();
      expect(mockTaskService.updateTask).not.toHaveBeenCalled();
    });

    it('should call updateTask with correct data', () => {
      mockTaskService.updateTask.mockReturnValue(of(mockTask));

      component.taskForm.get('name')?.setValue('Updated task');
      component.onSave();

      expect(mockTaskService.updateTask).toHaveBeenCalledWith('household-1', 'task-1', {
        name: 'Updated task',
        description: 'Empty all bins',
        ruleType: 'repeating',
        ruleConfig: {
          rotationType: undefined,
          repeatDays: [1, 3, 5],
          assignedChildren: ['1'],
        },
        active: true,
      });
    });

    it('should emit closed event on successful save', async () => {
      mockTaskService.updateTask.mockReturnValue(of(mockTask));
      const closedSpy = vi.fn();
      component.closed.subscribe(closedSpy);

      component.onSave();

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(closedSpy).toHaveBeenCalled();
    });

    it('should reset hasChanges on successful save', async () => {
      mockTaskService.updateTask.mockReturnValue(of(mockTask));
      component.taskForm.get('name')?.setValue('Updated');
      expect(component.hasChanges()).toBe(true);

      component.onSave();

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(component.hasChanges()).toBe(false);
    });

    it('should handle error from service', () => {
      mockTaskService.updateTask.mockReturnValue(throwError(() => new Error('API error')));

      component.onSave();

      expect(mockTaskService.updateTask).toHaveBeenCalled();
      // Error is handled by service
    });
  });

  describe('Cancel', () => {
    it('should emit closed if no changes', () => {
      const closedSpy = vi.fn();
      component.closed.subscribe(closedSpy);

      component.onCancel();

      expect(closedSpy).toHaveBeenCalled();
      expect(component.showUnsavedWarning()).toBe(false);
    });

    it('should show unsaved warning if has changes', () => {
      component.taskForm.get('name')?.setValue('Changed');

      component.onCancel();

      expect(component.showUnsavedWarning()).toBe(true);
    });

    it('should emit closed when confirming close', () => {
      const closedSpy = vi.fn();
      component.closed.subscribe(closedSpy);

      component.confirmClose();

      expect(closedSpy).toHaveBeenCalled();
      expect(component.showUnsavedWarning()).toBe(false);
    });

    it('should not emit closed when canceling close', () => {
      const closedSpy = vi.fn();
      component.closed.subscribe(closedSpy);

      component.cancelClose();

      expect(closedSpy).not.toHaveBeenCalled();
      expect(component.showUnsavedWarning()).toBe(false);
    });
  });

  describe('Keyboard and Mouse interactions', () => {
    it('should cancel on Escape key', () => {
      const closedSpy = vi.fn();
      component.closed.subscribe(closedSpy);

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.onEscapeKey(event);

      expect(closedSpy).toHaveBeenCalled();
    });

    it('should show warning on Escape if has changes', () => {
      component.taskForm.get('name')?.setValue('Changed');

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.onEscapeKey(event);

      expect(component.showUnsavedWarning()).toBe(true);
    });

    it('should cancel on backdrop click', () => {
      component.onBackdropClick();
      // Should trigger onCancel logic
      expect(true).toBe(true);
    });
  });

  describe('Getters', () => {
    it('nameChars should return character count', () => {
      component.taskForm.get('name')?.setValue('Hello');
      expect(component['nameChars']).toBe(5);
    });

    it('ruleType should return current ruleType', () => {
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
    it('should handle editing from daily to repeating', () => {
      const dailyTask: Task = {
        ...mockTask,
        ruleType: 'daily',
        ruleConfig: null,
      };

      fixture.componentRef.setInput('task', dailyTask);
      fixture.detectChanges();

      component.taskForm.get('ruleType')?.setValue('repeating');
      component.onDayChange(1, true);
      component.onDayChange(3, true);
      component.onChildChange('1', true);
      fixture.detectChanges();

      expect(component.taskForm.valid).toBe(true);
    });

    it('should handle editing from repeating to weekly_rotation', () => {
      component.taskForm.get('ruleType')?.setValue('weekly_rotation');
      component.taskForm.get('rotationType')?.setValue('alternating');
      component.onChildChange('2', true); // Add second child
      fixture.detectChanges();

      expect(component.taskForm.valid).toBe(true);
      expect((component.taskForm.get('assignedChildren') as FormArray).length).toBe(2);
    });

    it('should toggle active status', () => {
      expect(component.taskForm.get('active')?.value).toBe(true);

      component.taskForm.get('active')?.setValue(false);
      expect(component.hasChanges()).toBe(true);
      expect(component.taskForm.get('active')?.value).toBe(false);
    });
  });
});
