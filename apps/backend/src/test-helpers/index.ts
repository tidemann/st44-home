/**
 * Test Helpers
 *
 * Central export for all test utilities.
 *
 * @example
 * ```typescript
 * import {
 *   setupTestDatabase,
 *   cleanupTestDatabase,
 *   createTestUser,
 *   createTestHousehold,
 *   assertStatusCode,
 * } from './test-helpers/index.ts';
 * ```
 */

// Database utilities
export {
  getTestPool,
  setupTestDatabase,
  cleanupTestDatabase,
  truncateAllTables,
  closeTestDatabase,
  query,
  getTestDbConfig,
} from './database.ts';

// Test fixtures
export {
  createTestUser,
  createTestHousehold,
  addHouseholdMember,
  createTestChild,
  createTestTask,
  createTestTaskAssignment,
  createTestInvitation,
  createCompleteTestSetup,
  generateTestEmail,
  generateTestName,
  type TestUser,
  type TestHousehold,
  type TestHouseholdMember,
  type TestChild,
  type TestTask,
  type TestTaskAssignment,
  type TestInvitation,
  type CompleteTestSetup,
  type CreateTestUserOptions,
  type CreateTestHouseholdOptions,
  type AddHouseholdMemberOptions,
  type CreateTestChildOptions,
  type CreateTestTaskOptions,
  type CreateTestTaskAssignmentOptions,
  type CreateTestInvitationOptions,
  type CreateCompleteTestSetupOptions,
} from './fixtures.ts';

// Mock utilities
export {
  createMockQuery,
  createMockPool,
  createMockBcrypt,
  createMockJwt,
  createMockRequest,
  createMockReply,
  createMockUser,
  createMockHousehold,
  createMockChild,
  resetAllMocks,
  verifyMockCalledWith,
  getMockCallCount,
  getMockCallArgs,
  type MockQueryResult,
  type MockPool,
  type MockClient,
  type MockBcrypt,
  type MockJwt,
  type MockFastifyRequest,
  type MockFastifyReply,
  type MockUser,
  type MockHousehold,
  type MockChild,
} from './mocks.ts';

// Assertion utilities
export {
  assertStatusCode,
  assertResponseBody,
  assertErrorResponse,
  assertUUID,
  assertJWT,
  assertEmail,
  assertISODate,
  assertArrayLength,
  assertArrayContains,
  assertHasProperties,
  assertRejects,
  assertDateWithin,
  assertRecentDate,
  assertDeepEqual,
  assertMatches,
  assertTruthy,
  assertFalsy,
} from './assertions.ts';
