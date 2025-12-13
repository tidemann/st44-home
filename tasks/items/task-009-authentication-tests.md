# Task: Write Authentication Tests

## Metadata
- **ID**: task-009
- **Feature**: feature-001 - User Authentication System
- **Epic**: epic-001 - Multi-Tenant Foundation
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-13
- **Assigned Agent**: testing
- **Estimated Duration**: 6-8 hours

## Description
Create comprehensive test suites for the authentication system covering backend API endpoints, frontend components, and end-to-end workflows. Includes unit tests, integration tests, and security tests to ensure the authentication system is robust and secure.

## Requirements
- Unit tests for backend endpoints (registration, login, refresh)
- Unit tests for frontend AuthService
- Component tests for RegisterComponent and LoginComponent
- Integration tests for full auth flow (backend + frontend)
- Security tests (SQL injection, XSS, timing attacks)
- E2E tests for user registration and login workflows
- Test coverage > 80% for auth-related code
- All edge cases covered
- Tests document expected behavior

## Acceptance Criteria
- [ ] Backend registration endpoint tests (success, duplicate email, weak password, validation)
- [ ] Backend login endpoint tests (success, wrong password, non-existent user)
- [ ] Backend token refresh tests (valid token, expired token, invalid token)
- [ ] Backend middleware tests (valid token, missing token, expired token, wrong type)
- [ ] Frontend AuthService tests (register, login, logout, token management)
- [ ] RegisterComponent tests (form validation, submission, error handling)
- [ ] LoginComponent tests (form validation, submission, remember me, return URL)
- [ ] E2E test: Complete registration flow
- [ ] E2E test: Complete login flow
- [ ] E2E test: Protected route redirect to login
- [ ] Security tests: SQL injection attempts
- [ ] Security tests: XSS attempts
- [ ] Security tests: Timing attack resistance
- [ ] All tests passing with >80% coverage

## Dependencies
- task-001 through task-008 completed
- Testing frameworks configured (Jest/Vitest for backend, Jasmine/Karma for frontend)
- E2E testing framework (Playwright/Cypress)

## Technical Notes

### Testing Strategy

**Backend Tests (Integration)**
- Use real database (test DB or Docker container)
- Test actual HTTP requests
- Verify database state changes
- Test error responses

**Frontend Tests (Unit)**
- Mock HttpClient
- Test service methods in isolation
- Verify token storage logic
- Test component behavior

**E2E Tests**
- Use real browser
- Test complete user workflows
- Verify UI updates correctly
- Test navigation

## Affected Areas
- [x] Backend (Fastify/Node.js)
- [x] Frontend (Angular)
- [x] Testing infrastructure

## Implementation Plan

### Research Phase
- [x] Review project testing setup
- [x] Identify testing frameworks in use
- [x] Review testing best practices

### Implementation Steps

#### Backend Tests
1. Setup test database or use Docker
2. Create test utilities (test data, cleanup)
3. Write registration endpoint tests
4. Write login endpoint tests
5. Write token refresh endpoint tests
6. Write middleware tests
7. Write security tests

#### Frontend Tests
8. Create mock data and services
9. Write AuthService unit tests
10. Write RegisterComponent tests
11. Write LoginComponent tests

#### E2E Tests
12. Setup E2E testing framework
13. Write registration flow test
14. Write login flow test
15. Write protected route test

### Testing Strategy
- Run tests in CI/CD pipeline
- Generate coverage reports
- Test both success and failure paths
- Test edge cases and boundary conditions

## Test Code Examples

### Backend: Registration Endpoint Tests
```typescript
// apps/backend/src/__tests__/auth.test.ts

import { test } from 'node:test';
import assert from 'node:assert';
import { build } from '../app'; // Assuming app factory function

test('POST /api/auth/register - success', async (t) => {
  const app = await build();
  t.after(() => app.close());
  
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: 'test@example.com',
      password: 'Test1234'
    }
  });
  
  assert.strictEqual(response.statusCode, 201);
  const body = JSON.parse(response.body);
  assert.ok(body.userId);
  assert.strictEqual(body.email, 'test@example.com');
  assert.strictEqual(body.password, undefined); // Should not return password
});

test('POST /api/auth/register - duplicate email', async (t) => {
  const app = await build();
  t.after(() => app.close());
  
  // First registration
  await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: 'duplicate@example.com',
      password: 'Test1234'
    }
  });
  
  // Second registration with same email
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: 'duplicate@example.com',
      password: 'Test1234'
    }
  });
  
  assert.strictEqual(response.statusCode, 409);
  const body = JSON.parse(response.body);
  assert.ok(body.error.includes('already registered'));
});

test('POST /api/auth/register - weak password', async (t) => {
  const app = await build();
  t.after(() => app.close());
  
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: 'test@example.com',
      password: 'weak'
    }
  });
  
  assert.strictEqual(response.statusCode, 400);
  const body = JSON.parse(response.body);
  assert.ok(body.error.includes('Password'));
});

test('POST /api/auth/login - success', async (t) => {
  const app = await build();
  t.after(() => app.close());
  
  // Register user first
  await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: 'login@example.com',
      password: 'Test1234'
    }
  });
  
  // Login
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      email: 'login@example.com',
      password: 'Test1234'
    }
  });
  
  assert.strictEqual(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.ok(body.accessToken);
  assert.ok(body.refreshToken);
  assert.ok(body.userId);
  assert.strictEqual(body.email, 'login@example.com');
});

test('POST /api/auth/login - wrong password', async (t) => {
  const app = await build();
  t.after(() => app.close());
  
  // Register user first
  await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: 'wrongpass@example.com',
      password: 'Test1234'
    }
  });
  
  // Login with wrong password
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      email: 'wrongpass@example.com',
      password: 'WrongPassword'
    }
  });
  
  assert.strictEqual(response.statusCode, 401);
  const body = JSON.parse(response.body);
  assert.ok(body.error.includes('Invalid email or password'));
});
```

