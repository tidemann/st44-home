/**
 * Authentication Routes
 *
 * Handles user registration, login, token refresh, logout,
 * Google OAuth, and password reset functionality.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { pool } from '../database.js';
import { authenticateUser } from '../middleware/auth.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/auth.js';
import { getEmailService } from '../services/email.service.js';
import {
  generateAccessToken as generateAccessTokenUtil,
  generateRefreshToken as generateRefreshTokenUtil,
} from '../utils/jwt.js';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Helper Functions
function validatePasswordStrength(password: string): boolean {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return password.length >= 8 && hasUpperCase && hasLowerCase && hasNumber;
}

// Local JWT token generation functions that include role (not in utils/jwt.ts)
function generateAccessToken(userId: string, email: string, role?: string): string {
  return jwt.sign({ userId, email, role, type: 'access' }, JWT_SECRET, {
    expiresIn: '1h',
  });
}

function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
}

// Request/Response Types
interface RegisterRequest {
  Body: {
    email: string;
    password: string;
  };
}

interface RegisterResponse {
  userId: string;
  email: string;
}

interface ErrorResponse {
  error: string;
}

interface LoginRequest {
  Body: {
    email: string;
    password: string;
  };
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  role?: string;
  householdId?: string;
}

interface RefreshRequest {
  Body: {
    refreshToken: string;
  };
}

interface RefreshResponse {
  accessToken: string;
}

interface RefreshTokenPayload {
  userId: string;
  type: string;
  iat: number;
  exp: number;
}

interface GoogleAuthBody {
  credential: string;
}

interface ForgotPasswordRequest {
  Body: {
    email: string;
  };
}

interface ForgotPasswordResponse {
  message: string;
}

interface ResetPasswordRequest {
  Body: {
    token: string;
    newPassword: string;
  };
}

interface ResetPasswordResponse {
  message: string;
}

// Rate limiting map: email -> [timestamps]
const forgotPasswordRateLimit = new Map<string, number[]>();

/**
 * Register authentication routes
 */
