import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { STORAGE_KEYS } from './storage-keys';

/**
 * Decoded JWT token payload structure
 */
export interface DecodedToken {
  userId: string;
  email: string;
  role?: 'admin' | 'parent' | 'child';
  firstName?: string | null;
  lastName?: string | null;
  type: string;
  iat: number;
  exp: number;
}

/**
 * Token storage strategy - determines where tokens are persisted
 */
export type TokenStorageStrategy = 'persistent' | 'session';

/**
 * Service responsible for JWT token management
 *
 * Single Responsibility: Token storage, retrieval, decoding, and validation
 *
 * Features:
 * - Dual storage support (localStorage for "remember me", sessionStorage for session-only)
 * - JWT decoding and expiration checking
 * - Token validity verification
 *
 * @example
 * // Store tokens after login
 * tokenService.storeTokens(accessToken, refreshToken, 'persistent');
 *
 * // Get access token for API calls
 * const token = tokenService.getAccessToken();
 *
 * // Decode token to get user info
 * const decoded = tokenService.decodeToken(token);
 */
@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private readonly storage = inject(StorageService);

  /**
   * Store authentication tokens
   *
   * @param accessToken - The JWT access token
   * @param refreshToken - The JWT refresh token
   * @param strategy - Where to store tokens: 'persistent' (localStorage) or 'session' (sessionStorage)
   */
  storeTokens(accessToken: string, refreshToken: string, strategy: TokenStorageStrategy): void {
    if (strategy === 'persistent') {
      this.storage.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      this.storage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    } else {
      sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      this.storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
      this.storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    }
  }

  /**
   * Clear all stored tokens from both storage mechanisms
   */
  clearTokens(): void {
    this.storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
    this.storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Get the stored access token
   *
   * Checks both localStorage and sessionStorage, returning whichever contains the token
   *
   * @returns The access token string or null if not found
   */
  getAccessToken(): string | null {
    return (
      this.storage.getString(STORAGE_KEYS.ACCESS_TOKEN) ||
      sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    );
  }

  /**
   * Get the stored refresh token
   *
   * Checks both localStorage and sessionStorage, returning whichever contains the token
   *
   * @returns The refresh token string or null if not found
   */
  getRefreshToken(): string | null {
    return (
      this.storage.getString(STORAGE_KEYS.REFRESH_TOKEN) ||
      sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
    );
  }

  /**
   * Check if a valid access token exists
   *
   * @returns True if a non-expired access token is stored
   */
  hasValidToken(): boolean {
    const token = this.getAccessToken();
    if (!token) {
      return false;
    }

    const decoded = this.decodeToken(token);
    return decoded !== null;
  }

  /**
   * Decode a JWT token and extract its payload
   *
   * @param token - The JWT token to decode
   * @returns The decoded token payload or null if invalid/expired
   */
  decodeToken(token: string): DecodedToken | null {
    try {
      // JWT tokens have 3 parts separated by dots: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // Decode the payload (second part)
      const payload = parts[1];
      const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const decoded = JSON.parse(decodedPayload) as DecodedToken;

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        return null;
      }

      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Check if the current access token is about to expire
   *
   * @param thresholdSeconds - Time in seconds before expiration to consider "expiring soon" (default: 300 = 5 minutes)
   * @returns True if token expires within the threshold
   */
  isTokenExpiringSoon(thresholdSeconds = 300): boolean {
    const token = this.getAccessToken();
    if (!token) {
      return true;
    }

    const decoded = this.decodeToken(token);
    if (!decoded) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp - now < thresholdSeconds;
  }

  /**
   * Get the remaining lifetime of the current access token
   *
   * @returns Seconds until expiration, or 0 if token is invalid/expired
   */
  getTokenRemainingLifetime(): number {
    const token = this.getAccessToken();
    if (!token) {
      return 0;
    }

    const decoded = this.decodeToken(token);
    if (!decoded) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    const remaining = decoded.exp - now;
    return remaining > 0 ? remaining : 0;
  }
}
