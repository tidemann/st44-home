/**
 * Frontend Testing Utilities
 *
 * Central export for all Angular testing utilities.
 *
 * @example
 * ```typescript
 * import {
 *   configureServiceTest,
 *   expectHttpPost,
 *   mockLoginResponse,
 * } from '@testing';
 * ```
 */

// TestBed configuration helpers
export {
  createMockRouter,
  configureServiceTest,
  configureComponentTest,
  getElement,
  queryElement,
  queryAllElements,
  detectChanges,
  setInputValue,
  clickElement,
  getTextContent,
  hasElement,
  hasClass,
  waitForCondition,
  type MockRouter,
  type ServiceTestConfig,
  type ServiceTestBed,
  type ComponentTestConfig,
  type ComponentTestBed,
} from './testbed-config';

// HTTP mocking utilities
export {
  expectHttpGet,
  expectHttpPost,
  expectHttpPut,
  expectHttpPatch,
  expectHttpDelete,
  expectHttpError,
  verifyNoOutstandingRequests,
  matchRequest,
  mockLoginResponse,
  mockRegisterResponse,
  mockHouseholdResponse,
  mockChildResponse,
  mockTaskResponse,
  mockErrorResponse,
  type ExpectHttpOptions,
  type MockLoginResponse,
  type MockRegisterResponse,
  type MockHouseholdResponse,
  type MockChildResponse,
  type MockTaskResponse,
  type MockErrorResponse,
} from './http-mocks';
