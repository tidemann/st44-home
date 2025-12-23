# Frontend Testing Utilities

Shared testing utilities for Angular components and services. These utilities reduce boilerplate and make tests easier to write and maintain.

## Installation

The testing utilities are available at `src/testing`:

```typescript
import {
  configureServiceTest,
  expectHttpPost,
  mockLoginResponse,
} from '../testing';
```

## Quick Start

### Service Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { configureServiceTest, expectHttpPost, mockLoginResponse } from '../testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    const testBed = configureServiceTest({
      service: AuthService,
    });
    service = testBed.service;
    httpMock = testBed.httpMock;
  });

  it('should login successfully', () => {
    const response = mockLoginResponse();

    service.login('test@example.com', 'password', false).subscribe({
      next: (result) => {
        expect(result).toEqual(response);
      },
    });

    expectHttpPost(
      httpMock,
      '/api/auth/login',
      { email: 'test@example.com', password: 'password' },
      response
    );
  });
});
```

### Component Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { configureComponentTest, setInputValue, clickElement } from '../testing';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(() => {
    const testBed = configureComponentTest({
      component: LoginComponent,
      imports: [/* your imports */],
    });
    component = testBed.component;
    fixture = testBed.fixture;
  });

  it('should submit login form', async () => {
    await setInputValue(fixture, 'input[type="email"]', 'test@example.com');
    await setInputValue(fixture, 'input[type="password"]', 'password');
    await clickElement(fixture, 'button[type="submit"]');

    expect(component.submitted).toBe(true);
  });
});
```

## API Reference

### TestBed Configuration

#### `configureServiceTest<T>(config)`

Configure TestBed for service testing with automatic HTTP mock setup.

```typescript
const { service, httpMock, mockRouter } = configureServiceTest({
  service: AuthService,
  mocks: { Router: createMockRouter() },
  providers: [/* additional providers */],
});
```

**Parameters:**
- `service` - Service class to test
- `mocks?` - Mock objects (e.g., Router)
- `providers?` - Additional providers

**Returns:**
- `service` - Injected service instance
- `httpMock` - HttpTestingController for mocking HTTP requests
- `mockRouter?` - Mock router if provided in mocks

#### `configureComponentTest<T>(config)`

Configure TestBed for component testing.

```typescript
const { fixture, component, element, httpMock } = configureComponentTest({
  component: LoginComponent,
  imports: [ReactiveFormsModule],
  providers: [AuthService],
});
```

**Parameters:**
- `component` - Component class to test
- `imports?` - Module imports
- `providers?` - Service providers
- `declarations?` - Component declarations (if needed)

**Returns:**
- `fixture` - ComponentFixture
- `component` - Component instance
- `element` - Native HTML element
- `httpMock?` - HttpTestingController (if HTTP is configured)

### Component Helpers

#### `setInputValue<T>(fixture, selector, value)`

Set input value and trigger events.

```typescript
await setInputValue(fixture, 'input[type="email"]', 'test@example.com');
```

#### `clickElement<T>(fixture, selector)`

Click element and detect changes.

```typescript
await clickElement(fixture, 'button[type="submit"]');
```

#### `getTextContent<T>(fixture, selector)`

Get text content of element.

```typescript
const text = getTextContent(fixture, '.error-message');
expect(text).toBe('Invalid credentials');
```

#### `hasElement<T>(fixture, selector)`

Check if element exists.

```typescript
expect(hasElement(fixture, '.success-message')).toBe(true);
```

#### `hasClass<T>(fixture, selector, className)`

Check if element has class.

```typescript
expect(hasClass(fixture, 'button', 'disabled')).toBe(true);
```

### HTTP Mocking

#### `expectHttpPost(httpMock, url, expectedBody, response)`

Expect POST request and flush response.

```typescript
expectHttpPost(
  httpMock,
  '/api/auth/login',
  { email: 'test@example.com', password: 'password' },
  mockLoginResponse()
);
```

#### `expectHttpGet(httpMock, url, response)`

Expect GET request and flush response.

```typescript
expectHttpGet(httpMock, '/api/households', [mockHouseholdResponse()]);
```

#### `expectHttpPut(httpMock, url, expectedBody, response)`

Expect PUT request and flush response.

```typescript
expectHttpPut(
  httpMock,
  '/api/households/123',
  { name: 'Updated Name' },
  mockHouseholdResponse()
);
```

#### `expectHttpError(httpMock, url, status, statusText, error?)`

Expect HTTP error response.

