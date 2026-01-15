import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { FailedTasksSectionComponent } from './failed-tasks-section';
import { SingleTaskService, type FailedTask } from '../../services/single-task.service';

describe('FailedTasksSectionComponent', () => {
  let component: FailedTasksSectionComponent;
  let fixture: ComponentFixture<FailedTasksSectionComponent>;
  let mockSingleTaskService: {
    failedTasks: ReturnType<typeof signal<FailedTask[]>>;
    expiredTasks: ReturnType<typeof signal<FailedTask[]>>;
    failedLoading: ReturnType<typeof signal<boolean>>;
    expiredLoading: ReturnType<typeof signal<boolean>>;
    failedError: ReturnType<typeof signal<string | null>>;
    expiredError: ReturnType<typeof signal<string | null>>;
    loadFailedTasks: ReturnType<typeof vi.fn>;
    loadExpiredTasks: ReturnType<typeof vi.fn>;
  };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  const mockFailedTask: FailedTask = {
    id: 'task-1',
    name: 'Clean Room',
    description: 'Clean your room',
    points: 10,
    deadline: null,
    candidateCount: 2,
    declineCount: 2,
  };

  const mockExpiredTask: FailedTask = {
    id: 'task-2',
    name: 'Homework',
    description: 'Complete homework',
    points: 15,
    deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    candidateCount: 1,
    declineCount: 0,
  };

  beforeEach(async () => {
    const failedTasksSignal = signal<FailedTask[]>([mockFailedTask]);
    const expiredTasksSignal = signal<FailedTask[]>([mockExpiredTask]);
    const failedLoadingSignal = signal(false);
    const expiredLoadingSignal = signal(false);
    const failedErrorSignal = signal<string | null>(null);
    const expiredErrorSignal = signal<string | null>(null);

    mockSingleTaskService = {
      failedTasks: failedTasksSignal,
      expiredTasks: expiredTasksSignal,
      failedLoading: failedLoadingSignal,
      expiredLoading: expiredLoadingSignal,
      failedError: failedErrorSignal,
      expiredError: expiredErrorSignal,
      loadFailedTasks: vi.fn().mockReturnValue(of({ tasks: [mockFailedTask] })),
      loadExpiredTasks: vi.fn().mockReturnValue(of({ tasks: [mockExpiredTask] })),
    };

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [FailedTasksSectionComponent],
      providers: [
        { provide: SingleTaskService, useValue: mockSingleTaskService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FailedTasksSectionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('householdId', 'household-1');
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should load both failed and expired tasks on init', () => {
      fixture.detectChanges();
      expect(mockSingleTaskService.loadFailedTasks).toHaveBeenCalledWith('household-1');
      expect(mockSingleTaskService.loadExpiredTasks).toHaveBeenCalledWith('household-1');
    });

    it('should not load tasks if householdId is empty', () => {
      fixture.componentRef.setInput('householdId', '');
      fixture.detectChanges();
      expect(mockSingleTaskService.loadFailedTasks).not.toHaveBeenCalled();
      expect(mockSingleTaskService.loadExpiredTasks).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when either is loading', () => {
      mockSingleTaskService.failedLoading.set(true);
      fixture.detectChanges();
      expect(component['isLoading']()).toBe(true);
    });

    it('should show loading indicator when expired is loading', () => {
      mockSingleTaskService.expiredLoading.set(true);
      fixture.detectChanges();
      expect(component['isLoading']()).toBe(true);
    });

    it('should not show loading indicator when neither is loading', () => {
      fixture.detectChanges();
      expect(component['isLoading']()).toBe(false);
    });
  });

  describe('Error State', () => {
    it('should show failed error when present', () => {
      mockSingleTaskService.failedError.set('Failed to load failed tasks');
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const error = compiled.querySelector('.error-message');
      expect(error).toBeTruthy();
      // Norwegian is the source language
      expect(error?.textContent).toContain('Kunne ikke laste avviste oppgaver');
    });

    it('should show expired error when present', () => {
      mockSingleTaskService.expiredError.set('Failed to load expired tasks');
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const error = compiled.querySelector('.error-message');
      expect(error).toBeTruthy();
      // Norwegian is the source language
      expect(error?.textContent).toContain('Kunne ikke laste utlopte oppgaver');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no problem tasks', () => {
      mockSingleTaskService.failedTasks.set([]);
      mockSingleTaskService.expiredTasks.set([]);
      fixture.detectChanges();

      expect(component['hasProblemTasks']()).toBe(false);
    });
  });

  describe('Task Display', () => {
    it('should display both failed and expired tasks', () => {
      fixture.detectChanges();
      expect(component['hasFailedTasks']()).toBe(true);
      expect(component['hasExpiredTasks']()).toBe(true);
    });

    it('should compute total count correctly', () => {
      fixture.detectChanges();
      expect(component['totalCount']()).toBe(2);
    });
  });

  describe('Navigation', () => {
    it('should navigate to tasks page with assign query param', () => {
      fixture.detectChanges();
      component['onAssignManually']('task-1');

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/tasks'], {
        queryParams: { assign: 'task-1' },
      });
    });
  });

  describe('Days Overdue Calculation', () => {
    it('should return 0 for tasks without deadline', () => {
      fixture.detectChanges();
      const days = component['getDaysOverdue'](mockFailedTask);
      expect(days).toBe(0);
    });

    it('should calculate days overdue for expired tasks', () => {
      fixture.detectChanges();
      const days = component['getDaysOverdue'](mockExpiredTask);
      expect(days).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Deadline Formatting', () => {
    it('should return empty string for null deadline', () => {
      fixture.detectChanges();
      const formatted = component['formatDeadline'](null);
      expect(formatted).toBe('');
    });

    it('should format deadline date correctly', () => {
      fixture.detectChanges();
      const date = new Date('2025-06-15');
      const formatted = component['formatDeadline'](date);
      expect(formatted).toContain('Jun');
      expect(formatted).toContain('15');
    });

    it('should include year for different year', () => {
      fixture.detectChanges();
      const date = new Date('2024-06-15');
      const formatted = component['formatDeadline'](date);
      expect(formatted).toContain('2024');
    });
  });

  describe('Computed Signals', () => {
    it('should compute hasFailedTasks correctly', () => {
      fixture.detectChanges();
      expect(component['hasFailedTasks']()).toBe(true);

      mockSingleTaskService.failedTasks.set([]);
      expect(component['hasFailedTasks']()).toBe(false);
    });

    it('should compute hasExpiredTasks correctly', () => {
      fixture.detectChanges();
      expect(component['hasExpiredTasks']()).toBe(true);

      mockSingleTaskService.expiredTasks.set([]);
      expect(component['hasExpiredTasks']()).toBe(false);
    });

    it('should compute hasProblemTasks correctly', () => {
      fixture.detectChanges();
      expect(component['hasProblemTasks']()).toBe(true);

      mockSingleTaskService.failedTasks.set([]);
      mockSingleTaskService.expiredTasks.set([]);
      expect(component['hasProblemTasks']()).toBe(false);
    });
  });
});
