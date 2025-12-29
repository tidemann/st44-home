/**
 * Validation Error (400 Bad Request)
 *
 * Thrown when request data fails validation.
 * Use cases:
 * - Invalid request body format
 * - Missing required fields
 * - Field value constraints not met
 * - Zod schema validation failures
 */

import { BaseError, type ErrorDetails } from './base-error.js';

export interface ValidationErrorDetail {
  path: string;
  message: string;
}

export class ValidationError extends BaseError {
  readonly statusCode = 400;
  readonly errorType = 'VALIDATION_ERROR';

  /** Specific field validation errors */
  readonly validationErrors?: ValidationErrorDetail[];

  constructor(
    message = 'Validation failed',
    validationErrors?: ValidationErrorDetail[],
    details?: ErrorDetails,
  ) {
    super(message, details);
    this.validationErrors = validationErrors;
  }

  /**
   * Creates a ValidationError from a list of field errors.
   */
  static fromFieldErrors(errors: ValidationErrorDetail[]): ValidationError {
    const message =
      errors.length === 1
        ? `Validation failed: ${errors[0].message}`
        : `Validation failed: ${errors.length} errors`;
    return new ValidationError(message, errors);
  }

  override toJSON(): {
    error: string;
    message: string;
    statusCode: number;
    details?: ErrorDetails;
  } {
    const json = super.toJSON();

    // Include validation errors in details if present
    if (this.validationErrors && this.validationErrors.length > 0) {
      json.details = {
        ...json.details,
        validationErrors: this.validationErrors,
      };
    }

    return json;
  }
}
