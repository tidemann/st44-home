/**
 * Mock ApiService for testing
 *
 * Provides a mock implementation of ApiService with vi.fn() spies
 * for all HTTP methods.
 *
 * @example
 * const mockApi = createMockApiService();
 * mockApi.get.mockResolvedValue({ data: 'test' });
 *
 * TestBed.configureTestingModule({
 *   providers: [{ provide: ApiService, useValue: mockApi }]
 * });
 */

import { vi } from 'vitest';

export interface MockApiService {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock ApiService with all methods as vi.fn() spies
 */
export function createMockApiService(): MockApiService {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  };
}

/**
 * Configure mock to resolve with data
 */
export function mockApiResponse<T>(mock: ReturnType<typeof vi.fn>, response: T): void {
  mock.mockResolvedValue(response);
}

/**
 * Configure mock to reject with error
 */
export function mockApiError(
  mock: ReturnType<typeof vi.fn>,
  error: Error | string = 'API Error',
): void {
  const err = typeof error === 'string' ? new Error(error) : error;
  mock.mockRejectedValue(err);
}

/**
 * Configure mock to resolve once then reject
 */
export function mockApiResponseThenError<T>(
  mock: ReturnType<typeof vi.fn>,
  response: T,
  error: Error | string = 'API Error',
): void {
  const err = typeof error === 'string' ? new Error(error) : error;
  mock.mockResolvedValueOnce(response).mockRejectedValueOnce(err);
}
