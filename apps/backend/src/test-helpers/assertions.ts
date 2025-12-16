/**
 * Test Assertion Utilities
 *
 * Common assertion helpers for integration and unit tests.
 */

import assert from 'node:assert';

/**
 * Assert that a response has the expected status code
 */
export function assertStatusCode(
  response: { statusCode: number },
  expected: number,
  message?: string,
): void {
  assert.strictEqual(
    response.statusCode,
    expected,
    message ?? `Expected status ${expected}, got ${response.statusCode}`,
  );
}

/**
 * Assert that a response body contains expected properties
 */
export function assertResponseBody<T extends Record<string, unknown>>(
  response: { body: string },
  expectedProperties: (keyof T)[],
): T {
  const body = JSON.parse(response.body) as T;

  for (const prop of expectedProperties) {
    assert.ok(prop in body, `Expected response to have property '${String(prop)}'`);
  }

  return body;
}

/**
 * Assert that a response is an error with expected message
 */
export function assertErrorResponse(
  response: { statusCode: number; body: string },
  expectedStatus: number,
  messageContains?: string,
): void {
  assertStatusCode(response, expectedStatus);

  const body = JSON.parse(response.body);
  assert.ok(body.error, 'Expected response to have error property');

  if (messageContains) {
    assert.ok(
      body.error.toLowerCase().includes(messageContains.toLowerCase()),
      `Expected error message to contain '${messageContains}', got '${body.error}'`,
    );
  }
}

/**
 * Assert that a value is a valid UUID
 */
export function assertUUID(value: unknown, message?: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.ok(
    typeof value === 'string' && uuidRegex.test(value),
    message ?? `Expected UUID, got '${value}'`,
  );
}

/**
 * Assert that a value is a valid JWT token
 */
export function assertJWT(value: unknown, message?: string): void {
  const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/;
  assert.ok(
    typeof value === 'string' && jwtRegex.test(value),
    message ?? `Expected JWT token, got '${value}'`,
  );
}

/**
 * Assert that a value is a valid email
 */
export function assertEmail(value: unknown, message?: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  assert.ok(
    typeof value === 'string' && emailRegex.test(value),
    message ?? `Expected email, got '${value}'`,
  );
}

/**
 * Assert that a value is a valid ISO date string
 */
export function assertISODate(value: unknown, message?: string): void {
  assert.ok(
    typeof value === 'string' && !isNaN(Date.parse(value)),
    message ?? `Expected ISO date string, got '${value}'`,
  );
}

/**
 * Assert that an array has expected length
 */
export function assertArrayLength<T>(array: T[], expected: number, message?: string): void {
  assert.strictEqual(
    array.length,
    expected,
    message ?? `Expected array length ${expected}, got ${array.length}`,
  );
}

/**
 * Assert that an array contains an item matching predicate
 */
export function assertArrayContains<T>(
  array: T[],
  predicate: (item: T) => boolean,
  message?: string,
): T {
  const item = array.find(predicate);
  assert.ok(item, message ?? 'Expected array to contain matching item');
  return item;
}

/**
 * Assert that an object has all expected properties
 */
export function assertHasProperties<T extends Record<string, unknown>>(
  obj: T,
  properties: string[],
  message?: string,
): void {
  for (const prop of properties) {
    assert.ok(prop in obj, message ?? `Expected object to have property '${prop}'`);
  }
}

/**
 * Assert that a promise rejects with expected error
 */
export async function assertRejects(
  promise: Promise<unknown>,
  errorMessageContains?: string,
): Promise<Error> {
  try {
    await promise;
    assert.fail('Expected promise to reject');
  } catch (error) {
    if (error instanceof assert.AssertionError) throw error;
    if (!(error instanceof Error)) throw error;

    if (errorMessageContains) {
      assert.ok(
        error.message.toLowerCase().includes(errorMessageContains.toLowerCase()),
        `Expected error message to contain '${errorMessageContains}', got '${error.message}'`,
      );
    }

    return error;
  }
}

/**
 * Assert that a date is within expected range
 */
export function assertDateWithin(
  date: Date | string,
  minDate: Date,
  maxDate: Date,
  message?: string,
): void {
  const d = typeof date === 'string' ? new Date(date) : date;
  assert.ok(
    d >= minDate && d <= maxDate,
    message ??
      `Expected date ${d.toISOString()} to be between ${minDate.toISOString()} and ${maxDate.toISOString()}`,
  );
}

/**
 * Assert that a date is recent (within last N seconds)
 */
export function assertRecentDate(date: Date | string, withinSeconds = 60, message?: string): void {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const minDate = new Date(now.getTime() - withinSeconds * 1000);

  assert.ok(
    d >= minDate && d <= now,
    message ?? `Expected date ${d.toISOString()} to be within last ${withinSeconds} seconds`,
  );
}

/**
 * Assert deep equality with better error messages
 */
export function assertDeepEqual<T>(actual: T, expected: T, message?: string): void {
  try {
    assert.deepStrictEqual(actual, expected);
  } catch (error) {
    if (error instanceof assert.AssertionError) {
      const actualStr = JSON.stringify(actual, null, 2);
      const expectedStr = JSON.stringify(expected, null, 2);
      throw new assert.AssertionError({
        message:
          message ??
          `Deep equality assertion failed:\nActual: ${actualStr}\nExpected: ${expectedStr}`,
        actual,
        expected,
      });
    }
    throw error;
  }
}

/**
 * Assert that a string matches a pattern
 */
export function assertMatches(value: string, pattern: RegExp, message?: string): void {
  assert.ok(pattern.test(value), message ?? `Expected '${value}' to match ${pattern}`);
}

/**
 * Assert that a value is truthy
 */
export function assertTruthy<T>(value: T, message?: string): asserts value is NonNullable<T> {
  assert.ok(value, message ?? `Expected truthy value, got ${value}`);
}

/**
 * Assert that a value is falsy
 */
export function assertFalsy(value: unknown, message?: string): void {
  assert.ok(!value, message ?? `Expected falsy value, got ${value}`);
}
