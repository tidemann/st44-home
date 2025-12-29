import { Injectable } from '@angular/core';
import type { ZodType } from 'zod';

/**
 * Storage item with TTL metadata
 */
interface StorageItemWithTTL<T> {
  value: T;
  expiresAt: number;
}

/**
 * Type-safe wrapper service for browser localStorage
 *
 * Provides:
 * - Type-safe get/set operations with Zod schema validation
 * - Optional TTL (time-to-live) support for automatic expiration
 * - Graceful error handling for JSON parse failures
 * - Centralized storage access for easier testing and maintenance
 *
 * @example
 * // Basic usage
 * storageService.set('myKey', { name: 'value' });
 * const value = storageService.get('myKey', MySchema);
 *
 * // With TTL (expires in 1 hour)
 * storageService.setWithTTL('tempKey', data, 3600000);
 */
@Injectable({
  providedIn: 'root',
})
export class StorageService {
  /**
   * Retrieve a value from localStorage with optional Zod validation
   *
   * @param key - The storage key
   * @param schema - Optional Zod schema for validation
   * @returns The parsed value if valid, null if not found, expired, or invalid
   *
   * @example
   * const token = storageService.get('accessToken', z.string());
   * const settings = storageService.get('settings', SettingsSchema);
   */
  get<T>(key: string, schema?: ZodType<T>): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return null;
      }

      // Try to parse as JSON, but handle plain strings
      let parsed: unknown;
      try {
        parsed = JSON.parse(item);
      } catch {
        // Not JSON - treat as plain string
        parsed = item;
      }

      // Check for TTL wrapper
      if (this.isStorageItemWithTTL(parsed)) {
        if (Date.now() > parsed.expiresAt) {
          // Item has expired - remove it
          this.remove(key);
          return null;
        }
        parsed = parsed.value;
      }

      // Validate with schema if provided
      if (schema) {
        const result = schema.safeParse(parsed);
        if (result.success) {
          return result.data;
        }
        // Validation failed - log and return null
        console.warn(`Storage validation failed for key "${key}":`, result.error.issues);
        return null;
      }

      return parsed as T;
    } catch (error) {
      console.error(`Failed to get storage item "${key}":`, error);
      return null;
    }
  }

  /**
   * Retrieve a raw string value from localStorage without parsing
   *
   * Useful for tokens and other string values that don't need JSON parsing
   *
   * @param key - The storage key
   * @returns The string value or null if not found
   */
  getString(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Failed to get storage string "${key}":`, error);
      return null;
    }
  }

  /**
   * Store a value in localStorage
   *
   * Objects are JSON stringified, strings are stored as-is
   *
   * @param key - The storage key
   * @param value - The value to store
   */
  set<T>(key: string, value: T): void {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, stringValue);
    } catch (error) {
      console.error(`Failed to set storage item "${key}":`, error);
    }
  }

  /**
   * Store a value in localStorage with a time-to-live (TTL)
   *
   * The value will be automatically considered expired after the TTL period
   *
   * @param key - The storage key
   * @param value - The value to store
   * @param ttlMs - Time-to-live in milliseconds
   *
   * @example
   * // Store with 1 hour expiration
   * storageService.setWithTTL('tempData', data, 60 * 60 * 1000);
   */
  setWithTTL<T>(key: string, value: T, ttlMs: number): void {
    try {
      const item: StorageItemWithTTL<T> = {
        value,
        expiresAt: Date.now() + ttlMs,
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error(`Failed to set storage item with TTL "${key}":`, error);
    }
  }

  /**
   * Remove a value from localStorage
   *
   * @param key - The storage key to remove
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove storage item "${key}":`, error);
    }
  }

  /**
   * Clear all values from localStorage
   *
   * Use with caution - this removes ALL stored data
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  /**
   * Check if a key exists in localStorage
   *
   * @param key - The storage key to check
   * @returns True if the key exists, false otherwise
   */
  has(key: string): boolean {
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Type guard to check if a value is a TTL-wrapped storage item
   */
  private isStorageItemWithTTL(value: unknown): value is StorageItemWithTTL<unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      'value' in value &&
      'expiresAt' in value &&
      typeof (value as StorageItemWithTTL<unknown>).expiresAt === 'number'
    );
  }
}
