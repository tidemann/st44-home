/**
 * Internal Server Error (500)
 *
 * Thrown for unexpected server errors.
 * Use cases:
 * - Database connection failures
 * - Unexpected exceptions
 * - Third-party service failures
 *
 * Note: In production, the original error message should NOT be exposed
 * to clients. The global error handler will sanitize these.
 */

import { BaseError, type ErrorDetails } from './base-error.js';

export class InternalError extends BaseError {
  readonly statusCode = 500;
  readonly errorType = 'INTERNAL_ERROR';

  /** The original error that caused this (not exposed to clients) */
  readonly originalError?: Error;

  constructor(message = 'Internal server error', originalError?: Error, details?: ErrorDetails) {
    super(message, details);
    this.originalError = originalError;
  }

  /**
   * Creates an InternalError wrapping another error.
   * The original error message is preserved for logging but not API response.
   */
  static wrap(error: unknown, message = 'Internal server error'): InternalError {
    if (error instanceof Error) {
      return new InternalError(message, error);
    }
    return new InternalError(message);
  }
}
