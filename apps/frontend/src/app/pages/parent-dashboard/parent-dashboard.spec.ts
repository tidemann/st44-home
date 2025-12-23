import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ParentDashboardComponent } from './parent-dashboard';
import { HouseholdService } from '../../services/household.service';
import { DashboardService, DashboardSummary } from '../../services/dashboard.service';
import { ChildrenService } from '../../services/children.service';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

describe('ParentDashboardComponent', () => {
  let component: ParentDashboardComponent;
  let fixture: ComponentFixture<ParentDashboardComponent>;
  let mockHouseholdService: {
    getActiveHouseholdId: ReturnType<typeof vi.fn>;
    listHouseholds: ReturnType<typeof vi.fn>;
  };
  let mockDashboardService: { getDashboard: ReturnType<typeof vi.fn> };
  let mockChildrenService: { listChildren: ReturnType<typeof vi.fn> };
  let router: Router;

  const mockDashboard: DashboardSummary = {
    household: { id: 'household-1', name: 'Test Family' },
    weekSummary: {
      total: 10,
      completed: 6,
      pending: 3,
      overdue: 1,
      completionRate: 60,
    },
    children: [
      { id: 'child-1', name: 'Alice', tasksCompleted: 4, tasksTotal: 5, completionRate: 80 },
      { id: 'child-2', name: 'Bob', tasksCompleted: 2, tasksTotal: 5, completionRate: 40 },
    ],
  };

  beforeEach(() => {
    mockHouseholdService = {
      getActiveHouseholdId: vi.fn().mockReturnValue('household-1'),
      listHouseholds: vi.fn().mockResolvedValue([]),
    };

    mockDashboardService = {
      getDashboard: vi.fn().mockResolvedValue(mockDashboard),
    };

    mockChildrenService = {
      listChildren: vi.fn().mockReturnValue(of([])),
    };

    TestBed.configureTestingModule({
      imports: [ParentDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: HouseholdService, useValue: mockHouseholdService },
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: ChildrenService, useValue: mockChildrenService },
      ],
    });

    fixture = TestBed.createComponent(ParentDashboardComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with loading state', () => {
      expect(component['isLoading']()).toBe(true);
      expect(component['dashboard']()).toBeNull();
    });
  });

  describe('loadDashboard', () => {
    it('should load dashboard data on init', async () => {
      await component.ngOnInit();

      expect(mockDashboardService.getDashboard).toHaveBeenCalledWith('household-1');
      expect(component['dashboard']()).toEqual(mockDashboard);
      expect(component['isLoading']()).toBe(false);
    });

    it('should redirect to household/create when no active household', async () => {
      mockHouseholdService.getActiveHouseholdId.mockReturnValue(null);

      await component.ngOnInit();

      expect(router.navigate).toHaveBeenCalledWith(['/household/create']);
    });

    it('should set error message on 403 error', async () => {
      mockDashboardService.getDashboard.mockRejectedValue({ status: 403 });

      await component.ngOnInit();

      expect(component['errorMessage']()).toBe('You do not have access to this household.');
      expect(component['isLoading']()).toBe(false);
    });

    it('should redirect to login on 401 error', async () => {
      mockDashboardService.getDashboard.mockRejectedValue({ status: 401 });

      await component.ngOnInit();

      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should redirect to household/create on 404 error', async () => {
      mockDashboardService.getDashboard.mockRejectedValue({ status: 404 });

      await component.ngOnInit();

      expect(router.navigate).toHaveBeenCalledWith(['/household/create']);
    });

    it('should set generic error message on other errors', async () => {
      mockDashboardService.getDashboard.mockRejectedValue({ status: 500 });

      await component.ngOnInit();

      expect(component['errorMessage']()).toBe('Failed to load dashboard. Please try again.');
    });
  });

  describe('Computed Values', () => {
    beforeEach(async () => {
      await component.ngOnInit();
    });

    it('should compute household from dashboard', () => {
      expect(component['household']()).toEqual({ id: 'household-1', name: 'Test Family' });
    });

    it('should compute weekSummary from dashboard', () => {
      expect(component['weekSummary']().total).toBe(10);
      expect(component['weekSummary']().completionRate).toBe(60);
    });

    it('should compute children from dashboard', () => {
      expect(component['children']().length).toBe(2);
      expect(component['children']()[0].name).toBe('Alice');
    });

    it('should compute hasChildren correctly', () => {
      expect(component['hasChildren']()).toBe(true);
    });

    it('should compute hasTasks correctly', () => {
      expect(component['hasTasks']()).toBe(true);
    });
  });

  describe('Computed Values with empty dashboard', () => {
    beforeEach(async () => {
      const emptyDashboard: DashboardSummary = {
        household: { id: 'h-1', name: 'Empty Household' },
        weekSummary: { total: 0, completed: 0, pending: 0, overdue: 0, completionRate: 0 },
        children: [],
      };
      mockDashboardService.getDashboard.mockResolvedValue(emptyDashboard);
      await component.ngOnInit();
    });

    it('should compute hasChildren as false when no children', () => {
      expect(component['hasChildren']()).toBe(false);
    });

    it('should compute hasTasks as false when no tasks', () => {
      expect(component['hasTasks']()).toBe(false);
    });
  });

  describe('getCompletionClass', () => {
    it('should return completion-high for rates >= 70', () => {
      expect(component.getCompletionClass(70)).toBe('completion-high');
      expect(component.getCompletionClass(85)).toBe('completion-high');
      expect(component.getCompletionClass(100)).toBe('completion-high');
    });

    it('should return completion-medium for rates 40-69', () => {
      expect(component.getCompletionClass(40)).toBe('completion-medium');
      expect(component.getCompletionClass(55)).toBe('completion-medium');
      expect(component.getCompletionClass(69)).toBe('completion-medium');
    });

    it('should return completion-low for rates < 40', () => {
      expect(component.getCompletionClass(0)).toBe('completion-low');
      expect(component.getCompletionClass(20)).toBe('completion-low');
      expect(component.getCompletionClass(39)).toBe('completion-low');
    });
  });

  describe('onHouseholdChanged', () => {
    it('should reload dashboard when household changes', async () => {
      await component.ngOnInit();
      mockDashboardService.getDashboard.mockClear();

      await component.onHouseholdChanged();

      expect(mockDashboardService.getDashboard).toHaveBeenCalledTimes(1);
    });
  });
});
