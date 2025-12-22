/**
 * Validation utilities for Zod schemas
 */
import { z, type ZodIssue } from 'zod';
import { FastifyReply } from 'fastify';

/**
 * Error shape for validation failures
 */
interface ValidationError {
  path: string;
  message: string;
}

/**
 * Formats Zod errors into user-friendly validation error messages
 */
export function formatZodErrors(error: z.ZodError): ValidationError[] {
  return error.issues.map((issue: ZodIssue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * Validates data against a Zod schema
 * Throws ZodError if validation fails (to be caught by error handler)
 */
export function validateRequest<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validation that returns a result object
 * Use when you want to handle errors inline instead of throwing
 */
export function validateRequestSafe<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: ValidationError[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: formatZodErrors(result.error),
  };
}

/**
 * Fastify error handler for Zod validation errors
 * Send 400 response with formatted validation errors
 */
export function handleZodError(error: z.ZodError, reply: FastifyReply): void {
  reply.code(400).send({
    error: 'Bad Request',
    message: 'Validation failed',
    details: formatZodErrors(error),
  });
}
