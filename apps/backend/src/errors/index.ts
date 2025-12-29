/**
 * Custom Error Classes
 *
 * Centralized export for all custom API error classes.
 * Use these errors throughout the backend for consistent error handling.
 */

// Base error and utilities
export { BaseError, isBaseError, type ErrorDetails } from './base-error.js';

// HTTP 400 - Bad Request
export { ValidationError, type ValidationErrorDetail } from './validation-error.js';

// HTTP 401 - Unauthorized
export { AuthenticationError } from './authentication-error.js';

// HTTP 403 - Forbidden
export { AuthorizationError, ForbiddenError } from './authorization-error.js';

// HTTP 404 - Not Found
export { NotFoundError } from './not-found-error.js';

// HTTP 409 - Conflict
export { ConflictError } from './conflict-error.js';

// HTTP 429 - Too Many Requests
export { TooManyRequestsError } from './rate-limit-error.js';

// HTTP 500 - Internal Server Error
export { InternalError } from './internal-error.js';
