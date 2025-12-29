/**
 * Mock AuthService for testing
 *
 * Provides mock implementations for AuthService with configurable
 * authentication state and user data.
 *
 * @example
 * const mockAuth = createMockAuthService({ isAuthenticated: true });
 *
 * TestBed.configureTestingModule({
 *   providers: [{ provide: AuthService, useValue: mockAuth }]
 * });
 */

import { signal, computed } from '@angular/core';
import { vi } from 'vitest';
import { of, throwError } from 'rxjs';
import type { User } from '@st44/types';
import { createMockUser } from '../fixtures';

export interface MockAuthServiceState {
  isAuthenticated: boolean;
  currentUser: User | null;
  loading: boolean;
  error: string | null;
}

export interface MockAuthService {
  // Signals
  isAuthenticated: ReturnType<typeof signal<boolean>>;
  currentUser: ReturnType<typeof signal<User | null>>;
  loading: ReturnType<typeof signal<boolean>>;
  error: ReturnType<typeof signal<string | null>>;

  // Computed signals
  isLoggedIn: ReturnType<typeof computed<boolean>>;
  userId: ReturnType<typeof computed<string | undefined>>;
  userEmail: ReturnType<typeof computed<string | undefined>>;

  // Methods (as spies)
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  refreshToken: ReturnType<typeof vi.fn>;
  checkAuth: ReturnType<typeof vi.fn>;
  clearError: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock AuthService with configurable initial state
 */
export function createMockAuthService(
  initialState: Partial<MockAuthServiceState> = {},
): MockAuthService {
  const state = {
    isAuthenticated: initialState.isAuthenticated ?? false,
    currentUser: initialState.currentUser ?? null,
    loading: initialState.loading ?? false,
    error: initialState.error ?? null,
  };

  const isAuthenticatedSignal = signal<boolean>(state.isAuthenticated);
  const currentUserSignal = signal<User | null>(state.currentUser);
  const loadingSignal = signal<boolean>(state.loading);
  const errorSignal = signal<string | null>(state.error);

  return {
    // Signals
    isAuthenticated: isAuthenticatedSignal,
    currentUser: currentUserSignal,
    loading: loadingSignal,
    error: errorSignal,

    // Computed signals
    isLoggedIn: computed(() => isAuthenticatedSignal()),
    userId: computed(() => currentUserSignal()?.id),
    userEmail: computed(() => currentUserSignal()?.email),

    // Methods
    login: vi.fn().mockReturnValue(of(void 0)),
    logout: vi.fn().mockReturnValue(of(void 0)),
    register: vi.fn().mockReturnValue(of(void 0)),
    refreshToken: vi.fn().mockReturnValue(of(void 0)),
    checkAuth: vi.fn().mockReturnValue(of(state.isAuthenticated)),
    clearError: vi.fn(() => errorSignal.set(null)),
  };
}

/**
 * Create a mock AuthService with an authenticated user
 */
export function createAuthenticatedMockAuthService(
  userOverrides: Partial<User> = {},
): MockAuthService {
  const user = createMockUser(userOverrides);
  return createMockAuthService({
    isAuthenticated: true,
    currentUser: user,
  });
}

/**
 * Create a mock AuthService with an unauthenticated state
 */
export function createUnauthenticatedMockAuthService(): MockAuthService {
  return createMockAuthService({
    isAuthenticated: false,
    currentUser: null,
  });
}

/**
 * Configure login to succeed
 */
export function mockLoginSuccess(service: MockAuthService, user?: User): void {
  const mockUser = user ?? createMockUser();
  service.login.mockImplementation(() => {
    service.isAuthenticated.set(true);
    service.currentUser.set(mockUser);
    return of(void 0);
  });
}

/**
 * Configure login to fail
 */
export function mockLoginFailure(
  service: MockAuthService,
  errorMessage = 'Invalid credentials',
): void {
  service.login.mockImplementation(() => {
    service.error.set(errorMessage);
    return throwError(() => new Error(errorMessage));
  });
}

/**
 * Configure logout
 */
export function mockLogout(service: MockAuthService): void {
  service.logout.mockImplementation(() => {
    service.isAuthenticated.set(false);
    service.currentUser.set(null);
    return of(void 0);
  });
}
