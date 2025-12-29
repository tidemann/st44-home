/**
 * Error Interceptor
 *
 * Handles HTTP errors globally with consistent error handling.
 * Uses Angular's functional interceptor pattern (Angular 15+).
 *
 * Features:
 * - Catches all HTTP errors
 * - Logs errors for debugging
 * - Handles 401 (unauthorized) by redirecting to login
 * - Handles 403 (forbidden) gracefully
 * - Retries on 5xx errors with exponential backoff
 * - Provides user-friendly error messages
 */

import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, retry, timer } from 'rxjs';
import { StorageService } from '../services/storage.service';
import { STORAGE_KEYS } from '../services/storage-keys';

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
const NO_REDIRECT_URLS = ['/auth/login', '/auth/register', '/auth/refresh-token'];

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

  return next(req).pipe(
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
        url: req.url,
        status: error.status,
        statusText: error.statusText,
        message: error.error?.message || error.message,
      });

      // Handle 401 Unauthorized - redirect to login
      if (error.status === 401 && shouldRedirectOnUnauthorized(req.url)) {
        clearAuthTokens(storage);
        router.navigate(['/login'], {
          queryParams: { returnUrl: router.url },
        });
      }

      // Enhance error with user-friendly message
      const enhancedError = new HttpErrorResponse({
        error: {
          ...error.error,
          userMessage: getErrorMessage(error),
        },
        headers: error.headers,
        status: error.status,
        statusText: error.statusText,
        url: error.url || undefined,
      });

      return throwError(() => enhancedError);
    }),
  );
};
