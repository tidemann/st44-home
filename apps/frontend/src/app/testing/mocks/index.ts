/**
 * Mock Services - Centralized exports for all mock services
 *
 * @example
 * import {
 *   createMockApiService,
 *   createMockTaskService,
 *   createMockAuthService,
 *   createMockStorageService,
 *   createMockRouter
 * } from '../../testing/mocks';
 */

// API Service Mock
export {
  createMockApiService,
  mockApiResponse,
  mockApiError,
  mockApiResponseThenError,
  type MockApiService,
} from './api.service.mock';

// Task Service Mock
export {
  createMockTaskService,
  mockGetTasks,
  mockGetAssignments,
  mockCompleteTaskSuccess,
  mockTaskServiceError,
  type MockTaskService,
  type MockTaskServiceState,
} from './task.service.mock';

// Auth Service Mock
export {
  createMockAuthService,
  createAuthenticatedMockAuthService,
  createUnauthenticatedMockAuthService,
  mockLoginSuccess,
  mockLoginFailure,
  mockLogout,
  type MockAuthService,
  type MockAuthServiceState,
} from './auth.service.mock';

// Storage Service Mock
export {
  createMockStorageService,
  createMockStorageServiceWithDefaults,
  populateMockStorage,
  clearMockStorage,
  type MockStorageService,
} from './storage.service.mock';

// Router Mock
export {
  createMockRouter,
  createMockActivatedRoute,
  createMockRouterAndRoute,
  createMockParamMap,
  updateRouteParams,
  updateRouteQueryParams,
  type MockRouter,
  type MockActivatedRoute,
  type MockParamMap,
} from './router.mock';
