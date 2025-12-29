/**
 * Standardized Error Response Types
 *
 * These types define the consistent error response format
 * used across all API endpoints.
 */

/**
 * Standard API error response format.
 * All error responses from the API follow this structure.
 */
export interface ErrorResponse {
  /** Machine-readable error type (e.g., 'VALIDATION_ERROR', 'NOT_FOUND') */
  error: string;

  /** Human-readable error message */
  message: string;

  /** HTTP status code */
  statusCode: number;

  /** Optional additional details about the error */
  details?: unknown;
}

/**
 * Validation error with field-level details.
 */
export interface ValidationErrorResponse extends ErrorResponse {
  error: 'VALIDATION_ERROR';
  statusCode: 400;
  details: {
    validationErrors: Array<{
      path: string;
      message: string;
    }>;
  };
}

/**
 * Type guard to check if a response is an ErrorResponse
 */
export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    'message' in response &&
    'statusCode' in response &&
    typeof (response as ErrorResponse).error === 'string' &&
    typeof (response as ErrorResponse).message === 'string' &&
    typeof (response as ErrorResponse).statusCode === 'number'
  );
}
