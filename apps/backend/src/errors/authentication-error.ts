/**
 * Authentication Error (401 Unauthorized)
 *
 * Thrown when a request lacks valid authentication credentials.
 * Use cases:
 * - Missing or invalid JWT token
 * - Expired token
 * - Invalid credentials (login)
 */

import { BaseError, type ErrorDetails } from './base-error.js';

export class AuthenticationError extends BaseError {
  readonly statusCode = 401;
  readonly errorType = 'AUTHENTICATION_ERROR';

  constructor(message = 'Authentication required', details?: ErrorDetails) {
    super(message, details);
  }
}
