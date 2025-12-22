/**
 * @st44/types - Shared TypeScript types and schemas
 * 
 * This package provides type-safe data models shared between
 * frontend and backend, ensuring API consistency and eliminating
 * type duplication.
 * 
 * @module @st44/types
 * @version 1.0.0
 */

export * from './schemas/index.js';
export * from './types/index.js';
export * from './generators/index.js';

// Version export for debugging and compatibility checks
export const VERSION = '1.0.0';
