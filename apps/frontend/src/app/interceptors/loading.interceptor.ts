/**
 * Loading Interceptor
 *
 * Tracks HTTP request loading state globally.
 * Uses Angular's functional interceptor pattern (Angular 15+).
 *
 * Features:
 * - Tracks active HTTP requests
 * - Provides reactive loading signal
 * - Supports multiple concurrent requests
 * - Excludes background/silent requests
 */

import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpContextToken,
} from '@angular/common/http';
import { inject, Injectable, signal, computed } from '@angular/core';
import { Observable, finalize } from 'rxjs';

/**
 * Context token to skip loading tracking for specific requests
 *
 * @example
 * // Skip loading indicator for a request:
 * this.http.get('/api/data', {
 *   context: new HttpContext().set(SKIP_LOADING, true)
 * });
 */
export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

/**
 * Loading Service
 *
 * Provides reactive access to HTTP loading state.
 * Inject this service in components to show loading indicators.
 *
 * @example
 * export class MyComponent {
 *   private readonly loadingService = inject(LoadingService);
 *   isLoading = this.loadingService.isLoading;
 * }
 */
@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private readonly activeRequests = signal(0);

  /**
   * Whether any HTTP requests are currently in progress
   */
  readonly isLoading = computed(() => this.activeRequests() > 0);

  /**
   * Number of active HTTP requests
   */
  readonly activeCount = computed(() => this.activeRequests());

  /**
   * Increment active request count
   * @internal Used by loading interceptor
   */
  startRequest(): void {
    this.activeRequests.update((count) => count + 1);
  }

  /**
   * Decrement active request count
   * @internal Used by loading interceptor
   */
  endRequest(): void {
    this.activeRequests.update((count) => Math.max(0, count - 1));
  }

  /**
   * Reset active request count
   * Useful for cleanup during navigation
   */
  reset(): void {
    this.activeRequests.set(0);
  }
}

/**
 * Loading interceptor function
 *
 * @example
 * // Register in app.config.ts:
 * provideHttpClient(withInterceptors([loadingInterceptor]))
 */
export const loadingInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  // Skip loading tracking if requested
  if (req.context.get(SKIP_LOADING)) {
    return next(req);
  }

  const loadingService = inject(LoadingService);

  // Start tracking this request
  loadingService.startRequest();

  // End tracking when request completes (success or error)
  return next(req).pipe(
    finalize(() => {
      loadingService.endRequest();
    }),
  );
};
