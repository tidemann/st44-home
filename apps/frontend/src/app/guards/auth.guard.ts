import { inject } from '@angular/core';
import {
  Router,
  CanActivateFn,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HouseholdService } from '../services/household.service';

/**
 * Auth Guard
 *
 * Protects routes that require authentication.
 * Redirects unauthenticated users to /login with return URL.
 * Redirects authenticated users without households to /household/create.
 *
 * Usage:
 *   canActivate: [authGuard]
 */
export const authGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const authService = inject(AuthService);
  const householdService = inject(HouseholdService);
  const router = inject(Router);

  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    // Store the attempted URL for redirecting after login
    const returnUrl = state.url;
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: returnUrl !== '/' ? returnUrl : null },
    });
  }

  // Special case: allow access to /household/create without household check
  if (state.url.startsWith('/household/create')) {
    return true;
  }

  // Check if user has an active household
  const activeHouseholdId = householdService.getActiveHouseholdId();
  if (!activeHouseholdId) {
    // User is authenticated but has no active household
    // Try to fetch their households
    try {
      const households = await householdService.listHouseholds();
      if (households.length > 0) {
        // User has households, set the first one as active
        householdService.setActiveHousehold(households[0].id);
        return true;
      } else {
        // User has no households, redirect to create one
        return router.createUrlTree(['/household/create']);
      }
    } catch (error) {
      // Failed to fetch households (network error or auth error)
      // Let the request through, the component will handle the error
      return true;
    }
  }

  // User is authenticated and has an active household
  return true;
};
