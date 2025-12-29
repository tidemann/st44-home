/**
 * Conflict Error (409)
 *
 * Thrown when a request conflicts with current resource state.
 * Use cases:
 * - Duplicate email registration
 * - Unique constraint violations
 * - Resource already exists
 * - Concurrent modification conflicts
 */

import { BaseError, type ErrorDetails } from './base-error.js';

export class ConflictError extends BaseError {
  readonly statusCode = 409;
  readonly errorType = 'CONFLICT';

  /** The field that caused the conflict (e.g., 'email') */
  readonly conflictField?: string;

  constructor(message = 'Resource conflict', conflictField?: string, details?: ErrorDetails) {
    const fullDetails: ErrorDetails = { ...details };
    if (conflictField) fullDetails.conflictField = conflictField;

    super(message, Object.keys(fullDetails).length > 0 ? fullDetails : undefined);
    this.conflictField = conflictField;
  }

  /**
   * Creates a ConflictError for a duplicate field value.
   */
  static forDuplicate(field: string, value?: string): ConflictError {
    const message = value ? `${field} already exists: ${value}` : `${field} already exists`;
    return new ConflictError(message, field);
  }
}
