/**
 * HTTP Test Helpers
 *
 * Simplified HTTP client for integration tests using Fastify's inject method.
 * Reduces boilerplate for common HTTP operations in tests.
 */

import type { FastifyInstance, InjectOptions } from 'fastify';

export interface HttpResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string | string[] | undefined>;
  json<T = unknown>(): T;
}

export interface HttpClientOptions {
  auth?: string; // Bearer token
  headers?: Record<string, string>;
}

/**
 * HTTP Test Client
 * Wraps Fastify inject for cleaner test code
 */
export class HttpTestClient {
  constructor(private readonly app: FastifyInstance) {}

  /**
   * Make a GET request
   */
  async get(url: string, options: HttpClientOptions = {}): Promise<HttpResponse> {
    return this.request('GET', url, undefined, options);
  }

  /**
   * Make a POST request
   */
  async post<T = unknown>(
    url: string,
    payload?: T,
    options: HttpClientOptions = {},
  ): Promise<HttpResponse> {
    return this.request('POST', url, payload, options);
  }

  /**
   * Make a PUT request
   */
  async put<T = unknown>(
    url: string,
    payload?: T,
    options: HttpClientOptions = {},
  ): Promise<HttpResponse> {
    return this.request('PUT', url, payload, options);
  }

  /**
   * Make a PATCH request
   */
  async patch<T = unknown>(
    url: string,
    payload?: T,
    options: HttpClientOptions = {},
  ): Promise<HttpResponse> {
    return this.request('PATCH', url, payload, options);
  }

  /**
   * Make a DELETE request
   */
  async delete(url: string, options: HttpClientOptions = {}): Promise<HttpResponse> {
    return this.request('DELETE', url, undefined, options);
  }

  /**
   * Make a request with full control
   */
  private async request(
    method: string,
    url: string,
    payload?: unknown,
    options: HttpClientOptions = {},
  ): Promise<HttpResponse> {
    const injectOptions: InjectOptions = {
      method,
      url,
      headers: {
        ...options.headers,
      },
    };

    // Add authorization header if token provided
    if (options.auth) {
      injectOptions.headers = {
        ...injectOptions.headers,
        Authorization: `Bearer ${options.auth}`,
      };
    }

    // Add payload if provided
    if (payload !== undefined) {
      injectOptions.payload = payload;
    }

    const response = await this.app.inject(injectOptions);

    return {
      statusCode: response.statusCode,
      body: response.body,
      headers: response.headers,
      json<T = unknown>(): T {
        return JSON.parse(response.body) as T;
      },
    };
  }
}

/**
 * Create HTTP test client for an app
 */
export function createHttpClient(app: FastifyInstance): HttpTestClient {
  return new HttpTestClient(app);
}

/**
 * Helper to assert successful response and parse JSON
 */
export function expectSuccess<T = unknown>(response: HttpResponse, statusCode = 200): T {
  if (response.statusCode !== statusCode) {
    throw new Error(`Expected status ${statusCode}, got ${response.statusCode}: ${response.body}`);
  }
  return response.json<T>();
}

/**
 * Helper to assert error response
 */
export function expectError(
  response: HttpResponse,
  expectedStatus: number,
  messageContains?: string,
): void {
  if (response.statusCode !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.statusCode}: ${response.body}`,
    );
  }

  if (messageContains) {
    const body = response.json<{ error: string }>();
    if (!body.error.toLowerCase().includes(messageContains.toLowerCase())) {
      throw new Error(
        `Expected error message to contain '${messageContains}', got '${body.error}'`,
      );
    }
  }
}
