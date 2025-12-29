/**
 * Type guard utility functions for safe type narrowing.
 * These functions help with runtime type checking and TypeScript type narrowing.
 */

/**
 * Checks if a value is defined (not null or undefined).
 * Useful for filtering arrays and narrowing types.
 *
 * @param value - Value to check
 * @returns True if value is not null or undefined
 *
 * @example
 * ```typescript
 * const items = [1, null, 2, undefined, 3];
 * const defined = items.filter(isDefined); // [1, 2, 3]
 * // Type is narrowed to number[]
 * ```
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Checks if a value is null or undefined.
 *
 * @param value - Value to check
 * @returns True if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Checks if a value is a string.
 *
 * @param value - Value to check
 * @returns True if value is a string
 *
 * @example
 * ```typescript
 * const value: unknown = 'hello';
 * if (isString(value)) {
 *   console.log(value.toUpperCase()); // TypeScript knows value is string
 * }
 * ```
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Checks if a value is a non-empty string.
 *
 * @param value - Value to check
 * @returns True if value is a string with length > 0
 */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

/**
 * Checks if a value is a number (excluding NaN).
 *
 * @param value - Value to check
 * @returns True if value is a finite number
 *
 * @example
 * ```typescript
 * isNumber(42);        // true
 * isNumber(3.14);      // true
 * isNumber(NaN);       // false
 * isNumber(Infinity);  // false
 * isNumber('42');      // false
 * ```
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Checks if a value is a positive number (> 0).
 *
 * @param value - Value to check
 * @returns True if value is a positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

/**
 * Checks if a value is a non-negative number (>= 0).
 *
 * @param value - Value to check
 * @returns True if value is zero or positive
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return isNumber(value) && value >= 0;
}

/**
 * Checks if a value is an integer.
 *
 * @param value - Value to check
 * @returns True if value is an integer
 */
export function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value);
}

/**
 * Checks if a value is a boolean.
 *
 * @param value - Value to check
 * @returns True if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Checks if a value is an array.
 *
 * @param value - Value to check
 * @returns True if value is an array
 *
 * @example
 * ```typescript
 * isArray([1, 2, 3]);  // true
 * isArray('hello');    // false
 * isArray({ 0: 'a' }); // false
 * ```
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Checks if a value is a non-empty array.
 *
 * @param value - Value to check
 * @returns True if value is an array with length > 0
 */
export function isNonEmptyArray<T>(value: T[] | null | undefined): value is T[] {
  return isArray(value) && value.length > 0;
}

/**
 * Checks if a value is an array of a specific type.
 *
 * @param value - Value to check
 * @param guard - Type guard function for array elements
 * @returns True if value is an array where all elements pass the guard
 *
 * @example
 * ```typescript
 * isArrayOf([1, 2, 3], isNumber);     // true
 * isArrayOf(['a', 'b'], isString);    // true
 * isArrayOf([1, 'a'], isNumber);      // false
 * ```
 */
export function isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return isArray(value) && value.every(guard);
}

/**
 * Checks if a value is a plain object (not null, not array).
 *
 * @param value - Value to check
 * @returns True if value is a plain object
 *
 * @example
 * ```typescript
 * isObject({});           // true
 * isObject({ a: 1 });     // true
 * isObject([]);           // false
 * isObject(null);         // false
 * isObject(new Date());   // false
 * ```
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Checks if a value is a function.
 *
 * @param value - Value to check
 * @returns True if value is a function
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

/**
 * Checks if a value is a Date object with a valid date.
 *
 * @param value - Value to check
 * @returns True if value is a valid Date
 *
 * @example
 * ```typescript
 * isDate(new Date());              // true
 * isDate(new Date('invalid'));     // false
 * isDate('2024-01-01');            // false
 * ```
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Checks if a value is a valid date string (ISO format or parseable).
 *
 * @param value - Value to check
 * @returns True if value is a string that can be parsed as a valid date
 */
export function isDateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Checks if a value is a Promise.
 *
 * @param value - Value to check
 * @returns True if value is a Promise
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return (
    value !== null &&
    typeof value === 'object' &&
    'then' in value &&
    typeof (value as { then: unknown }).then === 'function'
  );
}

/**
 * Checks if an object has a specific property.
 *
 * @param obj - Object to check
 * @param key - Property key
 * @returns True if object has the property
 *
 * @example
 * ```typescript
 * const obj = { name: 'John' };
 * if (hasProperty(obj, 'name')) {
 *   console.log(obj.name); // TypeScript knows 'name' exists
 * }
 * ```
 */
export function hasProperty<K extends PropertyKey>(
  obj: unknown,
  key: K,
): obj is Record<K, unknown> {
  return obj !== null && typeof obj === 'object' && key in obj;
}

/**
 * Checks if an object has a specific property with a specific type.
 *
 * @param obj - Object to check
 * @param key - Property key
 * @param guard - Type guard for the property value
 * @returns True if object has the property with the correct type
 *
 * @example
 * ```typescript
 * const obj: unknown = { id: '123' };
 * if (hasPropertyOfType(obj, 'id', isString)) {
 *   console.log(obj.id.toUpperCase()); // TypeScript knows obj.id is string
 * }
 * ```
 */
export function hasPropertyOfType<K extends PropertyKey, T>(
  obj: unknown,
  key: K,
  guard: (value: unknown) => value is T,
): obj is Record<K, T> {
  return hasProperty(obj, key) && guard(obj[key]);
}

/**
 * Type assertion helper that throws if condition is false.
 * Useful for runtime assertions with type narrowing.
 *
 * @param condition - Condition to check
 * @param message - Error message if condition is false
 *
 * @example
 * ```typescript
 * function processUser(user: User | null) {
 *   assertDefined(user, 'User is required');
 *   // TypeScript knows user is not null here
 *   console.log(user.name);
 * }
 * ```
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = 'Value is null or undefined',
): asserts value is T {
  if (!isDefined(value)) {
    throw new Error(message);
  }
}

/**
 * Type assertion helper for custom conditions.
 *
 * @param condition - Condition to check
 * @param message - Error message if condition is false
 */
export function assert(condition: boolean, message = 'Assertion failed'): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
