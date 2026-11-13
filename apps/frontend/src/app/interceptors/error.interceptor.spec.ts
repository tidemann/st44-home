import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

/** A JWT the frontend can decode; the signature is never checked here */
function jwt(type: 'access' | 'refresh', expiresInSeconds: number, tag = ''): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(
    JSON.stringify({
      userId: 'u1',
      email: 'parent@example.com',
      role: 'parent',
      type,
      tag,
      iat: now,
      exp: now + expiresInSeconds,
    }),
  );
  return `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${payload}.sig`;
}

describe('errorInterceptor: session refresh (ST-2539)', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokens: TokenService;
  let router: { url: string; navigate: ReturnType<typeof vi.fn> };

  const expiredAccess = jwt('access', -60, 'old');
  const refreshToken = jwt('refresh', 7 * 24 * 3600, 'old');
  const newAccess = jwt('access', 3600, 'new');
  const newRefresh = jwt('refresh', 30 * 24 * 3600, 'new');

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    router = { url: '/home', navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });

    tokens = TestBed.inject(TokenService);
    tokens.storeTokens(expiredAccess, refreshToken, 'persistent');
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('treats an expired access token as signed in while the refresh token is valid', () => {
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(true);
  });

  it('refreshes on 401, stores the new tokens and retries the request', () => {
    let result: unknown;
    http.get('/api/tasks').subscribe((body) => (result = body));

    const first = httpMock.expectOne('/api/tasks');
    expect(first.request.headers.get('Authorization')).toBe(`Bearer ${expiredAccess}`);
    first.flush({ error: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    const refresh = httpMock.expectOne((r) => r.url.endsWith('/api/auth/refresh'));
    expect(refresh.request.body).toEqual({ refreshToken });
    refresh.flush({ accessToken: newAccess, refreshToken: newRefresh });

    const retry = httpMock.expectOne('/api/tasks');
    expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${newAccess}`);
    retry.flush([{ id: 't1' }]);

    expect(result).toEqual([{ id: 't1' }]);
    expect(tokens.getAccessToken()).toBe(newAccess);
    expect(tokens.getRefreshToken()).toBe(newRefresh);
    expect(tokens.getStorageStrategy()).toBe('persistent');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shares one refresh between parallel requests', () => {
    const results: unknown[] = [];
    http.get('/api/tasks').subscribe((body) => results.push(body));
    http.get('/api/children').subscribe((body) => results.push(body));

    httpMock.expectOne('/api/tasks').flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/api/children').flush(null, { status: 401, statusText: 'Unauthorized' });

    httpMock
      .expectOne((r) => r.url.endsWith('/api/auth/refresh'))
      .flush({ accessToken: newAccess, refreshToken: newRefresh });

    httpMock.expectOne('/api/tasks').flush('tasks');
    httpMock.expectOne('/api/children').flush('children');

    expect(results.sort()).toEqual(['children', 'tasks']);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('retries without a new refresh when another request already refreshed', () => {
    let result: unknown;
    http.get('/api/tasks').subscribe((body) => (result = body));
    const sent = httpMock.expectOne('/api/tasks');

    // Another request's refresh finished while this one was on the way
    tokens.storeTokens(newAccess, newRefresh, 'persistent');
    sent.flush(null, { status: 401, statusText: 'Unauthorized' });

    const retry = httpMock.expectOne('/api/tasks');
    expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${newAccess}`);
    retry.flush('ok');
    expect(result).toBe('ok');
  });

  it('goes to /login when the refresh is refused', () => {
    let error: { status: number } | undefined;
    http.get('/api/tasks').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne('/api/tasks').flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne((r) => r.url.endsWith('/api/auth/refresh'))
      .flush(
        { error: 'Invalid or expired refresh token' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(error?.status).toBe(401);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/home' },
    });
    expect(tokens.getAccessToken()).toBeNull();
    expect(tokens.getRefreshToken()).toBeNull();
  });

  it('goes to /login when the retried request is still unauthorized', () => {
    http.get('/api/tasks').subscribe({ error: () => undefined });

    httpMock.expectOne('/api/tasks').flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne((r) => r.url.endsWith('/api/auth/refresh'))
      .flush({ accessToken: newAccess, refreshToken: newRefresh });
    httpMock.expectOne('/api/tasks').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/home' },
    });
  });

  it('keeps the session when the refresh fails offline', () => {
    let error: { status: number } | undefined;
    http.get('/api/tasks').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne('/api/tasks').flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne((r) => r.url.endsWith('/api/auth/refresh'))
      .error(new ProgressEvent('error'), { status: 0 });

    expect(error?.status).toBe(401);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(tokens.getRefreshToken()).toBe(refreshToken);
  });
});
