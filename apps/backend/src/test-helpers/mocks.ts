/**
 * Mocking Utilities
 *
 * Provides mock utilities for external dependencies in unit tests.
 * Uses Node.js native mock module (Node 20+).
 */

import { mock, type Mock } from 'node:test';

/**
 * Mock database query result
 */
export interface MockQueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
  command?: string;
}

/**
 * Create a mock query function
 */
export function createMockQuery<T = unknown>(
  defaultResult: MockQueryResult<T> = { rows: [], rowCount: 0 },
): Mock<(text: string, params?: unknown[]) => Promise<MockQueryResult<T>>> {
  return mock.fn(async () => defaultResult);
}

/**
 * Create a mock database pool
 */
export interface MockPool {
  query: Mock<(text: string, params?: unknown[]) => Promise<MockQueryResult>>;
  connect: Mock<() => Promise<MockClient>>;
  end: Mock<() => Promise<void>>;
}

export interface MockClient {
  query: Mock<(text: string, params?: unknown[]) => Promise<MockQueryResult>>;
  release: Mock<() => void>;
}

export function createMockPool(): MockPool {
  const mockClient: MockClient = {
    query: mock.fn(async () => ({ rows: [], rowCount: 0 })),
    release: mock.fn(() => {}),
  };

  return {
    query: mock.fn(async () => ({ rows: [], rowCount: 0 })),
    connect: mock.fn(async () => mockClient),
    end: mock.fn(async () => {}),
  };
}

/**
 * Mock bcrypt utilities
 */
export interface MockBcrypt {
  hash: Mock<(password: string, rounds: number) => Promise<string>>;
  compare: Mock<(password: string, hash: string) => Promise<boolean>>;
}

export function createMockBcrypt(
  options: {
    compareResult?: boolean;
    hashResult?: string;
  } = {},
): MockBcrypt {
  return {
    hash: mock.fn(async () => options.hashResult ?? '$2b$10$mockedhashvalue'),
    compare: mock.fn(async () => options.compareResult ?? true),
  };
}

/**
 * Mock JWT utilities
 */
export interface MockJwt {
  sign: Mock<(payload: object, secret: string, options?: object) => string>;
  verify: Mock<(token: string, secret: string) => object>;
}

export function createMockJwt(
  options: {
    verifyResult?: object;
    signResult?: string;
  } = {},
): MockJwt {
  return {
    sign: mock.fn(() => options.signResult ?? 'mock.jwt.token'),
    verify: mock.fn(() => options.verifyResult ?? { userId: '123', email: 'test@example.com' }),
  };
}

/**
 * Mock Fastify request
 */
export interface MockFastifyRequest {
  body: unknown;
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string | undefined>;
  user?: { userId: string; email: string };
}

export function createMockRequest(overrides: Partial<MockFastifyRequest> = {}): MockFastifyRequest {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  };
}

/**
 * Mock Fastify reply
 */
export interface MockFastifyReply {
  code: Mock<(statusCode: number) => MockFastifyReply>;
  send: Mock<(payload?: unknown) => MockFastifyReply>;
  statusCode: number;
  sentPayload: unknown;
}

export function createMockReply(): MockFastifyReply {
  const reply: MockFastifyReply = {
    statusCode: 200,
    sentPayload: undefined,
    code: mock.fn((statusCode: number) => {
      reply.statusCode = statusCode;
      return reply;
    }),
    send: mock.fn((payload?: unknown) => {
      reply.sentPayload = payload;
      return reply;
    }),
  };
  return reply;
}

/**
 * Create mock user data
 */
export interface MockUser {
  id: string;
  email: string;
  password_hash: string;
  google_id?: string | null;
  created_at: Date;
  updated_at: Date;
}

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: '$2b$10$mockpasswordhash',
    google_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Create mock household data
 */
export interface MockHousehold {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export function createMockHousehold(overrides: Partial<MockHousehold> = {}): MockHousehold {
  return {
    id: 'household-123',
    name: 'Test Household',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Create mock child data
 */
export interface MockChild {
  id: string;
  household_id: string;
  name: string;
  age: number | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export function createMockChild(overrides: Partial<MockChild> = {}): MockChild {
  return {
    id: 'child-123',
    household_id: 'household-123',
    name: 'Test Child',
    age: 10,
    avatar_url: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Reset all mocks
 */
export function resetAllMocks(...mocks: Mock<unknown>[]): void {
  for (const m of mocks) {
    m.mock.resetCalls();
  }
}

/**
 * Verify mock was called with specific arguments
 */
export function verifyMockCalledWith<T extends unknown[]>(
  mockFn: Mock<(...args: T) => unknown>,
  expectedArgs: T,
  callIndex = 0,
): boolean {
  const calls = mockFn.mock.calls;
  if (calls.length <= callIndex) {
    return false;
  }
  const actualArgs = calls[callIndex].arguments;
  return JSON.stringify(actualArgs) === JSON.stringify(expectedArgs);
}

/**
 * Get mock call count
 */
export function getMockCallCount(mockFn: Mock<unknown>): number {
  return mockFn.mock.calls.length;
}

/**
 * Get mock call arguments
 */
export function getMockCallArgs(mockFn: Mock<unknown>, callIndex = 0): unknown[] {
  const calls = mockFn.mock.calls;
  if (calls.length <= callIndex) {
    return [];
  }
  return calls[callIndex].arguments;
}
