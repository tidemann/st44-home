import { inject } from '@angular/core';
import {
  Router,
  CanActivateFn,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HouseholdStore } from '../stores/household.store';

/**
 * Role Guard Factory
 *
 * Creates a guard that checks if the user has any of the allowed roles.
 * Redirects unauthorized users based on their current role.
 *
 * Usage:
 *   canActivate: [roleGuard(['admin', 'parent'])]
 *
 * Redirect behavior:
 *   - Unauthenticated users -> /login
 *   - Child users accessing parent routes -> /my-tasks
 *   - Parent/admin users accessing child routes -> /dashboard
 */
export function roleGuard(allowedRoles: ('admin' | 'parent' | 'child')[]): CanActivateFn {
  return async (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const householdStore = inject(HouseholdStore);

    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      // Store the attempted URL for redirecting after login
      const returnUrl = state.url;
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: returnUrl !== '/' ? returnUrl : null },
      });
    }

    // ST-2227: the role is the one in the active household. One account can be child here and
    // admin elsewhere, so the login role is never trusted while the households are unknown.
    // Load them and make sure one is active; if that fails, use the least privilege (child).
    let householdsUnknown = false;
    if (!householdStore.activeHousehold()) {
      try {
        await householdStore.autoActivateHousehold();
      } catch {
        householdsUnknown = true;
      }
    }

    const userRole: 'admin' | 'parent' | 'child' | undefined = householdsUnknown
      ? 'child'
      : (householdStore.activeHousehold()?.role ?? authService.getUserRole());

    // If user has no role (shouldn't happen), redirect to login
    if (!userRole) {
      return router.createUrlTree(['/login']);
    }

    // If user has an allowed role, grant access
    if (allowedRoles.includes(userRole)) {
      return true;
    }

    // User is authenticated but doesn't have permission
    // Redirect based on their actual role
    if (userRole === 'child') {
      // Child trying to access parent route -> redirect to child dashboard
      return router.createUrlTree(['/my-tasks']);
    } else {
      // Parent/admin trying to access child route -> redirect to home
      return router.createUrlTree(['/home']);
    }
  };
}
