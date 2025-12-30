import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskCardComponent } from './task-card';
import type { Task } from '@st44/types';

describe('TaskCardComponent', () => {
  let component: TaskCardComponent;
  let fixture: ComponentFixture<TaskCardComponent>;

  const mockTask: Task = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    householdId: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Task',
    description: 'Test description',
    points: 50,
    ruleType: 'daily',
    ruleConfig: null,
    active: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('task', mockTask);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Task Display', () => {
    it('should display task name', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const title = compiled.querySelector('.task-title');
      expect(title?.textContent?.trim()).toBe('Test Task');
    });

    it('should display task points', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const points = compiled.querySelector('.task-badge .points');
      expect(points?.textContent?.trim()).toBe('50');
    });

    it('should display recurrence text for daily tasks', () => {
      expect(component.metaText()).toBe('Daily');
      const compiled = fixture.nativeElement as HTMLElement;
      const metaText = compiled.querySelector('.task-meta-text');
      expect(metaText?.textContent).toContain('Daily');
    });

    it('should display recurrence text for weekly rotation tasks', () => {
      const weeklyTask: Task = { ...mockTask, ruleType: 'weekly_rotation' };
      fixture.componentRef.setInput('task', weeklyTask);
      fixture.detectChanges();
      expect(component.metaText()).toBe('Weekly Rotation');
    });

    it('should display recurrence text for repeating tasks', () => {
      const repeatingTask: Task = { ...mockTask, ruleType: 'repeating' };
      fixture.componentRef.setInput('task', repeatingTask);
      fixture.detectChanges();
      expect(component.metaText()).toBe('Repeating');
    });
  });

  describe('Inputs', () => {
    it('should show complete button by default', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('.task-complete-btn');
      expect(button).toBeTruthy();
    });

    it('should hide complete button when showCompleteButton is false', () => {
      fixture.componentRef.setInput('showCompleteButton', false);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('.task-complete-btn');
      expect(button).toBeFalsy();
    });

    it('should be clickable by default', () => {
      expect(component.clickable()).toBe(true);
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card');
      expect(card?.classList.contains('clickable')).toBe(true);
    });

    it('should not be clickable when clickable is false', () => {
      fixture.componentRef.setInput('clickable', false);
      fixture.detectChanges();
      expect(component.clickable()).toBe(false);
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card');
      expect(card?.classList.contains('clickable')).toBe(false);
    });

    it('should compute completed status from assignment', () => {
      const completedAssignment = {
        id: '1',
        taskId: 'task-1',
        title: 'Test Assignment',
        description: null,
        ruleType: 'daily' as const,
        childId: 'child-1',
        childName: 'Test Child',
        date: new Date().toISOString().split('T')[0],
        status: 'completed' as const,
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        points: 50,
      };
      fixture.componentRef.setInput('task', completedAssignment);
      fixture.detectChanges();
      expect(component.completed()).toBe(true);
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card');
      expect(card?.classList.contains('completed')).toBe(true);
    });

    it('should not apply completed class for task templates', () => {
      fixture.componentRef.setInput('task', mockTask);
      fixture.detectChanges();
      expect(component.completed()).toBe(false);
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card');
      expect(card?.classList.contains('completed')).toBe(false);
    });
  });

  describe('Outputs', () => {
    it('should emit complete event when complete button is clicked', () => {
      let emittedId: string | undefined;
      component.complete.subscribe((id) => (emittedId = id));

      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('.task-complete-btn') as HTMLButtonElement;
      button.click();

      expect(emittedId).toBe(mockTask.id);
    });

    it('should emit edit event when card is clicked', () => {
      let emittedId: string | undefined;
      component.edit.subscribe((id) => (emittedId = id));

      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card') as HTMLElement;
      card.click();

      expect(emittedId).toBe(mockTask.id);
    });

    it('should not emit edit event when clickable is false', () => {
      fixture.componentRef.setInput('clickable', false);
      fixture.detectChanges();

      let emittedId: string | undefined;
      component.edit.subscribe((id) => (emittedId = id));

      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card') as HTMLElement;
      card.click();

      expect(emittedId).toBeUndefined();
    });

    it('should not emit edit event when complete button is clicked', () => {
      let editEmitted = false;
      component.edit.subscribe(() => (editEmitted = true));

      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('.task-complete-btn') as HTMLButtonElement;
      button.click();

      expect(editEmitted).toBe(false);
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should emit edit event on Enter key', () => {
      let emittedId: string | undefined;
      component.edit.subscribe((id) => (emittedId = id));

      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card') as HTMLElement;
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      card.dispatchEvent(event);

      expect(emittedId).toBe(mockTask.id);
    });

    it('should emit edit event on Space key', () => {
      let emittedId: string | undefined;
      component.edit.subscribe((id) => (emittedId = id));

      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card') as HTMLElement;
      const event = new KeyboardEvent('keydown', { key: ' ' });
      card.dispatchEvent(event);

      expect(emittedId).toBe(mockTask.id);
    });

    it('should not emit edit event on other keys', () => {
      let emittedId: string | undefined;
      component.edit.subscribe((id) => (emittedId = id));

      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card') as HTMLElement;
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      card.dispatchEvent(event);

      expect(emittedId).toBeUndefined();
    });

    it('should not emit edit on keyboard when clickable is false', () => {
      fixture.componentRef.setInput('clickable', false);
      fixture.detectChanges();

      let emittedId: string | undefined;
      component.edit.subscribe((id) => (emittedId = id));

      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card') as HTMLElement;
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      card.dispatchEvent(event);

      expect(emittedId).toBeUndefined();
    });

    it('should have tabindex when clickable', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card') as HTMLElement;
      expect(card.getAttribute('tabindex')).toBe('0');
    });

    it('should not have tabindex when not clickable', () => {
      fixture.componentRef.setInput('clickable', false);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card') as HTMLElement;
      expect(card.getAttribute('tabindex')).toBeNull();
    });

    it('should have role="button" when clickable', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card') as HTMLElement;
      expect(card.getAttribute('role')).toBe('button');
    });

    it('should not have role when not clickable', () => {
      fixture.componentRef.setInput('clickable', false);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card') as HTMLElement;
      expect(card.getAttribute('role')).toBeNull();
    });
  });

  describe('ARIA Labels', () => {
    it('should have aria-label on complete button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('.task-complete-btn') as HTMLButtonElement;
      expect(button.getAttribute('aria-label')).toBe('Mark Test Task as complete');
    });

    it('should have aria-label on card when clickable', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card') as HTMLElement;
      expect(card.getAttribute('aria-label')).toBe('Edit Test Task');
    });

    it('should not have aria-label on card when not clickable', () => {
      fixture.componentRef.setInput('clickable', false);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card') as HTMLElement;
      expect(card.getAttribute('aria-label')).toBeNull();
    });
  });

  describe('Visual States', () => {
    it('should apply completed opacity when assignment is completed', () => {
      const completedAssignment = {
        id: '1',
        taskId: 'task-1',
        title: 'Test Assignment',
        description: null,
        ruleType: 'daily' as const,
        childId: 'child-1',
        childName: 'Test Child',
        date: new Date().toISOString().split('T')[0],
        status: 'completed' as const,
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        points: 50,
      };
      fixture.componentRef.setInput('task', completedAssignment);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card') as HTMLElement;
      expect(card.classList.contains('completed')).toBe(true);
    });

    it('should apply overdue border when assignment is overdue', () => {
      const overdueAssignment = {
        id: '1',
        taskId: 'task-1',
        title: 'Test Assignment',
        description: null,
        ruleType: 'daily' as const,
        childId: 'child-1',
        childName: 'Test Child',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending' as const,
        completedAt: null,
        createdAt: new Date().toISOString(),
        points: 50,
      };
      fixture.componentRef.setInput('task', overdueAssignment);
      fixture.detectChanges();
      expect(component.isOverdue()).toBe(true);
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card') as HTMLElement;
      expect(card.classList.contains('overdue')).toBe(true);
    });

    it('should have clickable class and cursor pointer when clickable', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.task-card') as HTMLElement;
      expect(card.classList.contains('clickable')).toBe(true);
    });
  });
});
