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
import { rateLimiters } from '../middleware/rate-limit.js';
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

// Local JWT token generation functions that include role and name (not in utils/jwt.ts)
function generateAccessToken(
  userId: string,
  email: string,
  role?: string,
  firstName?: string | null,
  lastName?: string | null,
): string {
  return jwt.sign({ userId, email, role, firstName, lastName, type: 'access' }, JWT_SECRET, {
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
    firstName: string;
    lastName: string;
  };
}

interface RegisterResponse {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
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
  firstName?: string | null;
  lastName?: string | null;
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

/**
 * Register authentication routes
 */
export default async function authRoutes(fastify: FastifyInstance) {
  // Registration endpoint
  fastify.post<RegisterRequest, { Reply: RegisterResponse | ErrorResponse }>(
    '/register',
    {
      schema: registerSchema,
      preHandler: rateLimiters.register,
    },
    async (request, reply) => {
      const { email, password, firstName, lastName } = request.body;

      // Validate password strength
      if (!validatePasswordStrength(password)) {
        return reply.code(400).send({
          error:
            'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        });
      }

      try {
        // Hash password with bcrypt (cost factor 12)
        const passwordHash = await bcrypt.hash(password, 12);

        // Use transaction to create user, household, and membership atomically
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Insert user into database with name fields
          const userResult = await client.query(
            `INSERT INTO users (email, password_hash, first_name, last_name)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, first_name, last_name`,
            [email, passwordHash, firstName, lastName],
          );

          const user = userResult.rows[0];

          // Create default household for new user
          const householdResult = await client.query(
            `INSERT INTO households (name)
             VALUES ($1)
             RETURNING id`,
            [`${firstName}'s Household`],
          );

          const householdId = householdResult.rows[0].id;

          // Add user as admin of their new household
          await client.query(
            `INSERT INTO household_members (household_id, user_id, role)
             VALUES ($1, $2, $3)`,
            [householdId, user.id, 'admin'],
          );

          await client.query('COMMIT');

          fastify.log.info({ userId: user.id, householdId }, 'User registered with new household');

          return reply.code(201).send({
            userId: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
          });
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (error: unknown) {
        // Handle duplicate email (PostgreSQL unique violation)
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
          if (!reply.sent) {
            return reply.code(409).send({ error: 'Email already registered' });
          }
          return; // Reply already sent by global error handler
        }

        // Log error but don't expose internal details to client
        fastify.log.error(error);
        if (!reply.sent) {
          return reply.code(500).send({ error: 'Registration failed' });
        }
        return; // Reply already sent by global error handler
      }
    },
  );

  // Login endpoint
  fastify.post<LoginRequest, { Reply: LoginResponse | ErrorResponse }>(
    '/login',
    {
      schema: loginSchema,
      preHandler: rateLimiters.login,
    },
    async (request, reply) => {
      // CRITICAL: Guard against double execution bug
      // Somehow async callbacks are firing handler again after reply is sent
      if (reply.sent) {
        fastify.log.warn(
          { reqId: request.id },
          'Login handler called but reply already sent - skipping',
        );
        return;
      }

      const { email, password } = request.body;
      const executionId = `${request.id}-${Date.now()}`;

      fastify.log.debug({ executionId, reqId: request.id }, '[LOGIN START]');

      try {
        // Query user by email, including name fields
        fastify.log.debug({ executionId }, '[LOGIN] Before user query');
        const result = await pool.query(
          'SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = $1',
          [email],
        );
        fastify.log.debug(
          { executionId, rowCount: result.rows.length },
          '[LOGIN] After user query',
        );

        // User not found - same error message for security
        if (result.rows.length === 0) {
          fastify.log.warn({ email }, 'Login attempt with non-existent email');
          return reply.code(401).send({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        // Compare password using bcrypt (timing-safe)
        fastify.log.debug({ executionId }, '[LOGIN] Before bcrypt compare');
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        fastify.log.debug({ executionId, passwordMatch }, '[LOGIN] After bcrypt compare');

        if (!passwordMatch) {
          fastify.log.warn({ userId: user.id, email }, 'Login attempt with wrong password');
          return reply.code(401).send({ error: 'Invalid email or password' });
        }

        // Query household_members to get user's role and household
        fastify.log.debug({ executionId }, '[LOGIN] Before household query');
        const householdResult = await pool.query(
          'SELECT household_id, role FROM household_members WHERE user_id = $1 LIMIT 1',
          [user.id],
        );
        fastify.log.debug(
          { executionId, rowCount: householdResult.rows.length },
          '[LOGIN] After household query',
        );

        let role: string | undefined;
        let householdId: string | undefined;

        if (householdResult.rows.length > 0) {
          role = householdResult.rows[0].role;
          householdId = householdResult.rows[0].household_id;
        }

        // Generate tokens with role and name
        fastify.log.debug({ executionId }, '[LOGIN] Before token generation');
        const accessToken = generateAccessToken(
          user.id,
          user.email,
          role,
          user.first_name,
          user.last_name,
        );
        const refreshToken = generateRefreshToken(user.id);
        fastify.log.debug({ executionId }, '[LOGIN] After token generation');

        fastify.log.info({ userId: user.id, email, role, householdId }, 'Successful login');

        fastify.log.debug({ executionId, replySent: reply.sent }, '[LOGIN] Before return send');
        return reply.code(200).send({
          accessToken,
          refreshToken,
          userId: user.id,
          email: user.email,
          role,
          householdId,
          firstName: user.first_name,
          lastName: user.last_name,
        });
      } catch (error: unknown) {
        // Log error but don't expose internal details
        fastify.log.error({ executionId, error }, 'Login error');
        if (!reply.sent) {
          return reply.code(500).send({ error: 'Authentication failed' });
        }
        return; // Reply already sent by global error handler
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
          return reply.code(401).send({ error: 'Invalid or expired refresh token' });
        }

        // Get user data from database
        const result = await pool.query(
          'SELECT email, first_name, last_name FROM users WHERE id = $1',
          [decoded.userId],
        );

        if (result.rows.length === 0) {
          fastify.log.warn({ userId: decoded.userId }, 'User not found for refresh token');
          return reply.code(401).send({ error: 'Invalid or expired refresh token' });
        }

        const user = result.rows[0];

        // Query household_members to get user's role
        const householdResult = await pool.query(
          'SELECT role FROM household_members WHERE user_id = $1 LIMIT 1',
          [decoded.userId],
        );

        const role = householdResult.rows.length > 0 ? householdResult.rows[0].role : undefined;

        // Generate new access token with role and name
        const accessToken = generateAccessToken(
          decoded.userId,
          user.email,
          role,
          user.first_name,
          user.last_name,
        );

        fastify.log.info({ userId: decoded.userId }, 'Token refreshed successfully');

        return reply.code(200).send({ accessToken });
      } catch (error: unknown) {
        // Handle JWT-specific errors
        if (error instanceof jwt.TokenExpiredError) {
          fastify.log.warn('Expired refresh token used');
          if (!reply.sent) {
            return reply.code(401).send({ error: 'Invalid or expired refresh token' });
          }
          return; // Reply already sent by global error handler
        }

        if (error instanceof jwt.JsonWebTokenError) {
          fastify.log.warn({ error: (error as Error).message }, 'Invalid refresh token');
          if (!reply.sent) {
            return reply.code(401).send({ error: 'Invalid or expired refresh token' });
          }
          return; // Reply already sent by global error handler
        }

        // Log error but don't expose internal details
        fastify.log.error(error, 'Token refresh error');
        if (!reply.sent) {
          return reply.code(500).send({ error: 'Token refresh failed' });
        }
        return; // Reply already sent by global error handler
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
      return reply.code(200).send({ success: true, message: 'Logged out successfully' });
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
          return reply.code(401).send({ error: 'Invalid Google token' });
        }

        const {
          sub: googleId,
          email,
          given_name: googleFirstName,
          family_name: googleLastName,
        } = payload;

        if (!email) {
          fastify.log.warn('Google token missing email');
          return reply.code(400).send({ error: 'Email not provided by Google' });
        }

        // Check if user exists (by email or OAuth ID)
        const existingUserResult = await pool.query(
          'SELECT id, email, first_name, last_name FROM users WHERE email = $1 OR (oauth_provider = $2 AND oauth_provider_id = $3)',
          [email, 'google', googleId],
        );

        let userId: string;
        let userEmail: string;
        let firstName: string | null = null;
        let lastName: string | null = null;

        if (existingUserResult.rows.length === 0) {
          // Create new user with Google OAuth including name from Google
          const insertResult = await pool.query(
            `INSERT INTO users (email, oauth_provider, oauth_provider_id, first_name, last_name)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, email, first_name, last_name`,
            [email, 'google', googleId, googleFirstName || null, googleLastName || null],
          );
          userId = insertResult.rows[0].id;
          userEmail = insertResult.rows[0].email;
          firstName = insertResult.rows[0].first_name;
          lastName = insertResult.rows[0].last_name;
          fastify.log.info({ userId, email: userEmail }, 'New user created via Google OAuth');
        } else {
          userId = existingUserResult.rows[0].id;
          userEmail = existingUserResult.rows[0].email;
          firstName = existingUserResult.rows[0].first_name;
          lastName = existingUserResult.rows[0].last_name;

          // Update OAuth info and name if user exists but doesn't have it yet
          const needsOAuthUpdate = await pool.query(
            'SELECT oauth_provider, first_name, last_name FROM users WHERE id = $1',
            [userId],
          );

          const updateFields: string[] = [];
          const updateValues: (string | null)[] = [];
          let paramIndex = 1;

          if (needsOAuthUpdate.rows[0]?.oauth_provider !== 'google') {
            updateFields.push(`oauth_provider = $${paramIndex++}`);
            updateValues.push('google');
            updateFields.push(`oauth_provider_id = $${paramIndex++}`);
            updateValues.push(googleId);
          }

          // Update name from Google if not set locally
          if (!firstName && googleFirstName) {
            updateFields.push(`first_name = $${paramIndex++}`);
            updateValues.push(googleFirstName);
            firstName = googleFirstName;
          }
          if (!lastName && googleLastName) {
            updateFields.push(`last_name = $${paramIndex++}`);
            updateValues.push(googleLastName);
            lastName = googleLastName;
          }

          if (updateFields.length > 0) {
            await pool.query(
              `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
              [...updateValues, userId],
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

        // Generate JWT tokens with role and name
        const accessToken = generateAccessToken(userId, userEmail, role, firstName, lastName);
        const refreshToken = generateRefreshToken(userId);

        return reply.code(200).send({
          accessToken,
          refreshToken,
          userId,
          email: userEmail,
          role,
          householdId,
          firstName,
          lastName,
        });
      } catch (error) {
        fastify.log.error(error, 'Google OAuth error');
        if (!reply.sent) {
          return reply.code(401).send({ error: 'Google authentication failed' });
        }
        return; // Reply already sent by global error handler
      }
    },
  );

  // Forgot password endpoint
  fastify.post<ForgotPasswordRequest, { Reply: ForgotPasswordResponse | ErrorResponse }>(
    '/forgot-password',
    {
      schema: forgotPasswordSchema,
      preHandler: rateLimiters.forgotPassword,
    },
    async (request, reply) => {
      const { email } = request.body;
      const emailLower = email.toLowerCase();

      try {
        // Check if user exists
        const userResult = await pool.query('SELECT id, email FROM users WHERE email = $1', [
          emailLower,
        ]);

        // Always return same message to prevent email enumeration
        const standardMessage = 'If an account exists with that email, a reset link has been sent.';

        if (userResult.rows.length === 0) {
          fastify.log.info({ email: emailLower }, 'Password reset requested for non-existent user');
          return reply.code(200).send({ message: standardMessage });
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

        return reply.code(200).send({ message: standardMessage });
      } catch (error) {
        fastify.log.error(error, 'Error processing password reset request');
        if (!reply.sent) {
          return reply.code(500).send({ error: 'Failed to process password reset request' });
        }
        return; // Reply already sent by global error handler
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
        return reply.code(400).send({
          error:
            'Password must be at least 8 characters and include uppercase, lowercase, and number',
        });
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
          return reply.code(401).send({ error: 'Invalid or expired reset token' });
        }

        const resetData = tokenResult.rows[0];

        // Check if token has been used
        if (resetData.used) {
          fastify.log.warn(
            { userId: resetData.user_id },
            'Attempted to reuse password reset token',
          );
          return reply.code(401).send({ error: 'Reset token has already been used' });
        }

        // Check if token has expired
        if (new Date(resetData.expires_at) < new Date()) {
          fastify.log.warn({ userId: resetData.user_id }, 'Expired password reset token attempted');
          return reply.code(401).send({ error: 'Reset token has expired' });
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

          return reply
            .code(200)
            .send({ message: 'Password reset successful. You can now log in.' });
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (error) {
        fastify.log.error(error, 'Error resetting password');
        if (!reply.sent) {
          return reply.code(500).send({ error: 'Failed to reset password' });
        }
        return; // Reply already sent by global error handler
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
      return reply.code(200).send({
        message: 'This is protected data',
        user: {
          userId: request.user?.userId,
          email: request.user?.email,
        },
      });
    },
  );
}
