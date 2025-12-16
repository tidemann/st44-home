/**
 * Password Validation Utilities
 *
 * Functions for validating password strength and requirements.
 */

/**
 * Password validation rules
 */
export const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false, // Optional for now
};

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate password strength
 *
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 *
 * @param password - The password to validate
 * @returns true if password meets all requirements
 */
export function validatePasswordStrength(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }

  const hasMinLength = password.length >= PASSWORD_RULES.minLength;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  return hasMinLength && hasUpperCase && hasLowerCase && hasNumber;
}

/**
 * Validate password with detailed error messages
 *
 * @param password - The password to validate
 * @returns Validation result with errors
 */
export function validatePasswordWithDetails(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(`Password must be at least ${PASSWORD_RULES.minLength} characters`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if password contains common weak patterns
 *
 * @param password - The password to check
 * @returns true if password contains weak patterns
 */
export function hasWeakPatterns(password: string): boolean {
  if (!password) return true;

  const weakPatterns = [/^123456/, /^password/i, /^qwerty/i, /^abc123/i, /^111111/, /^letmein/i];

  return weakPatterns.some((pattern) => pattern.test(password));
}
