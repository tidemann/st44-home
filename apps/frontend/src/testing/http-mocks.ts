/**
 * HTTP Mocking Utilities for Angular Tests
 *
 * Simplifies HTTP request mocking with HttpTestingController
 */

import type { HttpTestingController } from '@angular/common/http/testing';
import type { HttpRequest } from '@angular/common/http';

/**
 * Expect and flush an HTTP request
 */
export interface ExpectHttpOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Expect GET request and flush response
 */
export function expectHttpGet<T>(
  httpMock: HttpTestingController,
  url: string,
  response: T,
  options?: Omit<ExpectHttpOptions, 'method'>,
): void {
  const req = httpMock.expectOne(url);
  expect(req.request.method).toBe('GET');

  if (options?.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      expect(req.request.headers.get(key)).toBe(value);
    }
  }

  req.flush(response);
}

/**
 * Expect POST request and flush response
 */
export function expectHttpPost<T, B = unknown>(
  httpMock: HttpTestingController,
  url: string,
  expectedBody: B,
  response: T,
  options?: Omit<ExpectHttpOptions, 'method' | 'body'>,
): void {
  const req = httpMock.expectOne(url);
  expect(req.request.method).toBe('POST');
  expect(req.request.body).toEqual(expectedBody);

  if (options?.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      expect(req.request.headers.get(key)).toBe(value);
    }
  }

  req.flush(response);
}

/**
 * Expect PUT request and flush response
 */
export function expectHttpPut<T, B = unknown>(
  httpMock: HttpTestingController,
  url: string,
  expectedBody: B,
  response: T,
  options?: Omit<ExpectHttpOptions, 'method' | 'body'>,
): void {
  const req = httpMock.expectOne(url);
  expect(req.request.method).toBe('PUT');
  expect(req.request.body).toEqual(expectedBody);

  if (options?.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      expect(req.request.headers.get(key)).toBe(value);
    }
  }

  req.flush(response);
}

/**
 * Expect PATCH request and flush response
 */
export function expectHttpPatch<T, B = unknown>(
  httpMock: HttpTestingController,
  url: string,
  expectedBody: B,
  response: T,
  options?: Omit<ExpectHttpOptions, 'method' | 'body'>,
): void {
  const req = httpMock.expectOne(url);
  expect(req.request.method).toBe('PATCH');
  expect(req.request.body).toEqual(expectedBody);

  if (options?.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      expect(req.request.headers.get(key)).toBe(value);
    }
  }

  req.flush(response);
}

/**
 * Expect DELETE request and flush response
 */
export function expectHttpDelete<T>(
  httpMock: HttpTestingController,
  url: string,
  response: T,
  options?: Omit<ExpectHttpOptions, 'method'>,
): void {
  const req = httpMock.expectOne(url);
  expect(req.request.method).toBe('DELETE');

  if (options?.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      expect(req.request.headers.get(key)).toBe(value);
    }
  }

  req.flush(response);
}

/**
 * Expect HTTP error
 */
export function expectHttpError(
  httpMock: HttpTestingController,
  url: string,
  status: number,
  statusText: string,
  error?: unknown,
): void {
  const req = httpMock.expectOne(url);
  req.flush(error ?? { error: statusText }, { status, statusText });
}

/**
 * Verify no outstanding HTTP requests
 */
export function verifyNoOutstandingRequests(httpMock: HttpTestingController): void {
  httpMock.verify();
}

/**
 * Match HTTP request by URL and method
 */
export function matchRequest(url: string, method: string): (req: HttpRequest<unknown>) => boolean {
  return (req) => req.url === url && req.method === method;
}

/**
 * Mock successful login response
 */
export interface MockLoginResponse {
  message: string;
  user: {
    id: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
}

export function mockLoginResponse(overrides?: Partial<MockLoginResponse>): MockLoginResponse {
  return {
    message: 'Login successful',
    user: {
      id: '123',
      email: 'test@example.com',
    },
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    ...overrides,
  };
}

/**
 * Mock successful registration response
 */
export interface MockRegisterResponse {
  message: string;
  user: {
    id: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
}

export function mockRegisterResponse(
  overrides?: Partial<MockRegisterResponse>,
): MockRegisterResponse {
  return {
    message: 'User registered successfully',
    user: {
      id: '123',
      email: 'test@example.com',
    },
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    ...overrides,
  };
}

/**
 * Mock household response
 */
export interface MockHouseholdResponse {
  id: string;
  name: string;
  role: string;
}

export function mockHouseholdResponse(
  overrides?: Partial<MockHouseholdResponse>,
): MockHouseholdResponse {
  return {
    id: 'household-123',
    name: 'Test Household',
    role: 'admin',
    ...overrides,
  };
}

/**
 * Mock child response
 */
export interface MockChildResponse {
  id: string;
  householdId: string;
  name: string;
  age: number | null;
  avatarUrl: string | null;
}

export function mockChildResponse(overrides?: Partial<MockChildResponse>): MockChildResponse {
  return {
    id: 'child-123',
    householdId: 'household-123',
    name: 'Test Child',
    age: 10,
    avatarUrl: null,
    ...overrides,
  };
}

/**
 * Mock task response
 */
export interface MockTaskResponse {
  id: string;
  householdId: string;
  title: string;
  description: string | null;
  frequency: string;
  points: number;
}

export function mockTaskResponse(overrides?: Partial<MockTaskResponse>): MockTaskResponse {
  return {
    id: 'task-123',
    householdId: 'household-123',
    title: 'Test Task',
    description: 'Test description',
    frequency: 'daily',
    points: 10,
    ...overrides,
  };
}

/**
 * Mock error response
 */
export interface MockErrorResponse {
  error: string;
}

export function mockErrorResponse(message: string): MockErrorResponse {
  return {
    error: message,
  };
}
