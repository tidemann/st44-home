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
  createCompleteTestScenario,
  createHouseholdWithMembers,
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
  type CompleteTestScenario,
  type HouseholdWithMembers,
  type CreateTestUserOptions,
  type CreateTestHouseholdOptions,
  type AddHouseholdMemberOptions,
  type CreateTestChildOptions,
  type CreateTestTaskOptions,
  type CreateTestTaskAssignmentOptions,
  type CreateTestInvitationOptions,
  type CreateCompleteTestSetupOptions,
  type CreateCompleteScenarioOptions,
  type CreateHouseholdWithMembersOptions,
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

// HTTP test client
export {
  createHttpClient,
  expectSuccess,
  expectError,
  HttpTestClient,
  type HttpResponse,
  type HttpClientOptions,
} from './http.ts';

// Data generators
export {
  randomInt,
  randomElement,
  randomString,
  randomUUID,
  randomEmail,
  randomPassword,
  randomName,
  randomFullName,
  randomAge,
  randomBirthYear,
  randomHouseholdName,
  randomTaskName,
  randomTaskDescription,
  randomTaskFrequency,
  randomTaskPoints,
  randomDate,
  randomISODate,
  randomAssignmentStatus,
  randomHouseholdRole,
  generateUserTestData,
  generateHouseholdTestData,
  generateChildTestData,
  generateTaskTestData,
  type UserTestData,
  type HouseholdTestData,
  type ChildTestData,
  type TaskTestData,
} from './generators.ts';
