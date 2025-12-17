import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { HouseholdService } from '../services/household.service';

describe('authGuard', () => {
  let mockAuthService: { isAuthenticated: ReturnType<typeof vi.fn> };
  let mockHouseholdService: {
    getActiveHouseholdId: ReturnType<typeof vi.fn>;
    setActiveHousehold: ReturnType<typeof vi.fn>;
    listHouseholds: ReturnType<typeof vi.fn>;
  };
  let mockRouter: { createUrlTree: ReturnType<typeof vi.fn> };
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;

  beforeEach(() => {
    mockAuthService = {
      isAuthenticated: vi.fn(),
    };

    mockHouseholdService = {
      getActiveHouseholdId: vi.fn(),
      setActiveHousehold: vi.fn(),
      listHouseholds: vi.fn(),
    };

    mockRouter = {
      createUrlTree: vi.fn().mockReturnValue({} as UrlTree),
    };

    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = { url: '/dashboard' } as RouterStateSnapshot;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: HouseholdService, useValue: mockHouseholdService },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockAuthService.isAuthenticated.mockReturnValue(false);
    });

    it('should redirect to login', async () => {
      const result = await TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/dashboard' },
      });
      expect(result).toEqual({});
    });

    it('should not include returnUrl when accessing root', async () => {
      mockState = { url: '/' } as RouterStateSnapshot;

      await TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: null },
      });
    });
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
    });

    it('should allow access to household/create without household check', async () => {
      mockState = { url: '/household/create' } as RouterStateSnapshot;

      const result = await TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(result).toBe(true);
      expect(mockHouseholdService.getActiveHouseholdId).not.toHaveBeenCalled();
    });

    it('should allow access when user has active household', async () => {
      mockHouseholdService.getActiveHouseholdId.mockReturnValue('household-1');

      const result = await TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(result).toBe(true);
    });

    it('should set first household as active when user has households but none selected', async () => {
      mockHouseholdService.getActiveHouseholdId.mockReturnValue(null);
      mockHouseholdService.listHouseholds.mockResolvedValue([
        { id: 'household-1', name: 'Family 1' },
        { id: 'household-2', name: 'Family 2' },
      ]);

      const result = await TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(mockHouseholdService.setActiveHousehold).toHaveBeenCalledWith('household-1');
      expect(result).toBe(true);
    });

    it('should redirect to household/create when user has no households', async () => {
      mockHouseholdService.getActiveHouseholdId.mockReturnValue(null);
      mockHouseholdService.listHouseholds.mockResolvedValue([]);

      const result = await TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/household/create']);
      expect(result).toEqual({});
    });

    it('should allow access when listHouseholds fails (let component handle error)', async () => {
      mockHouseholdService.getActiveHouseholdId.mockReturnValue(null);
      mockHouseholdService.listHouseholds.mockRejectedValue(new Error('Network error'));

      const result = await TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(result).toBe(true);
    });
  });
});
