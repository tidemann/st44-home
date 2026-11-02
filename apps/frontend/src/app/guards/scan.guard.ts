import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * The scan page of an «Etter tur» chore (ST-2075). A phone that is not signed in goes to
 * the children's sign-in first, which comes back here and finishes the chore.
 */
export const scanGuard: CanActivateFn = (route) => {
  if (inject(AuthService).isAuthenticated()) return true;
  const code = route.paramMap.get('code') ?? '';
  return inject(Router).createUrlTree(['/child-login'], {
    queryParams: { returnUrl: `/s/${code}` },
  });
};
