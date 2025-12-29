/**
 * Base Error Class
 *
 * Abstract base class for all custom API errors.
 * Provides standardized error structure for consistent API error responses.
 */

export interface ErrorDetails {
  [key: string]: unknown;
}

/**
 * Abstract base error class that all custom API errors extend.
 *
 * Provides:
 * - HTTP status code
 * - Error type identifier (for machine-readable error categorization)
 * - Human-readable message
 * - Optional details object for additional context
 * - Stack trace (in development)
 */
export abstract class BaseError extends Error {
  /** HTTP status code (e.g., 400, 401, 404, 500) */
  abstract readonly statusCode: number;

  /** Machine-readable error type (e.g., 'VALIDATION_ERROR', 'NOT_FOUND') */
  abstract readonly errorType: string;

  /** Optional additional details about the error */
  readonly details?: ErrorDetails;

  constructor(message: string, details?: ErrorDetails) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Converts the error to a JSON-serializable object for API responses.
   * Does NOT include stack trace (security - internal details).
   */
  toJSON(): {
    error: string;
    message: string;
    statusCode: number;
    details?: ErrorDetails;
  } {
    const response: {
      error: string;
      message: string;
      statusCode: number;
      details?: ErrorDetails;
    } = {
      error: this.errorType,
      message: this.message,
      statusCode: this.statusCode,
    };

    if (this.details) {
      response.details = this.details;
    }

    return response;
  }
}

/**
 * Type guard to check if an error is a BaseError instance
 */
export function isBaseError(error: unknown): error is BaseError {
  return error instanceof BaseError;
}