export default async function authRoutes(fastify: FastifyInstance) {
  // Registration endpoint
  fastify.post<RegisterRequest, { Reply: RegisterResponse | ErrorResponse }>(
    '/register',
    {
      schema: registerSchema,
    },
    async (request, reply) => {
      const { email, password } = request.body;

      // Validate password strength
      if (!validatePasswordStrength(password)) {
        reply.code(400);
        return {
          error:
            'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        };
      }

      try {
        // Hash password with bcrypt (cost factor 12)
        const passwordHash = await bcrypt.hash(password, 12);

        // Insert user into database
        const result = await pool.query(
          'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
          [email, passwordHash],
        );

        reply.code(201);
        return {
          userId: result.rows[0].id,
          email: result.rows[0].email,
        };
      } catch (error: unknown) {
        // Handle duplicate email (PostgreSQL unique violation)
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
          reply.code(409);
          return { error: 'Email already registered' };
        }

        // Log error but don't expose internal details to client
        fastify.log.error(error);
        reply.code(500);
        return { error: 'Registration failed' };
      }
    },
  );

  // Login endpoint
  fastify.post<LoginRequest, { Reply: LoginResponse | ErrorResponse }>(
    '/login',
    {
      schema: loginSchema,
    },
    async (request, reply) => {
      const { email, password } = request.body;

      try {
        // Query user by email
        const result = await pool.query(
          'SELECT id, email, password_hash FROM users WHERE email = $1',
          [email],
        );

        // User not found - same error message for security
        if (result.rows.length === 0) {
          fastify.log.warn({ email }, 'Login attempt with non-existent email');
          reply.code(401);
          return { error: 'Invalid email or password' };
        }

        const user = result.rows[0];

        // Compare password using bcrypt (timing-safe)
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
          fastify.log.warn({ userId: user.id, email }, 'Login attempt with wrong password');
          reply.code(401);
          return { error: 'Invalid email or password' };
        }

        // Query household_members to get user's role and household
        const householdResult = await pool.query(
          'SELECT household_id, role FROM household_members WHERE user_id = $1 LIMIT 1',
          [user.id],
        );

        let role: string | undefined;
        let householdId: string | undefined;

        if (householdResult.rows.length > 0) {
          role = householdResult.rows[0].role;
          householdId = householdResult.rows[0].household_id;
        }

        // Generate tokens with role
        const accessToken = generateAccessToken(user.id, user.email, role);
        const refreshToken = generateRefreshToken(user.id);

        fastify.log.info({ userId: user.id, email, role, householdId }, 'Successful login');

        reply.code(200);
        return {
          accessToken,
          refreshToken,
          userId: user.id,
          email: user.email,
          role,
          householdId,
        };
      } catch (error: unknown) {
        // Log error but don't expose internal details
        fastify.log.error(error, 'Login error');
        reply.code(500);
        return { error: 'Authentication failed' };
      }
    },
  );

  // Token refresh endpoint
  fastify.post<RefreshRequest, { Reply: RefreshResponse | ErrorResponse }>(
    '/refresh',
    {
      schema: refreshTokenSchema,
    },
    async (request, reply) => {
      const { refreshToken } = request.body;

      try {
        // Verify token signature and expiry
        const decoded = jwt.verify(refreshToken, JWT_SECRET) as RefreshTokenPayload;

        // Verify it's a refresh token (not access token)
        if (decoded.type !== 'refresh') {
          fastify.log.warn('Attempted to use non-refresh token for refresh');
          reply.code(401);
          return { error: 'Invalid or expired refresh token' };
        }

        // Get user email from database
        const result = await pool.query('SELECT email FROM users WHERE id = $1', [decoded.userId]);

        if (result.rows.length === 0) {
          fastify.log.warn({ userId: decoded.userId }, 'User not found for refresh token');
          reply.code(401);
          return { error: 'Invalid or expired refresh token' };
        }

        // Query household_members to get user's role
        const householdResult = await pool.query(
          'SELECT role FROM household_members WHERE user_id = $1 LIMIT 1',
          [decoded.userId],
        );

        const role = householdResult.rows.length > 0 ? householdResult.rows[0].role : undefined;

        // Generate new access token with role
        const accessToken = generateAccessToken(decoded.userId, result.rows[0].email, role);

        fastify.log.info({ userId: decoded.userId }, 'Token refreshed successfully');

        reply.code(200);
        return { accessToken };
      } catch (error: unknown) {
        // Handle JWT-specific errors
        if (error instanceof jwt.TokenExpiredError) {
          fastify.log.warn('Expired refresh token used');
          reply.code(401);
          return { error: 'Invalid or expired refresh token' };
        }

        if (error instanceof jwt.JsonWebTokenError) {
          fastify.log.warn({ error: (error as Error).message }, 'Invalid refresh token');
          reply.code(401);
          return { error: 'Invalid or expired refresh token' };
        }

        // Log error but don't expose internal details
        fastify.log.error(error, 'Token refresh error');
        reply.code(500);
        return { error: 'Token refresh failed' };
      }
    },
  );

  // Logout endpoint (requires authentication)
  fastify.post(
    '/logout',
    {
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      // In basic implementation, logout is client-side (delete tokens)
      // Future enhancement: Add token to blacklist in database
      fastify.log.info({ userId: request.user?.userId }, 'User logged out');
      reply.code(200);
      return { success: true, message: 'Logged out successfully' };
    },
  );

  // Google OAuth endpoint
  const googleAuthSchema = {
    body: {
      type: 'object',
      required: ['credential'],
      properties: {
        credential: { type: 'string' },
      },
    },
  };

  fastify.post<{ Body: GoogleAuthBody }>(
    '/google',
    {
      schema: googleAuthSchema,
    },
    async (request, reply) => {
      const { credential } = request.body;

      try {
        // Verify ID token with Google
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) {
          fastify.log.warn('Invalid Google token - no payload');
          reply.code(401);
          return { error: 'Invalid Google token' };
        }

        const { sub: googleId, email, name } = payload;

        if (!email) {
          fastify.log.warn('Google token missing email');
          reply.code(400);
          return { error: 'Email not provided by Google' };
        }

        // Check if user exists (by email or OAuth ID)
        const existingUserResult = await pool.query(
          'SELECT id, email FROM users WHERE email = $1 OR (oauth_provider = $2 AND oauth_provider_id = $3)',
          [email, 'google', googleId],
        );

        let userId: string;
        let userEmail: string;

        if (existingUserResult.rows.length === 0) {
          // Create new user with Google OAuth
          const insertResult = await pool.query(
            `INSERT INTO users (email, oauth_provider, oauth_provider_id)
             VALUES ($1, $2, $3)
             RETURNING id, email`,
            [email, 'google', googleId],
          );
          userId = insertResult.rows[0].id;
          userEmail = insertResult.rows[0].email;
          fastify.log.info({ userId, email: userEmail }, 'New user created via Google OAuth');
        } else {
          userId = existingUserResult.rows[0].id;
          userEmail = existingUserResult.rows[0].email;

          // Update OAuth info if user exists but doesn't have it yet
          const user = existingUserResult.rows[0];
          const needsOAuthUpdate = await pool.query(
            'SELECT oauth_provider FROM users WHERE id = $1',
            [userId],
          );

          if (needsOAuthUpdate.rows[0]?.oauth_provider !== 'google') {
            await pool.query(
              'UPDATE users SET oauth_provider = $1, oauth_provider_id = $2 WHERE id = $3',
              ['google', googleId, userId],
            );
            fastify.log.info({ userId }, 'Updated existing user with Google OAuth info');
          }

          fastify.log.info(
            { userId, email: userEmail },
            'Existing user logged in via Google OAuth',
          );
        }

        // Query household_members to get user's role and household
        const householdResult = await pool.query(
          'SELECT household_id, role FROM household_members WHERE user_id = $1 LIMIT 1',
          [userId],
        );

        let role: string | undefined;
        let householdId: string | undefined;

        if (householdResult.rows.length > 0) {
          role = householdResult.rows[0].role;
          householdId = householdResult.rows[0].household_id;
        }

        // Generate JWT tokens with role
        const accessToken = generateAccessToken(userId, userEmail, role);
        const refreshToken = generateRefreshToken(userId);

        reply.code(200);
        return {
          accessToken,
          refreshToken,
          userId,
          email: userEmail,
          role,
          householdId,
        };
      } catch (error) {
        fastify.log.error(error, 'Google OAuth error');
        reply.code(401);
        return { error: 'Google authentication failed' };
      }
    },
  );

  // Forgot password endpoint
  fastify.post<ForgotPasswordRequest, { Reply: ForgotPasswordResponse | ErrorResponse }>(
    '/forgot-password',
    {
      schema: forgotPasswordSchema,
    },
    async (request, reply) => {
      const { email } = request.body;
      const emailLower = email.toLowerCase();

      // Rate limiting: max 3 requests per email per hour
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      const attempts = forgotPasswordRateLimit.get(emailLower) || [];
      const recentAttempts = attempts.filter((timestamp) => timestamp > oneHourAgo);

      if (recentAttempts.length >= 3) {
        fastify.log.warn({ email: emailLower }, 'Password reset rate limit exceeded');
        reply.code(429);
        return { error: 'Too many password reset requests. Please try again later.' };
      }

      // Update rate limit
      recentAttempts.push(now);
      forgotPasswordRateLimit.set(emailLower, recentAttempts);

      try {
        // Check if user exists
        const userResult = await pool.query('SELECT id, email FROM users WHERE email = $1', [
          emailLower,
        ]);

        // Always return same message to prevent email enumeration
        const standardMessage = 'If an account exists with that email, a reset link has been sent.';

        if (userResult.rows.length === 0) {
          fastify.log.info({ email: emailLower }, 'Password reset requested for non-existent user');
          reply.code(200);
          return { message: standardMessage };
        }

        const user = userResult.rows[0];

        // Generate secure random token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Token expires in 1 hour
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        // Store token in database
        await pool.query(
          `INSERT INTO password_reset_tokens (user_id, token, expires_at, used)
           VALUES ($1, $2, $3, FALSE)`,
          [user.id, resetToken, expiresAt],
        );

        // Send password reset email
        const emailService = getEmailService(fastify.log);
        await emailService.sendPasswordResetEmail(user.email, {
          token: resetToken,
          expiresAt,
        });

        fastify.log.info({ userId: user.id }, 'Password reset email sent');

        reply.code(200);
        return { message: standardMessage };
      } catch (error) {
        fastify.log.error(error, 'Error processing password reset request');
        reply.code(500);
        return { error: 'Failed to process password reset request' };
      }
    },
  );

  // Reset password endpoint
  fastify.post<ResetPasswordRequest, { Reply: ResetPasswordResponse | ErrorResponse }>(
    '/reset-password',
    {
      schema: resetPasswordSchema,
    },
    async (request, reply) => {
      const { token, newPassword } = request.body;

      // Validate password strength
      if (!validatePasswordStrength(newPassword)) {
        reply.code(400);
        return {
          error:
            'Password must be at least 8 characters and include uppercase, lowercase, and number',
        };
      }

      try {
        // Find token and check if valid
        const tokenResult = await pool.query(
          `SELECT prt.id, prt.user_id, prt.expires_at, prt.used, u.email
           FROM password_reset_tokens prt
           JOIN users u ON prt.user_id = u.id
           WHERE prt.token = $1`,
          [token],
        );

        if (tokenResult.rows.length === 0) {
          fastify.log.warn('Invalid password reset token attempted');
          reply.code(401);
          return { error: 'Invalid or expired reset token' };
        }

        const resetData = tokenResult.rows[0];

        // Check if token has been used
        if (resetData.used) {
          fastify.log.warn(
            { userId: resetData.user_id },
            'Attempted to reuse password reset token',
          );
          reply.code(401);
          return { error: 'Reset token has already been used' };
        }

        // Check if token has expired
        if (new Date(resetData.expires_at) < new Date()) {
          fastify.log.warn({ userId: resetData.user_id }, 'Expired password reset token attempted');
          reply.code(401);
          return { error: 'Reset token has expired' };
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update user password and mark token as used (transaction)
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          await client.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [passwordHash, resetData.user_id],
          );

          await client.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [
            resetData.id,
          ]);

          await client.query('COMMIT');

          fastify.log.info({ userId: resetData.user_id }, 'Password reset successful');

          reply.code(200);
          return { message: 'Password reset successful. You can now log in.' };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (error) {
        fastify.log.error(error, 'Error resetting password');
        reply.code(500);
        return { error: 'Failed to reset password' };
      }
    },
  );

  // Protected test endpoint (requires authentication)
  fastify.get(
    '/protected',
    {
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      reply.code(200);
      return {
        message: 'This is protected data',
        user: {
          userId: request.user?.userId,
          email: request.user?.email,
        },
      };
    },
  );
}
