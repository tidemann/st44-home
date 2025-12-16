/**
 * JWT Utilities
 *
 * Functions for generating and verifying JWT tokens.
 */

import jwt from 'jsonwebtoken';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_ACCESS_EXPIRY = '1h';
const JWT_REFRESH_EXPIRY = '7d';

/**
 * Access token payload
 */
export interface AccessTokenPayload {
  userId: string;
  email: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

/**
 * Refresh token payload
 */
export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Token verification result
 */
export interface TokenVerificationResult<T> {
  valid: boolean;
  payload?: T;
  error?: string;
}

/**
 * Generate an access token
 *
 * @param userId - User ID to encode in token
 * @param email - User email to encode in token
 * @param secret - Optional secret (defaults to JWT_SECRET)
 * @param expiresIn - Optional expiry (defaults to 1h)
 * @returns JWT access token string
 */
export function generateAccessToken(
  userId: string,
  email: string,
  secret: string = JWT_SECRET,
  expiresIn: string = JWT_ACCESS_EXPIRY,
): string {
  return jwt.sign({ userId, email, type: 'access' }, secret, { expiresIn });
}

/**
 * Generate a refresh token
 *
 * @param userId - User ID to encode in token
 * @param secret - Optional secret (defaults to JWT_SECRET)
 * @param expiresIn - Optional expiry (defaults to 7d)
 * @returns JWT refresh token string
 */
export function generateRefreshToken(
  userId: string,
  secret: string = JWT_SECRET,
  expiresIn: string = JWT_REFRESH_EXPIRY,
): string {
  return jwt.sign({ userId, type: 'refresh' }, secret, { expiresIn });
}

/**
 * Verify an access token
 *
 * @param token - JWT token to verify
 * @param secret - Optional secret (defaults to JWT_SECRET)
 * @returns Verification result with payload or error
 */
export function verifyAccessToken(
  token: string,
  secret: string = JWT_SECRET,
): TokenVerificationResult<AccessTokenPayload> {
  try {
    const payload = jwt.verify(token, secret) as AccessTokenPayload;

    if (payload.type !== 'access') {
      return { valid: false, error: 'Invalid token type: expected access token' };
    }

    return { valid: true, payload };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, error: 'Token expired' };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { valid: false, error: 'Invalid token' };
    }
    return { valid: false, error: 'Token verification failed' };
  }
}

/**
 * Verify a refresh token
 *
 * @param token - JWT token to verify
 * @param secret - Optional secret (defaults to JWT_SECRET)
 * @returns Verification result with payload or error
 */
export function verifyRefreshToken(
  token: string,
  secret: string = JWT_SECRET,
): TokenVerificationResult<RefreshTokenPayload> {
  try {
    const payload = jwt.verify(token, secret) as RefreshTokenPayload;

    if (payload.type !== 'refresh') {
      return { valid: false, error: 'Invalid token type: expected refresh token' };
    }

    return { valid: true, payload };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, error: 'Token expired' };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { valid: false, error: 'Invalid token' };
    }
    return { valid: false, error: 'Token verification failed' };
  }
}

/**
 * Decode a token without verification (for debugging)
 *
 * @param token - JWT token to decode
 * @returns Decoded payload or null if invalid
 */
export function decodeToken(token: string): unknown {
  return jwt.decode(token);
}

/**
 * Check if a token is expired
 *
 * @param token - JWT token to check
 * @returns true if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded || !decoded.exp) return true;
  return Date.now() >= decoded.exp * 1000;
}

/**
 * Get the default JWT secret (for testing)
 */
export function getJwtSecret(): string {
  return JWT_SECRET;
}
