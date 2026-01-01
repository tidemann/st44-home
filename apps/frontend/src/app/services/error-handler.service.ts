import { Injectable, inject, ErrorHandler } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from './notification.service';

/**
 * Error classification for handling strategies
 */
export type ErrorCategory = 'network' | 'client' | 'server' | 'auth' | 'validation' | 'unknown';

/**
 * Processed error information
 */
export interface ProcessedError {
  category: ErrorCategory;
  message: string;
  originalError: unknown;
  httpStatus?: number;
  details?: Record<string, unknown>;
}

/**
 * User-friendly error messages by HTTP status code
 */
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Please log in to continue.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This action conflicts with existing data.',
  422: 'The provided data is invalid.',
  429: 'Too many requests. Please wait a moment.',
  500: 'An unexpected server error occurred.',
  502: 'Server is temporarily unavailable.',
  503: 'Service is temporarily unavailable.',
  504: 'Request timed out. Please try again.',
};

/**
 * Service responsible for centralized error handling
 *
 * Single Responsibility: Process, classify, and handle errors uniformly
 *
 * Features:
 * - Error classification (network, client, server, auth, validation)
 * - User-friendly error messages
 * - Integration with NotificationService for user alerts
 * - Structured error processing for logging/analytics
 * - Silent vs user-facing error handling options
 *
 * @example
 * // Handle an HTTP error with user notification
 * errorHandler.handleHttpError(error);
 *
 * // Handle error silently (for logging only)
 * errorHandler.handleError(error, { silent: true });
 *
 * // Process error without notification (for custom handling)
 * const processed = errorHandler.processError(error);
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService implements ErrorHandler {
  private readonly notification = inject(NotificationService);

  /**
   * Angular ErrorHandler implementation for uncaught errors
   *
   * @param error - The uncaught error
   */
  handleError(error: unknown): void {
    this.handle(error);
  }

  /**
   * Handle an error with optional configuration
   *
   * @param error - The error to handle
   * @param options - Handling options
   */
  handle(
    error: unknown,
    options?: {
      /** If true, don't show notification to user */
      silent?: boolean;
      /** Custom message to show instead of derived message */
      customMessage?: string;
      /** Context for logging */
      context?: string;
    },
  ): ProcessedError {
    const processed = this.processError(error);

    // Log error for debugging (could be replaced with proper logging service)
    if (options?.context) {
      console.error(`[${options.context}]`, processed.originalError);
    } else {
      console.error('[ErrorHandler]', processed.originalError);
    }

    // Show notification unless silent
    if (!options?.silent) {
      const message = options?.customMessage || processed.message;
      this.notification.error(message);
    }

    return processed;
  }

  /**
   * Handle an HTTP error response
   *
   * @param error - The HTTP error response
   * @param options - Handling options
   */
  handleHttpError(
    error: HttpErrorResponse,
    options?: {
      silent?: boolean;
      customMessage?: string;
      context?: string;
    },
  ): ProcessedError {
    return this.handle(error, options);
  }

  /**
   * Process an error into a structured format
   *
   * @param error - The error to process
   * @returns Processed error information
   */
  processError(error: unknown): ProcessedError {
    if (error instanceof HttpErrorResponse) {
      return this.processHttpError(error);
    }

    if (error instanceof Error) {
      return {
        category: 'unknown',
        message: error.message || 'An unexpected error occurred.',
        originalError: error,
      };
    }

    if (typeof error === 'string') {
      return {
        category: 'unknown',
        message: error,
        originalError: error,
      };
    }

    return {
      category: 'unknown',
      message: 'An unexpected error occurred.',
      originalError: error,
    };
  }

  /**
   * Process an HTTP error response
   */
  private processHttpError(error: HttpErrorResponse): ProcessedError {
    const category = this.categorizeHttpError(error);
    const message = this.getHttpErrorMessage(error);

    return {
      category,
      message,
      originalError: error,
      httpStatus: error.status,
      details: this.extractErrorDetails(error),
    };
  }

  /**
   * Categorize an HTTP error
   */
  private categorizeHttpError(error: HttpErrorResponse): ErrorCategory {
    if (error.status === 0) {
      return 'network';
    }
    if (error.status === 401) {
      return 'auth';
    }
    if (error.status === 400 || error.status === 422) {
      return 'validation';
    }
    if (error.status >= 400 && error.status < 500) {
      return 'client';
    }
    if (error.status >= 500) {
      return 'server';
    }
    return 'unknown';
  }

  /**
   * Get a user-friendly message for an HTTP error
   */
  private getHttpErrorMessage(error: HttpErrorResponse): string {
    // Check for server-provided message
    const serverMessage = this.extractServerMessage(error);
    if (serverMessage) {
      return serverMessage;
    }

    // Network error
    if (error.status === 0) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }

    // Use predefined message or generic fallback
    return HTTP_ERROR_MESSAGES[error.status] || `Request failed (${error.status}).`;
  }

  /**
   * Extract error message from server response
   */
  private extractServerMessage(error: HttpErrorResponse): string | null {
    const body = error.error;

    if (!body) {
      return null;
    }

    // Common server error response formats
    if (typeof body === 'string') {
      return body;
    }

    if (typeof body === 'object') {
      // Try common message fields
      if ('message' in body && typeof body.message === 'string') {
        return body.message;
      }
      if ('error' in body && typeof body.error === 'string') {
        return body.error;
      }
      if ('errors' in body && Array.isArray(body.errors) && body.errors.length > 0) {
        const firstError = body.errors[0];
        if (typeof firstError === 'string') {
          return firstError;
        }
        if (typeof firstError === 'object' && 'message' in firstError) {
          return firstError.message;
        }
      }
    }

    return null;
  }

  /**
   * Extract additional details from error response
   */
  private extractErrorDetails(error: HttpErrorResponse): Record<string, unknown> | undefined {
    const body = error.error;

    if (!body || typeof body !== 'object') {
      return undefined;
    }

    // Return relevant fields for logging/debugging
    const details: Record<string, unknown> = {};

    if ('code' in body) {
      details['code'] = body.code;
    }
    if ('errors' in body) {
      details['errors'] = body.errors;
    }
    if ('validation' in body) {
      details['validation'] = body.validation;
    }

    return Object.keys(details).length > 0 ? details : undefined;
  }
}
