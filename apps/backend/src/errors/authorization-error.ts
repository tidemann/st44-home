/**
 * Authorization Error (403 Forbidden)
 *
 * Thrown when an authenticated user lacks permission for an action.
 * Use cases:
 * - User trying to access another user's resources
 * - Insufficient role (e.g., non-admin trying admin action)
 * - Household membership required
 */

import { BaseError, type ErrorDetails } from './base-error.js';

export class AuthorizationError extends BaseError {
  readonly statusCode = 403;
  readonly errorType = 'AUTHORIZATION_ERROR';

  constructor(message = 'Access denied', details?: ErrorDetails) {
    super(message, details);
  }
}

/**
 * Alias for AuthorizationError - commonly used name
 */
export const ForbiddenError = AuthorizationError;
