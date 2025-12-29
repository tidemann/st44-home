/**
 * Not Found Error (404)
 *
 * Thrown when a requested resource does not exist.
 * Use cases:
 * - Entity not found by ID
 * - Route not found
 * - Resource deleted or never existed
 */

import { BaseError, type ErrorDetails } from './base-error.js';

export class NotFoundError extends BaseError {
  readonly statusCode = 404;
  readonly errorType = 'NOT_FOUND';

  /** The type of resource that was not found (e.g., 'User', 'Task') */
  readonly resourceType?: string;

  /** The identifier used to search for the resource */
  readonly resourceId?: string;

  constructor(message = 'Resource not found', resourceType?: string, resourceId?: string) {
    const details: ErrorDetails = {};
    if (resourceType) details.resourceType = resourceType;
    if (resourceId) details.resourceId = resourceId;

    super(message, Object.keys(details).length > 0 ? details : undefined);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }

  /**
   * Creates a NotFoundError for a specific resource type and ID.
   */
  static forResource(resourceType: string, resourceId?: string): NotFoundError {
    const message = resourceId
      ? `${resourceType} not found: ${resourceId}`
      : `${resourceType} not found`;
    return new NotFoundError(message, resourceType, resourceId);
  }
}
