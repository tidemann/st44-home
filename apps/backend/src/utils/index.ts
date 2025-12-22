/**
 * Backend Utilities
 *
 * Central export for all utility functions.
 */

export {
  validatePasswordStrength,
  validatePasswordWithDetails,
  hasWeakPatterns,
  PASSWORD_RULES,
  type PasswordValidationResult,
} from './password.js';

export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  isTokenExpired,
  getJwtSecret,
  type AccessTokenPayload,
  type RefreshTokenPayload,
  type TokenVerificationResult,
} from './jwt.js';

export {
  formatZodErrors,
  validateRequest,
  validateRequestSafe,
  handleZodError,
} from './validation.js';
