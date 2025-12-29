/**
 * Pagination schemas - Zod validation schemas for paginated API responses
 *
 * Provides reusable pagination infrastructure for all list endpoints.
 *
 * @module @st44/types/schemas/pagination
 */

import { z } from '../generators/openapi.generator.js';

/**
 * Standard pagination query parameters
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).describe('Page number (1-indexed)'),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Number of items per page (max 100)'),
  sortBy: z.string().optional().describe('Field to sort by'),
  sortOrder: z.enum(['asc', 'desc']).default('desc').describe('Sort direction'),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/**
 * Pagination metadata in response
 */
export const PaginationMetaSchema = z.object({
  page: z.number().int().min(1).describe('Current page number'),
  pageSize: z.number().int().min(1).describe('Items per page'),
  total: z.number().int().min(0).describe('Total number of items'),
  totalPages: z.number().int().min(0).describe('Total number of pages'),
  hasNextPage: z.boolean().describe('Whether more pages exist'),
  hasPreviousPage: z.boolean().describe('Whether previous pages exist'),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/**
 * Create a paginated response schema for any item type
 * @param itemSchema - Zod schema for the items
 * @param itemsKey - Key name for the items array (e.g., 'tasks', 'users')
 */
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(
  itemSchema: T,
  itemsKey: string,
) {
  return z.object({
    [itemsKey]: z.array(itemSchema),
    pagination: PaginationMetaSchema,
  });
}

/**
 * Generic paginated response type
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Helper to calculate pagination metadata
 */
export function calculatePaginationMeta(
  page: number,
  pageSize: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / pageSize);
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Helper to calculate SQL OFFSET from page and pageSize
 */
export function calculateOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}
