/**
 * Authentication Interceptor
 *
 * Automatically attaches JWT token to all outgoing HTTP requests.
 * Uses Angular's functional interceptor pattern (Angular 15+).
 *
 * Features:
 * - Adds Authorization header with Bearer token
 * - Retrieves token from TokenService (handles both storage strategies)
 * - Skips auth header for requests that don't need it
 */

import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenService } from '../services/token.service';

/**
 * URLs that should skip authentication
 * (login, register, public endpoints)
 */
const SKIP_AUTH_URLS = ['/auth/login', '/auth/register', '/auth/google', '/auth/forgot-password'];

/**
 * Check if the request should skip authentication
 */
function shouldSkipAuth(req: HttpRequest<unknown>): boolean {
  return SKIP_AUTH_URLS.some((url) => req.url.includes(url));
}

/**
 * Auth interceptor function
 *
 * @example
 * // Register in app.config.ts:
 * provideHttpClient(withInterceptors([authInterceptor]))
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  // Skip auth for public endpoints
  if (shouldSkipAuth(req)) {
    return next(req);
  }

  const tokenService = inject(TokenService);

  // Get token from TokenService
  const token = tokenService.getAccessToken();

  // If no token, proceed without auth header
  if (!token) {
    return next(req);
  }

  // Clone request and add auth header
  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authReq);
};
