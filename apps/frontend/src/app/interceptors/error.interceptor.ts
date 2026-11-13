/**
 * Error Interceptor
 *
 * Handles HTTP errors globally with consistent error handling.
 * Uses Angular's functional interceptor pattern (Angular 15+).
 *
 * Features:
 * - Catches all HTTP errors
 * - Logs errors for debugging
 * - Handles 401 (unauthorized) by refreshing the session once, then redirecting to login
 * - Handles 403 (forbidden) gracefully
 * - Retries on 5xx errors with exponential backoff
 * - Provides user-friendly error messages
 */

import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
  HttpEvent,
} from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, of, switchMap, throwError, retry, timer } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { StorageService } from '../services/storage.service';
import { STORAGE_KEYS } from '../services/storage-keys';
import { TokenService } from '../services/token.service';

/**
 * Maximum retry attempts for server errors
 */
const MAX_RETRIES = 2;

/**
 * Base delay in milliseconds for exponential backoff
 */
const RETRY_DELAY_MS = 1000;

/**
 * URLs that should not trigger auth redirect on 401
 * (prevents redirect loops)
 */
const NO_REDIRECT_URLS = ['/auth/login', '/auth/register', '/auth/refresh'];

/**
 * Refresh answers that mean the refresh token is refused. Any other failure
 * (offline, 408, 429, 5xx) keeps the session for the next attempt.
 */
const SESSION_ENDING_REFRESH_STATUSES = new Set([400, 401, 403]);

/**
 * Check if we should retry the request
 */
function shouldRetry(error: HttpErrorResponse): boolean {
  // Only retry on server errors (5xx)
  return error.status >= 500 && error.status < 600;
}

/**
 * Check if we should redirect to login on 401
 */
function shouldRedirectOnUnauthorized(url: string): boolean {
  return !NO_REDIRECT_URLS.some((skipUrl) => url.includes(skipUrl));
}

/**
 * Clear auth tokens from storage
 */
function clearAuthTokens(storage: StorageService): void {
  storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
  storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
  sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error: HttpErrorResponse): string {
  // Handle network errors
  if (error.status === 0) {
    return 'Unable to connect to server. Please check your internet connection.';
  }

  // Handle specific status codes
  switch (error.status) {
    case 400:
      return error.error?.message || 'Invalid request. Please check your input.';
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return error.error?.message || 'A conflict occurred. Please try again.';
    case 422:
      return error.error?.message || 'Validation failed. Please check your input.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Server error. Please try again later.';
    default:
      return error.error?.message || 'An unexpected error occurred.';
  }
}

/**
 * Add a user-friendly message to an error
 */
function enhanceError(error: HttpErrorResponse): HttpErrorResponse {
  return new HttpErrorResponse({
    error: {
      ...error.error,
      userMessage: getErrorMessage(error),
    },
    headers: error.headers,
    status: error.status,
    statusText: error.statusText,
    url: error.url || undefined,
  });
}

/**
 * Error interceptor function
 *
 * @example
 * // Register in app.config.ts:
 * provideHttpClient(withInterceptors([errorInterceptor]))
 */
export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const router = inject(Router);
  const storage = inject(StorageService);
  // Looked up only on a 401: AuthService itself depends on HttpClient
  const injector = inject(Injector);

  /** Session is over: clear the tokens and send the user to the login page */
  const endSession = (): void => {
    clearAuthTokens(storage);
    router.navigate(['/login'], {
      queryParams: { returnUrl: router.url },
    });
  };

  /**
   * ST-2539: an expired access token gets one refresh and one retry. The refreshed request
   * comes back through `handle` with `allowRefresh` false, so a second 401 ends the session.
   */
  const refreshAndRetry = (request: HttpRequest<unknown>, error: HttpErrorResponse) => {
    const tokenService = injector.get(TokenService);
    const sent = request.headers.get('Authorization');
    const current = tokenService.getAccessToken();
    // Another request has already refreshed the token since this one was sent
    const token$ =
      current && sent && sent !== `Bearer ${current}`
        ? of(current)
        : injector.get(AuthService).refreshSession();

    return token$.pipe(
      catchError((refreshError: HttpErrorResponse) => {
        // Offline, rate limits or server trouble keep the session; only a refused refresh ends it
        if (SESSION_ENDING_REFRESH_STATUSES.has(refreshError.status)) endSession();
        return throwError(() => enhanceError(error));
      }),
      switchMap((token) =>
        handle(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }), false),
      ),
    );
  };

  const handle = (
    request: HttpRequest<unknown>,
    allowRefresh: boolean,
  ): Observable<HttpEvent<unknown>> =>
    next(request).pipe(
      // Retry server errors with exponential backoff
      retry({
        count: MAX_RETRIES,
        delay: (error, retryCount) => {
          if (!shouldRetry(error)) {
            return throwError(() => error);
          }
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
          console.warn(`Retrying request (attempt ${retryCount}/${MAX_RETRIES}) in ${delay}ms...`);
          return timer(delay);
        },
      }),

      // Handle errors
      catchError((error: HttpErrorResponse) => {
        // Log error for debugging
        console.error('HTTP Error:', {
          url: request.url,
          status: error.status,
          statusText: error.statusText,
          message: error.error?.message || error.message,
        });

        // Handle 401 Unauthorized - refresh once, else redirect to login
        if (error.status === 401 && shouldRedirectOnUnauthorized(request.url)) {
          if (
            allowRefresh &&
            request.headers.has('Authorization') &&
            injector.get(TokenService).getRefreshToken()
          ) {
            return refreshAndRetry(request, error);
          }
          endSession();
        }

        return throwError(() => enhanceError(error));
      }),
    );

  return handle(req, true);
};
