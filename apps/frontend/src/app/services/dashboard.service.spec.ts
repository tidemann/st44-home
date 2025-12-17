import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DashboardService, DashboardSummary } from './dashboard.service';
import { ApiService } from './api.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockApiService: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockApiService = {
      get: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [DashboardService, { provide: ApiService, useValue: mockApiService }],
    });

    service = TestBed.inject(DashboardService);
  });

  describe('getDashboard', () => {
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

    it('should call ApiService.get with correct endpoint', async () => {
      mockApiService.get.mockResolvedValue(mockDashboard);

      await service.getDashboard('household-1');

      expect(mockApiService.get).toHaveBeenCalledWith('/households/household-1/dashboard');
    });

    it('should return dashboard summary data', async () => {
      mockApiService.get.mockResolvedValue(mockDashboard);

      const result = await service.getDashboard('household-1');

      expect(result).toEqual(mockDashboard);
      expect(result.household.name).toBe('Test Family');
      expect(result.weekSummary.total).toBe(10);
      expect(result.children.length).toBe(2);
    });

    it('should propagate errors from ApiService', async () => {
      const error = new Error('Network error');
      mockApiService.get.mockRejectedValue(error);

      await expect(service.getDashboard('household-1')).rejects.toThrow('Network error');
    });

    it('should handle empty children array', async () => {
      const emptyChildrenDashboard: DashboardSummary = {
        ...mockDashboard,
        children: [],
      };
      mockApiService.get.mockResolvedValue(emptyChildrenDashboard);

      const result = await service.getDashboard('household-1');

      expect(result.children).toEqual([]);
    });

    it('should handle zero tasks state', async () => {
      const noTasksDashboard: DashboardSummary = {
        ...mockDashboard,
        weekSummary: {
          total: 0,
          completed: 0,
          pending: 0,
          overdue: 0,
          completionRate: 0,
        },
      };
      mockApiService.get.mockResolvedValue(noTasksDashboard);

      const result = await service.getDashboard('household-1');

      expect(result.weekSummary.total).toBe(0);
      expect(result.weekSummary.completionRate).toBe(0);
    });
  });
});
