---
name: http-interceptors
description: Angular HTTP interceptor patterns for auth, error handling, loading states, retry logic, and request caching
allowed-tools: Read, Write, Edit, Glob, Grep
---

# HTTP Interceptors Skill

Expert in implementing Angular HTTP interceptors for cross-cutting concerns.

## When to Use This Skill

Use this skill when:

- Setting up authentication with automatic token injection
- Implementing global error handling
- Adding loading state management
- Configuring retry logic for failed requests
- Implementing request caching/deduplication
- Converting API services from Promises to Observables

## Core Principle

**NEVER manually handle these concerns in individual services**:

- ❌ Manual token injection in every request
- ❌ Per-service error handling
- ❌ Repetitive loading state management
- ❌ Manual retry logic

**ALWAYS use interceptors** for cross-cutting HTTP concerns.

## Required Interceptors

### 1. Auth Interceptor

Automatically adds authentication token to all requests.

```typescript
// interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenService } from '../services/token.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const token = tokenService.getToken();

  // Skip auth for public endpoints
  if (req.url.includes('/auth/login') || req.url.includes('/auth/register')) {
    return next(req);
  }

  // Add token if available
  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authReq);
};
```

### 2. Error Interceptor

Handles HTTP errors globally.

```typescript
// interceptors/error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const notification = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = error.error.message;
      } else {
        // Server-side error
        switch (error.status) {
          case 401:
            errorMessage = 'Unauthorized. Please login again.';
            router.navigate(['/auth/login']);
            break;
          case 403:
            errorMessage = 'Access forbidden.';
            break;
          case 404:
            errorMessage = 'Resource not found.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
          default:
            errorMessage = error.error?.message || error.message;
        }
      }

      // Show notification
      notification.error(errorMessage);

      // Re-throw for component-level handling if needed
      return throwError(() => new Error(errorMessage));
    }),
  );
};
```

### 3. Loading Interceptor

Manages global loading state.

```typescript
// interceptors/loading.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // Skip loading for certain requests
  if (req.headers.has('X-Skip-Loading')) {
    const newReq = req.clone({
      headers: req.headers.delete('X-Skip-Loading'),
    });
    return next(newReq);
  }

  loadingService.show();

  return next(req).pipe(
    finalize(() => {
      loadingService.hide();
    }),
  );
};
```

### 4. Retry Interceptor

Automatically retries failed requests with exponential backoff.

```typescript
// interceptors/retry.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { retry, timer } from 'rxjs';

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  // Only retry GET requests and specific errors
  const shouldRetry = (error: unknown) => {
    if (!(error instanceof HttpErrorResponse)) return false;
    if (req.method !== 'GET') return false;

    // Retry on network errors or 5xx server errors
    return error.status === 0 || error.status >= 500;
  };

  return next(req).pipe(
    retry({
      count: 3,
      delay: (error, retryCount) => {
        if (!shouldRetry(error)) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, retryCount - 1) * 1000;
        return timer(delayMs);
      },
    }),
  );
};
```

### 5. Cache Interceptor

Caches GET requests to avoid duplicate calls.

```typescript
// interceptors/cache.interceptor.ts
import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, tap, share } from 'rxjs';
import { HttpCacheService } from '../services/http-cache.service';

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  const cache = inject(HttpCacheService);

  // Only cache GET requests
  if (req.method !== 'GET') {
    return next(req);
  }

  // Check if cached
  const cachedResponse = cache.get(req.url);
  if (cachedResponse) {
    return of(cachedResponse);
  }

  // Make request and cache
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        cache.set(req.url, event);
      }
    }),
    share(), // Share to prevent duplicate in-flight requests
  );
};
```

## Supporting Services

### TokenService

```typescript
// services/token.service.ts
import { Injectable, inject } from '@angular/core';
import { StorageService, STORAGE_KEYS } from './storage.service';
import { z } from 'zod';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private readonly storage = inject(StorageService);

  getToken(): string | null {
    return this.storage.get(STORAGE_KEYS.AUTH_TOKEN, z.string());
  }

  setToken(token: string): void {
    this.storage.set(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  removeToken(): void {
    this.storage.remove(STORAGE_KEYS.AUTH_TOKEN);
  }

  hasToken(): boolean {
    return this.getToken() !== null;
  }
}
```

### NotificationService

```typescript
// services/notification.service.ts
import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly notificationsSignal = signal<Notification[]>([]);
  readonly notifications = this.notificationsSignal.asReadonly();

  private idCounter = 0;

  private show(type: Notification['type'], message: string, duration = 5000): void {
    const notification: Notification = {
      id: `notification-${this.idCounter++}`,
      type,
      message,
      duration,
    };

    this.notificationsSignal.update((notifications) => [...notifications, notification]);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(notification.id);
      }, duration);
    }
  }

  success(message: string, duration?: number): void {
    this.show('success', message, duration);
  }

  error(message: string, duration?: number): void {
    this.show('error', message, duration);
  }

  info(message: string, duration?: number): void {
    this.show('info', message, duration);
  }

  warning(message: string, duration?: number): void {
    this.show('warning', message, duration);
  }

  dismiss(id: string): void {
    this.notificationsSignal.update((notifications) => notifications.filter((n) => n.id !== id));
  }

  clear(): void {
    this.notificationsSignal.set([]);
  }
}
```

