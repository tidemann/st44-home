/**
 * Password Validation Unit Tests
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  validatePasswordStrength,
  validatePasswordWithDetails,
  hasWeakPatterns,
  PASSWORD_RULES,
} from './password.ts';

describe('Password Validation', () => {
  describe('validatePasswordStrength', () => {
    test('should return true for valid password', () => {
      assert.strictEqual(validatePasswordStrength('Test1234'), true);
      assert.strictEqual(validatePasswordStrength('MyP@ssw0rd'), true);
      assert.strictEqual(validatePasswordStrength('Abcdefg1'), true);
    });

    test('should return false for password without uppercase', () => {
      assert.strictEqual(validatePasswordStrength('test1234'), false);
    });

    test('should return false for password without lowercase', () => {
      assert.strictEqual(validatePasswordStrength('TEST1234'), false);
    });

    test('should return false for password without number', () => {
      assert.strictEqual(validatePasswordStrength('TestTest'), false);
    });

    test('should return false for password too short', () => {
      assert.strictEqual(validatePasswordStrength('Test1'), false);
      assert.strictEqual(validatePasswordStrength('Ab1'), false);
    });

    test('should return false for empty password', () => {
      assert.strictEqual(validatePasswordStrength(''), false);
    });

    test('should return false for null/undefined', () => {
      assert.strictEqual(validatePasswordStrength(null as unknown as string), false);
      assert.strictEqual(validatePasswordStrength(undefined as unknown as string), false);
    });

    test('should return false for non-string input', () => {
      assert.strictEqual(validatePasswordStrength(12345678 as unknown as string), false);
      assert.strictEqual(validatePasswordStrength({} as unknown as string), false);
    });

    test('should accept password with exactly 8 characters', () => {
      assert.strictEqual(validatePasswordStrength('Test1234'), true);
    });

    test('should accept very long passwords', () => {
      assert.strictEqual(validatePasswordStrength('Test1234'.repeat(100)), true);
    });
  });

  describe('validatePasswordWithDetails', () => {
    test('should return valid for good password', () => {
      const result = validatePasswordWithDetails('Test1234');
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    test('should return error for missing uppercase', () => {
      const result = validatePasswordWithDetails('test1234');
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('uppercase')));
    });

    test('should return error for missing lowercase', () => {
      const result = validatePasswordWithDetails('TEST1234');
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('lowercase')));
    });

    test('should return error for missing number', () => {
      const result = validatePasswordWithDetails('TestTest');
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('number')));
    });

    test('should return error for too short', () => {
      const result = validatePasswordWithDetails('Test1');
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes(`${PASSWORD_RULES.minLength} characters`)));
    });

    test('should return multiple errors for multiple violations', () => {
      const result = validatePasswordWithDetails('abc');
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length >= 3); // short, no uppercase, no number
    });

    test('should return error for empty password', () => {
      const result = validatePasswordWithDetails('');
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('required')));
    });

    test('should return error for null password', () => {
      const result = validatePasswordWithDetails(null as unknown as string);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('required')));
    });
  });

  describe('hasWeakPatterns', () => {
    test('should detect common weak passwords', () => {
      assert.strictEqual(hasWeakPatterns('123456'), true);
      assert.strictEqual(hasWeakPatterns('password'), true);
      assert.strictEqual(hasWeakPatterns('PASSWORD'), true);
      assert.strictEqual(hasWeakPatterns('qwerty'), true);
      assert.strictEqual(hasWeakPatterns('abc123'), true);
      assert.strictEqual(hasWeakPatterns('111111'), true);
      assert.strictEqual(hasWeakPatterns('letmein'), true);
    });

    test('should return false for strong passwords', () => {
      assert.strictEqual(hasWeakPatterns('MyStr0ng!Pass'), false);
      assert.strictEqual(hasWeakPatterns('X#9kLm$pQ'), false);
    });

    test('should return true for empty/null', () => {
      assert.strictEqual(hasWeakPatterns(''), true);
      assert.strictEqual(hasWeakPatterns(null as unknown as string), true);
    });

    test('should detect weak patterns at start only', () => {
      // These weak patterns are only checked at the start
      assert.strictEqual(hasWeakPatterns('123456safe'), true);
      assert.strictEqual(hasWeakPatterns('safe123456'), false);
    });
  });

  describe('PASSWORD_RULES', () => {
    test('should have expected default values', () => {
      assert.strictEqual(PASSWORD_RULES.minLength, 8);
      assert.strictEqual(PASSWORD_RULES.requireUppercase, true);
      assert.strictEqual(PASSWORD_RULES.requireLowercase, true);
      assert.strictEqual(PASSWORD_RULES.requireNumber, true);
      assert.strictEqual(PASSWORD_RULES.requireSpecialChar, false);
    });
  });
});