### Frontend: AuthService Tests
```typescript
// apps/frontend/src/app/services/auth.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);
    
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy }
      ]
    });
    
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    
    // Clear storage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('register', () => {
    it('should call registration endpoint', async () => {
      const mockResponse = { userId: '123', email: 'test@example.com' };
      
      const promise = service.register('test@example.com', 'Test1234');
      
      const req = httpMock.expectOne('/api/auth/register');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        email: 'test@example.com',
        password: 'Test1234'
      });
      
      req.flush(mockResponse);
      
      const result = await promise;
      expect(result).toEqual(mockResponse);
    });
  });

  describe('login', () => {
    it('should store tokens and update state', async () => {
      const mockResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        userId: '123',
        email: 'test@example.com'
      };
      
      const promise = service.login('test@example.com', 'Test1234', false);
      
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(mockResponse);
      
      await promise;
      
      // Check session storage (rememberMe = false)
      const stored = sessionStorage.getItem('auth_tokens');
      expect(stored).toBeTruthy();
      const tokens = JSON.parse(stored!);
      expect(tokens.accessToken).toBe('access-token');
      expect(tokens.userId).toBe('123');
      
      // Check state
      expect(service.currentUser()).toEqual({
        userId: '123',
        email: 'test@example.com'
      });
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should use localStorage when rememberMe is true', async () => {
      const mockResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        userId: '123',
        email: 'test@example.com'
      };
      
      const promise = service.login('test@example.com', 'Test1234', true);
      
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(mockResponse);
      
      await promise;
      
      // Check localStorage
      const stored = localStorage.getItem('auth_tokens');
      expect(stored).toBeTruthy();
    });
  });

  describe('logout', () => {
    it('should clear tokens and reset state', async () => {
      // Setup: Store some tokens
      localStorage.setItem('auth_tokens', JSON.stringify({
        accessToken: 'token',
        refreshToken: 'refresh',
        userId: '123',
        email: 'test@example.com'
      }));
      service.currentUser.set({ userId: '123', email: 'test@example.com' });
      
      await service.logout();
      
      // Verify tokens cleared
      expect(localStorage.getItem('auth_tokens')).toBeNull();
      expect(sessionStorage.getItem('auth_tokens')).toBeNull();
      
      // Verify state reset
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      
      // Verify navigation
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });
});
```

### E2E: Login Flow Test
```typescript
// apps/frontend/e2e/auth.spec.ts (Playwright)

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should complete registration and login flow', async ({ page }) => {
    const uniqueEmail = `test-${Date.now()}@example.com`;
    
    // Go to registration page
    await page.goto('/register');
    
    // Fill out registration form
    await page.fill('#email', uniqueEmail);
    await page.fill('#password', 'Test1234');
    await page.fill('#confirmPassword', 'Test1234');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('.success-message')).toBeVisible();
    
    // Fill out login form
    await page.fill('#email', uniqueEmail);
    await page.fill('#password', 'Test1234');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('#email', 'nonexistent@example.com');
    await page.fill('#password', 'WrongPassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.server-error')).toBeVisible();
    await expect(page.locator('.server-error')).toContainText('Invalid email or password');
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login with returnUrl
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fdashboard/);
  });
});
```

## Progress Log
- [2025-12-13 21:45] Task created from feature-001 breakdown

## Related Files
- `apps/backend/src/__tests__/` - Backend test files
- `apps/frontend/src/app/**/*.spec.ts` - Frontend unit tests
- `apps/frontend/e2e/` - E2E test files

## Test Commands
```bash
# Backend tests
cd apps/backend
npm test

# Frontend unit tests
cd apps/frontend
npm test

# Frontend E2E tests
cd apps/frontend
npm run e2e

# Coverage reports
npm run test:coverage
```

## Coverage Goals
- Backend endpoints: 100%
- Frontend services: >90%
- Frontend components: >80%
- Overall: >80%

## Lessons Learned
[To be filled after completion]