```typescript
expectHttpError(
  httpMock,
  '/api/auth/login',
  401,
  'Unauthorized',
  mockErrorResponse('Invalid credentials')
);
```

### Mock Response Factories

#### `mockLoginResponse(overrides?)`

Create mock login response.

```typescript
const response = mockLoginResponse({
  user: { id: '456', email: 'custom@example.com' },
});
```

#### `mockRegisterResponse(overrides?)`

Create mock registration response.

```typescript
const response = mockRegisterResponse();
```

#### `mockHouseholdResponse(overrides?)`

Create mock household response.

```typescript
const household = mockHouseholdResponse({
  name: 'Custom Household',
  role: 'owner',
});
```

#### `mockChildResponse(overrides?)`

Create mock child response.

```typescript
const child = mockChildResponse({
  name: 'Emma',
  age: 10,
});
```

#### `mockTaskResponse(overrides?)`

Create mock task response.

```typescript
const task = mockTaskResponse({
  title: 'Clean room',
  points: 20,
});
```

#### `mockErrorResponse(message)`

Create mock error response.

```typescript
const error = mockErrorResponse('Something went wrong');
```

### Mock Router

#### `createMockRouter(initialUrl?)`

Create mock router for testing.

```typescript
const mockRouter = createMockRouter('/dashboard');

// In test
mockRouter.navigate.mockResolvedValue(true);
expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
```

## Best Practices

### 1. Clear Storage Before Each Test

The `configureServiceTest` and `configureComponentTest` helpers automatically clear `localStorage` and `sessionStorage` before each test.

### 2. Verify No Outstanding HTTP Requests

Always verify no outstanding requests at the end of HTTP tests:

```typescript
import { verifyNoOutstandingRequests } from '../testing';

afterEach(() => {
  verifyNoOutstandingRequests(httpMock);
});
```

### 3. Use Mock Factories

Use mock response factories instead of hardcoding responses:

```typescript
// GOOD
const response = mockLoginResponse({ user: { id: '123', email: 'test@example.com' } });

// AVOID
const response = {
  message: 'Login successful',
  user: { id: '123', email: 'test@example.com' },
  accessToken: 'token',
  refreshToken: 'refresh',
};
```

### 4. Async Change Detection

Always await `detectChanges()` when testing async operations:

```typescript
await setInputValue(fixture, 'input', 'value');
await clickElement(fixture, 'button');
await fixture.whenStable();
```

### 5. Test Isolation

Each test should be independent. Don't rely on state from previous tests:

```typescript
beforeEach(() => {
  // Fresh setup for each test
  const testBed = configureServiceTest({ service: MyService });
  service = testBed.service;
});
```

## Migration Guide

### Before (Without Utilities)

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should login', () => {
    const mockResponse = {
      message: 'Login successful',
      user: { id: '123', email: 'test@example.com' },
      accessToken: 'token',
      refreshToken: 'refresh',
    };

    service.login('test@example.com', 'password', false).subscribe({
      next: (response) => {
        expect(response).toEqual(mockResponse);
      },
    });

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'test@example.com', password: 'password' });
    req.flush(mockResponse);
    httpMock.verify();
  });
});
```

### After (With Utilities)

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    const testBed = configureServiceTest({ service: AuthService });
    service = testBed.service;
    httpMock = testBed.httpMock;
  });

  it('should login', () => {
    service.login('test@example.com', 'password', false).subscribe({
      next: (response) => {
        expect(response).toEqual(mockLoginResponse());
      },
    });

    expectHttpPost(
      httpMock,
      '/api/auth/login',
      { email: 'test@example.com', password: 'password' },
      mockLoginResponse()
    );
  });
});
```

**Code Reduction**: ~40 lines → ~20 lines (50% reduction)

## Examples

See these test files for real-world examples:
- `src/app/services/auth.service.spec.ts` - Service testing
- `src/app/auth/login.component.spec.ts` - Component testing
- `src/app/components/task-list/task-list.component.spec.ts` - Component with HTTP

## Troubleshooting

### "HttpTestingController not found"

Make sure you're using `configureServiceTest` or `configureComponentTest` which automatically provides HTTP testing.

### "Cannot read property of undefined"

Ensure you're calling `beforeEach` to set up the test environment before each test.

### "Expected one matching request for criteria, found none"

Check that the URL in `expectHttp*` matches exactly what your service is calling. Use browser dev tools or console logs to debug.

### "Verify failed: unexpected requests found"

You have unmocked HTTP requests. Either mock them with `expectHttp*` or remove the `verifyNoOutstandingRequests` call if testing non-HTTP code.