### LoadingService

```typescript
// services/loading.service.ts
import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private readonly countSignal = signal(0);
  readonly isLoading = computed(() => this.countSignal() > 0);

  show(): void {
    this.countSignal.update((count) => count + 1);
  }

  hide(): void {
    this.countSignal.update((count) => Math.max(0, count - 1));
  }

  reset(): void {
    this.countSignal.set(0);
  }
}
```

### HttpCacheService

```typescript
// services/http-cache.service.ts
import { Injectable } from '@angular/core';
import { HttpResponse } from '@angular/common/http';

interface CacheEntry {
  response: HttpResponse<unknown>;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class HttpCacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  get(url: string): HttpResponse<unknown> | null {
    const entry = this.cache.get(url);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.defaultTTL) {
      this.cache.delete(url);
      return null;
    }

    return entry.response;
  }

  set(url: string, response: HttpResponse<unknown>): void {
    this.cache.set(url, {
      response,
      timestamp: Date.now(),
    });
  }

  clear(url?: string): void {
    if (url) {
      this.cache.delete(url);
    } else {
      this.cache.clear();
    }
  }

  clearPattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}
```

## Configuration

### Register Interceptors in App Config

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';
import { loadingInterceptor } from './interceptors/loading.interceptor';
import { retryInterceptor } from './interceptors/retry.interceptor';
import { cacheInterceptor } from './interceptors/cache.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        retryInterceptor,
        cacheInterceptor,
        loadingInterceptor,
        errorInterceptor, // Error should be last
      ]),
    ),
    // ... other providers
  ],
};
```

**Order matters**: Interceptors run in the order provided.

## Service Migration: Promises to Observables

### Before (Promises)

```typescript
// api.service.ts
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  async get<T>(url: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(url));
  }

  async post<T>(url: string, body: unknown): Promise<T> {
    const token = localStorage.getItem('token'); // Manual token
    return firstValueFrom(
      this.http.post<T>(url, body, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
  }
}
```

### After (Observables)

```typescript
// api.service.ts
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  get<T>(url: string): Observable<T> {
    return this.http.get<T>(url);
    // Auth token added by interceptor
    // Errors handled by interceptor
    // Loading state managed by interceptor
  }

  post<T>(url: string, body: unknown): Observable<T> {
    return this.http.post<T>(url, body);
    // All cross-cutting concerns handled by interceptors
  }
}
```

### Component Usage

```typescript
export class MyComponent {
  private api = inject(ApiService);
  protected dataState = new AsyncState<Data[]>();

  async loadData(): Promise<void> {
    await this.dataState.execute(async () => {
      // Convert Observable to Promise
      return firstValueFrom(this.api.get<Data[]>('/api/data'));
    });
  }

  // Or use Observable directly
  protected data$ = this.api.get<Data[]>('/api/data');
}
```

## Advanced Patterns

### Request Deduplication

```typescript
// services/request-deduplication.service.ts
import { Injectable } from '@angular/core';
import { Observable, share } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RequestDeduplicationService {
  private inFlightRequests = new Map<string, Observable<unknown>>();

  deduplicate<T>(key: string, request: () => Observable<T>): Observable<T> {
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key) as Observable<T>;
    }

    const sharedRequest = request().pipe(
      share({
        resetOnComplete: () => {
          this.inFlightRequests.delete(key);
        },
      }),
    );

    this.inFlightRequests.set(key, sharedRequest);
    return sharedRequest;
  }
}
```

### Conditional Loading Indicator

```typescript
// Skip loading for background requests
this.http.get('/api/data', {
  headers: new HttpHeaders({ 'X-Skip-Loading': 'true' }),
});
```

### Cache Invalidation

```typescript
// Clear cache after mutation
export class TaskService {
  private http = inject(HttpClient);
  private cache = inject(HttpCacheService);

  createTask(task: CreateTaskRequest): Observable<Task> {
    return this.http.post<Task>('/api/tasks', task).pipe(
      tap(() => {
        // Invalidate tasks list cache
        this.cache.clearPattern(/\/api\/tasks/);
      }),
    );
  }
}
```

## Testing

### Testing with Interceptors

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';

describe('AuthInterceptor', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should add auth token', () => {
    // Test implementation
  });
});
```

## Success Criteria

Before marking HTTP layer implementation complete:

- [ ] Auth interceptor configured (no manual token injection)
- [ ] Error interceptor handles all HTTP errors
- [ ] Loading interceptor manages global state
- [ ] Retry logic configured for transient failures
- [ ] Cache interceptor prevents duplicate requests
- [ ] All services return Observables (not Promises)
- [ ] TokenService abstracts token management
- [ ] NotificationService replaces console.log
- [ ] LoadingService provides global loading state
- [ ] Tests cover interceptor logic

## Reference

- GitHub Issue #257: HTTP Layer Improvements
- `.github/agents/frontend-agent.md`: Complete frontend patterns
