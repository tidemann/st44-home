/**
 * Too Many Requests Error (HTTP 429)
 *
 * Used when a client has exceeded rate limits.
 * Includes retry-after information for clients.
 */

import { BaseError, type ErrorDetails } from './base-error.js';

/**
 * Error thrown when rate limits are exceeded.
 *
 * @example
 * throw new TooManyRequestsError('Too many login attempts', 3600);
 */
export class TooManyRequestsError extends BaseError {
  readonly statusCode = 429;
  readonly errorType = 'RATE_LIMIT_EXCEEDED';

  /** Number of seconds until the client can retry */
  readonly retryAfter: number;

  constructor(message: string, retryAfter: number, details?: ErrorDetails) {
    super(message, {
      retryAfter,
      ...details,
    });
    this.retryAfter = retryAfter;
  }
}
