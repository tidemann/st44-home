import { describe, it, expect } from 'vitest';
import {
  isDefined,
  isNullish,
  isString,
  isNonEmptyString,
  isNumber,
  isPositiveNumber,
  isNonNegativeNumber,
  isInteger,
  isBoolean,
  isArray,
  isNonEmptyArray,
  isArrayOf,
  isObject,
  isFunction,
  isDate,
  isDateString,
  isPromise,
  hasProperty,
  hasPropertyOfType,
  assertDefined,
  assert,
} from './type-guards';

describe('Type guards', () => {
  describe('isDefined', () => {
    it('should return true for defined values', () => {
      expect(isDefined(0)).toBe(true);
      expect(isDefined('')).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined([])).toBe(true);
      expect(isDefined({})).toBe(true);
    });

    it('should return false for null and undefined', () => {
      expect(isDefined(null)).toBe(false);
      expect(isDefined(undefined)).toBe(false);
    });

    it('should work as array filter', () => {
      const items = [1, null, 2, undefined, 3];
      const result = items.filter(isDefined);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('isNullish', () => {
    it('should return true for null and undefined', () => {
      expect(isNullish(null)).toBe(true);
      expect(isNullish(undefined)).toBe(true);
    });

    it('should return false for other values', () => {
      expect(isNullish(0)).toBe(false);
      expect(isNullish('')).toBe(false);
      expect(isNullish(false)).toBe(false);
    });
  });

  describe('isString', () => {
    it('should return true for strings', () => {
      expect(isString('')).toBe(true);
      expect(isString('hello')).toBe(true);
      expect(isString(String('test'))).toBe(true);
    });

    it('should return false for non-strings', () => {
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString([])).toBe(false);
      expect(isString({})).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString(' ')).toBe(true);
    });

    it('should return false for empty strings', () => {
      expect(isNonEmptyString('')).toBe(false);
    });

    it('should return false for non-strings', () => {
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('should return true for finite numbers', () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(42)).toBe(true);
      expect(isNumber(-42)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
    });

    it('should return false for NaN', () => {
      expect(isNumber(NaN)).toBe(false);
    });

    it('should return false for Infinity', () => {
      expect(isNumber(Infinity)).toBe(false);
      expect(isNumber(-Infinity)).toBe(false);
    });

    it('should return false for non-numbers', () => {
      expect(isNumber('42')).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
    });
  });

  describe('isPositiveNumber', () => {
    it('should return true for positive numbers', () => {
      expect(isPositiveNumber(1)).toBe(true);
      expect(isPositiveNumber(0.1)).toBe(true);
      expect(isPositiveNumber(100)).toBe(true);
    });

    it('should return false for zero and negative numbers', () => {
      expect(isPositiveNumber(0)).toBe(false);
      expect(isPositiveNumber(-1)).toBe(false);
    });
  });

  describe('isNonNegativeNumber', () => {
    it('should return true for zero and positive numbers', () => {
      expect(isNonNegativeNumber(0)).toBe(true);
      expect(isNonNegativeNumber(1)).toBe(true);
      expect(isNonNegativeNumber(100)).toBe(true);
    });

    it('should return false for negative numbers', () => {
      expect(isNonNegativeNumber(-1)).toBe(false);
      expect(isNonNegativeNumber(-0.1)).toBe(false);
    });
  });

  describe('isInteger', () => {
    it('should return true for integers', () => {
      expect(isInteger(0)).toBe(true);
      expect(isInteger(42)).toBe(true);
      expect(isInteger(-42)).toBe(true);
    });

    it('should return false for decimals', () => {
      expect(isInteger(3.14)).toBe(false);
      expect(isInteger(0.1)).toBe(false);
    });

    it('should return false for non-numbers', () => {
      expect(isInteger('42')).toBe(false);
      expect(isInteger(NaN)).toBe(false);
    });
  });

  describe('isBoolean', () => {
    it('should return true for booleans', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
    });

    it('should return false for non-booleans', () => {
      expect(isBoolean(0)).toBe(false);
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean('')).toBe(false);
      expect(isBoolean('true')).toBe(false);
      expect(isBoolean(null)).toBe(false);
    });
  });

  describe('isArray', () => {
    it('should return true for arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray(new Array(3))).toBe(true);
    });

    it('should return false for non-arrays', () => {
      expect(isArray('hello')).toBe(false);
      expect(isArray({ 0: 'a', length: 1 })).toBe(false);
      expect(isArray(null)).toBe(false);
    });
  });

  describe('isNonEmptyArray', () => {
    it('should return true for non-empty arrays', () => {
      expect(isNonEmptyArray([1])).toBe(true);
      expect(isNonEmptyArray([1, 2, 3])).toBe(true);
    });

    it('should return false for empty arrays', () => {
      expect(isNonEmptyArray([])).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(isNonEmptyArray(null)).toBe(false);
      expect(isNonEmptyArray(undefined)).toBe(false);
    });
  });

  describe('isArrayOf', () => {
    it('should return true when all elements match guard', () => {
      expect(isArrayOf([1, 2, 3], isNumber)).toBe(true);
      expect(isArrayOf(['a', 'b'], isString)).toBe(true);
      expect(isArrayOf([], isNumber)).toBe(true);
    });

    it('should return false when any element fails guard', () => {
      expect(isArrayOf([1, 'a', 3], isNumber)).toBe(false);
      expect(isArrayOf(['a', 1], isString)).toBe(false);
    });

    it('should return false for non-arrays', () => {
      expect(isArrayOf('not an array', isString)).toBe(false);
    });
  });

  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
    });

    it('should return false for arrays', () => {
      expect(isObject([])).toBe(false);
    });

    it('should return false for null', () => {
      expect(isObject(null)).toBe(false);
    });

    it('should return false for class instances', () => {
      expect(isObject(new Date())).toBe(false);
      expect(isObject(new Map())).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
    });
  });

  describe('isFunction', () => {
    it('should return true for functions', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      expect(isFunction(() => {})).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      expect(isFunction(function () {})).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      expect(isFunction(async () => {})).toBe(true);
      expect(isFunction(class {})).toBe(true);
    });

    it('should return false for non-functions', () => {
      expect(isFunction({})).toBe(false);
      expect(isFunction(null)).toBe(false);
    });
  });

  describe('isDate', () => {
    it('should return true for valid Date objects', () => {
      expect(isDate(new Date())).toBe(true);
      expect(isDate(new Date('2024-01-15'))).toBe(true);
    });

    it('should return false for invalid Date objects', () => {
      expect(isDate(new Date('invalid'))).toBe(false);
    });

    it('should return false for date strings', () => {
      expect(isDate('2024-01-15')).toBe(false);
    });

    it('should return false for timestamps', () => {
      expect(isDate(Date.now())).toBe(false);
    });
  });

  describe('isDateString', () => {
    it('should return true for valid date strings', () => {
      expect(isDateString('2024-01-15')).toBe(true);
      expect(isDateString('2024-01-15T10:30:00')).toBe(true);
      expect(isDateString('January 15, 2024')).toBe(true);
    });

    it('should return false for invalid date strings', () => {
      expect(isDateString('not a date')).toBe(false);
      expect(isDateString('2024-13-45')).toBe(false);
    });

    it('should return false for non-strings', () => {
      expect(isDateString(new Date())).toBe(false);
      expect(isDateString(123)).toBe(false);
    });
  });

  describe('isPromise', () => {
    it('should return true for Promises', () => {
      expect(isPromise(Promise.resolve())).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      expect(isPromise(new Promise(() => {}))).toBe(true);
    });

    it('should return true for thenable objects', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      expect(isPromise({ then: () => {} })).toBe(true);
    });

    it('should return false for non-Promises', () => {
      expect(isPromise({})).toBe(false);
      expect(isPromise(null)).toBe(false);
      expect(isPromise({ then: 'not a function' })).toBe(false);
    });
  });

  describe('hasProperty', () => {
    it('should return true when object has property', () => {
      expect(hasProperty({ name: 'John' }, 'name')).toBe(true);
      expect(hasProperty({ a: 1, b: 2 }, 'a')).toBe(true);
    });

    it('should return true for inherited properties', () => {
      const obj = Object.create({ inherited: true });
      expect(hasProperty(obj, 'inherited')).toBe(true);
    });

    it('should return false when object lacks property', () => {
      expect(hasProperty({ name: 'John' }, 'age')).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(hasProperty(null, 'name')).toBe(false);
      expect(hasProperty(undefined, 'name')).toBe(false);
    });

    it('should work with symbol keys', () => {
      const sym = Symbol('test');
      expect(hasProperty({ [sym]: 'value' }, sym)).toBe(true);
    });
  });

  describe('hasPropertyOfType', () => {
    it('should return true when property exists with correct type', () => {
      expect(hasPropertyOfType({ id: '123' }, 'id', isString)).toBe(true);
      expect(hasPropertyOfType({ count: 42 }, 'count', isNumber)).toBe(true);
    });

    it('should return false when property has wrong type', () => {
      expect(hasPropertyOfType({ id: 123 }, 'id', isString)).toBe(false);
    });

    it('should return false when property is missing', () => {
      expect(hasPropertyOfType({ name: 'John' }, 'id', isString)).toBe(false);
    });
  });

  describe('assertDefined', () => {
    it('should not throw for defined values', () => {
      expect(() => assertDefined(0)).not.toThrow();
      expect(() => assertDefined('')).not.toThrow();
      expect(() => assertDefined(false)).not.toThrow();
      expect(() => assertDefined({})).not.toThrow();
    });

    it('should throw for null', () => {
      expect(() => assertDefined(null)).toThrow('Value is null or undefined');
    });

    it('should throw for undefined', () => {
      expect(() => assertDefined(undefined)).toThrow('Value is null or undefined');
    });

    it('should use custom error message', () => {
      expect(() => assertDefined(null, 'Custom error')).toThrow('Custom error');
    });
  });

  describe('assert', () => {
    it('should not throw when condition is true', () => {
      expect(() => assert(true)).not.toThrow();
      expect(() => assert(1 === 1)).not.toThrow();
    });

    it('should throw when condition is false', () => {
      expect(() => assert(false)).toThrow('Assertion failed');
    });

    it('should use custom error message', () => {
      expect(() => assert(false, 'Custom assertion error')).toThrow('Custom assertion error');
    });
  });
});
