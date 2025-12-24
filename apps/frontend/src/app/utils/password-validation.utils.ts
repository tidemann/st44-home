import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Validates password strength requirements:
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.value;
  if (!password) return null;

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    return { passwordStrength: true };
  }

  return null;
}

/**
 * Form-level validator to ensure password and confirm password match
 * Works with both 'password' and 'newPassword' field names
 */
export function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value || group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;

  if (password && confirmPassword && password !== confirmPassword) {
    return { passwordMismatch: true };
  }

  return null;
}

/**
 * Calculate password strength based on multiple criteria
 * @returns 'weak' | 'medium' | 'strong'
 */
export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z\d]/.test(password)) strength++;

  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  return 'strong';
}
