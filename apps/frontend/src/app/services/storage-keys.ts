/**
 * Centralized storage key constants for localStorage
 *
 * All storage keys used by the application should be defined here
 * to ensure consistency and prevent typos across the codebase.
 */
export const STORAGE_KEYS = {
  /**
   * JWT access token for authenticated API requests
   */
  ACCESS_TOKEN: 'accessToken',

  /**
   * JWT refresh token for obtaining new access tokens
   */
  REFRESH_TOKEN: 'refreshToken',

  /**
   * Currently active household ID
   */
  ACTIVE_HOUSEHOLD_ID: 'activeHouseholdId',

  /**
   * Persisted task filter selection (all | mine | person | completed)
   */
  TASKS_FILTER: 'tasksFilter',
} as const;

/**
 * Type representing valid storage key values
 */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
