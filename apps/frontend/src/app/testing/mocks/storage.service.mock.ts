/**
 * Mock StorageService for testing
 *
 * Provides an in-memory storage implementation for testing
 * components that use localStorage/sessionStorage.
 *
 * @example
 * const mockStorage = createMockStorageService();
 * mockStorage.set('key', 'value');
 *
 * TestBed.configureTestingModule({
 *   providers: [{ provide: StorageService, useValue: mockStorage }]
 * });
 */

import { vi } from 'vitest';

export interface MockStorageService {
  storage: Map<string, string>;
  get: ReturnType<typeof vi.fn>;
  getString: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  has: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock StorageService with in-memory storage
 */
export function createMockStorageService(
  initialData: Record<string, unknown> = {},
): MockStorageService {
  const storage = new Map<string, string>();

  // Initialize with provided data
  for (const [key, value] of Object.entries(initialData)) {
    storage.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  }

  const mockService: MockStorageService = {
    storage,

    get: vi.fn((key: string) => {
      const value = storage.get(key);
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }),

    getString: vi.fn((key: string) => {
      return storage.get(key) ?? null;
    }),

    set: vi.fn((key: string, value: unknown) => {
      storage.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    }),

    remove: vi.fn((key: string) => {
      storage.delete(key);
    }),

    clear: vi.fn(() => {
      storage.clear();
    }),

    has: vi.fn((key: string) => {
      return storage.has(key);
    }),
  };

  return mockService;
}

/**
 * Create a mock StorageService with common app data pre-populated
 */
export function createMockStorageServiceWithDefaults(
  overrides: Record<string, unknown> = {},
): MockStorageService {
  return createMockStorageService({
    activeHouseholdId: 'household-123',
    tasksFilter: 'all',
    ...overrides,
  });
}

/**
 * Pre-populate storage with data
 */
export function populateMockStorage(
  service: MockStorageService,
  data: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(data)) {
    service.storage.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
}

/**
 * Clear all data from mock storage
 */
export function clearMockStorage(service: MockStorageService): void {
  service.storage.clear();
}
