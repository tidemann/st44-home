/**
 * Testing Infrastructure - Centralized exports
 *
 * This module provides all testing utilities, fixtures, and mocks
 * for frontend component and service testing.
 *
 * @example
 * import {
 *   // Fixtures
 *   createMockTask,
 *   createMockAssignment,
 *   createMockChild,
 *
 *   // Component Harness
 *   createComponentHarness,
 *
 *   // Mock Services
 *   createMockApiService,
 *   createMockTaskService,
 *   createMockAuthService,
 *
 *   // Utilities
 *   delayedOf,
 *   waitForDomStable,
 * } from '../../testing';
 */

// =============================================================================
// Fixtures - Factory functions for test data
// =============================================================================
export {
  // ID Generation
  generateTestId,
  generateMockUuid,
  resetIdCounter,

  // Date Utilities
  todayDate,
  nowDatetime,
  dateOffset,

  // User Fixtures
  createMockUser,
  createMockUsers,

  // Household Fixtures
  createMockHousehold,
  createMockHouseholdMember,

  // Child Fixtures
  createMockChild,
  createMockChildren,

  // Task Fixtures
  createMockTask,
  createMockDailyTask,
  createMockWeeklyRotationTask,
  createMockRepeatingTask,
  createMockTasks,
  createMockInactiveTask,

  // Assignment Fixtures
  createMockAssignment,
  createMockPendingAssignment,
  createMockCompletedAssignment,
  createMockOverdueAssignment,
  createMockAssignments,
  createMockMixedAssignments,

  // Pagination Fixtures
  createMockPagination,

  // API Response Fixtures
  createMockTasksResponse,
  createMockAssignmentsResponse,
  createMockCompletionResponse,
} from './fixtures';

// =============================================================================
// Component Harness - Component testing utilities
// =============================================================================
export {
  createComponentHarness,
  createHarness,
  waitFor,
  flushMicrotasks,
  type ComponentHarness,
  type ComponentHarnessConfig,
} from './component-harness';

// =============================================================================
// Mock Services - All mock service implementations
// =============================================================================
export * from './mocks';

// =============================================================================
// Test Utilities - Common testing helpers
// =============================================================================
export {
  // Async Utilities
  delayedOf,
  delayedError,
  fakeDelay,
  flushAll,

  // Observable Helpers
  getObservableValue,
  getObservableError,
  expectObservableComplete,

  // DOM Utilities
  findAll,
  findOrFail,
  getTextContents,
  typeInInput,
  clickElement,
  pressKey,
  pressEnter,
  pressEscape,
  pressSpace,

  // Form Utilities
  fillForm,
  getFormValues,

  // Wait Utilities
  waitForAnimationFrame,
  wait,
  waitForDomStable,

  // Test Data Utilities
  range,
  pickRandom,
  mockDate,
  mockDateTime,
} from './utils';
