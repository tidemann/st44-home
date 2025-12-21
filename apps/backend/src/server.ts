import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { pool } from './database.js';
import householdRoutes from './routes/households.js';
import childrenRoutes from './routes/children.js';
import taskRoutes from './routes/tasks.js';
import { invitationRoutes } from './routes/invitations.js';
import assignmentRoutes from './routes/assignments.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  googleAuthSchema,
  healthCheckSchema,
} from './schemas/auth.js';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_ACCESS_EXPIRY = '1h';
const JWT_REFRESH_EXPIRY = '7d';

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// JWT Utility Functions
function generateAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email, type: 'access' }, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRY,
  });
}

function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });
}

// Helper Functions
function validatePasswordStrength(password: string): boolean {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return password.length >= 8 && hasUpperCase && hasLowerCase && hasNumber;
}

// Extend FastifyRequest type to include user info
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
    };
  }
}

// Authentication Middleware
interface AccessTokenPayload {
  userId: string;
  email: string;
  type: string;
  iat: number;
  exp: number;
}

// Build Fastify app with ALL routes
async function buildApp() {
  const fastify = Fastify({
    logger: true,
  });

  // Register CORS
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
  });

  // Register Swagger for API documentation (skip in test environment)
  if (process.env.NODE_ENV !== 'test') {
    await fastify.register(swagger, {
      openapi: {
        info: {
          title: 'Diddit API',
          description: 'Multi-tenant household chores management API',
          version: '1.0.0',
        },
        servers: [
          {
            url: 'http://localhost:3000',
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        tags: [
          { name: 'auth', description: 'Authentication endpoints' },
          { name: 'households', description: 'Household management' },
          { name: 'children', description: 'Child profile management' },
          { name: 'tasks', description: 'Task template management' },
          { name: 'assignments', description: 'Task assignment management' },
          { name: 'invitations', description: 'Household invitation system' },
        ],
      },
    });
  }

  // Register Swagger UI (skip in test environment)
  if (process.env.NODE_ENV !== 'test') {
    await fastify.register(swaggerUi, {
      routePrefix: '/api/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
      staticCSP: true,
    });
  }

  // Authentication Middleware
  async function authenticateUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          error: 'Missing or invalid authorization header',
        });
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix

      // Verify token with JWT_SECRET
      const decoded = jwt.verify(token, JWT_SECRET) as AccessTokenPayload;

      // Verify it's an access token (not refresh token)
      if (decoded.type !== 'access') {
        fastify.log.warn('Attempted to use non-access token for authentication');
        return reply.code(401).send({
          error: 'Invalid token type',
        });
      }

      // Attach user info to request
      request.user = {
        userId: decoded.userId,
        email: decoded.email,
      };

      // Middleware successful - continue to route handler
    } catch (error: unknown) {
      // Handle JWT-specific errors
      if (error instanceof jwt.TokenExpiredError) {
        return reply.code(401).send({
          error: 'Token expired',
        });
      }

      if (error instanceof jwt.JsonWebTokenError) {
        fastify.log.warn({ error: (error as Error).message }, 'Invalid token');
        return reply.code(401).send({
          error: 'Invalid token',
        });
      }

      // Log error but don't expose internal details
      fastify.log.error(error, 'Authentication error');
      return reply.code(500).send({
        error: 'Authentication failed',
      });
    }
  }

  // Register auth routes
  await fastify.register(async (fastify) => {
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

    // Registration endpoint
    fastify.post<RegisterRequest, { Reply: RegisterResponse | ErrorResponse }>(
      '/api/auth/register',
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
      '/api/auth/login',
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

          // Generate tokens
          const accessToken = generateAccessToken(user.id, user.email);
          const refreshToken = generateRefreshToken(user.id);

          fastify.log.info({ userId: user.id, email }, 'Successful login');

          reply.code(200);
          return {
            message: 'Login successful',
            user: {
              id: user.id,
              email: user.email,
            },
            accessToken,
            refreshToken,
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
      '/api/auth/refresh',
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
          const result = await pool.query('SELECT email FROM users WHERE id = $1', [
            decoded.userId,
          ]);

          if (result.rows.length === 0) {
            fastify.log.warn({ userId: decoded.userId }, 'User not found for refresh token');
            reply.code(401);
            return { error: 'Invalid or expired refresh token' };
          }

          // Generate new access token
          const accessToken = generateAccessToken(decoded.userId, result.rows[0].email);

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
      '/api/auth/logout',
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
    interface GoogleAuthBody {
      credential: string;
    }

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
      '/api/auth/google',
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

          // Generate JWT tokens (same as email/password login)
          const accessToken = generateAccessToken(userId, userEmail);
          const refreshToken = generateRefreshToken(userId);

          reply.code(200);
          return {
            accessToken,
            refreshToken,
            userId,
            email: userEmail,
          };
        } catch (error) {
          fastify.log.error(error, 'Google OAuth error');
          reply.code(401);
          return { error: 'Google authentication failed' };
        }
      },
    );

    // Protected test endpoint (requires authentication)
    fastify.get(
      '/api/protected',
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
  });

  // Register household, children, invitation, task, and assignment routes
  await fastify.register(householdRoutes);
  await fastify.register(childrenRoutes);
  await fastify.register(taskRoutes);
  await fastify.register(invitationRoutes);
  await fastify.register(assignmentRoutes);

  // Example items endpoint
  interface Item {
    id: number;
    title: string;
    description: string | null;
    created_at: Date;
    updated_at: Date;
  }

  fastify.get<{ Reply: { items: Item[] } | { error: string } }>(
    '/api/items',
    async (request, reply) => {
      try {
        const result = await pool.query<Item>('SELECT * FROM items ORDER BY created_at DESC');
        return { items: result.rows };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { error: 'Failed to fetch items' };
      }
    },
  );

  // Health Check Endpoints

  // Basic health check
  fastify.get(
    '/health',
    {
      schema: healthCheckSchema,
    },
    async () => {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      };
    },
  );

  // Database health check with schema validation
  fastify.get('/health/database', async (request, reply) => {
    const healthCheck = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        responseTime: 0,
        error: undefined as string | undefined,
      },
      migrations: {
        applied: [] as string[],
        latest: null as string | null,
        count: 0,
        warning: undefined as string | undefined,
      },
      schema: {
        critical_tables: [] as Array<{ name: string; exists: boolean }>,
        all_tables_exist: false,
      },
    };

    try {
      // Check database connectivity
      const startTime = Date.now();
      try {
        await pool.query('SELECT 1');
        healthCheck.database.connected = true;
        healthCheck.database.responseTime = Date.now() - startTime;
      } catch (error) {
        healthCheck.database.connected = false;
        healthCheck.database.error = error instanceof Error ? error.message : 'Connection failed';
        healthCheck.status = 'unhealthy';
        return reply.code(503).send(healthCheck);
      }

      // Check migrations
      try {
        const result = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
        healthCheck.migrations.applied = result.rows.map((row) => row.version);
        healthCheck.migrations.count = result.rows.length;
        healthCheck.migrations.latest = result.rows[result.rows.length - 1]?.version || null;

        // Expected migrations: 000, 001, 011-016 = 8 total
        const expectedCount = 8;
        if (healthCheck.migrations.count < expectedCount) {
          healthCheck.migrations.warning = `Expected ${expectedCount} migrations, only ${healthCheck.migrations.count} applied`;
          healthCheck.status = 'degraded';
        }
      } catch (error) {
        healthCheck.migrations.warning = 'schema_migrations table not found';
        healthCheck.status = 'degraded';
      }

      // Check critical tables exist
      const criticalTables = [
        'users',
        'households',
        'household_members',
        'children',
        'tasks',
        'task_assignments',
        'task_completions',
      ];

      for (const tableName of criticalTables) {
        try {
          const result = await pool.query(
            `SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = $1
            )`,
            [tableName],
          );
          const exists = result.rows[0]?.exists || false;
          healthCheck.schema.critical_tables.push({ name: tableName, exists });
        } catch (error) {
          healthCheck.schema.critical_tables.push({ name: tableName, exists: false });
        }
      }

      healthCheck.schema.all_tables_exist = healthCheck.schema.critical_tables.every(
        (t) => t.exists,
      );

      if (!healthCheck.schema.all_tables_exist) {
        healthCheck.status = 'degraded';
      }

      // Return appropriate status code
      const statusCode = healthCheck.status === 'unhealthy' ? 503 : 200;
      return reply.code(statusCode).send(healthCheck);
    } catch (error) {
      fastify.log.error({ error }, 'Health check failed');
      return reply.code(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return fastify;
}

// Create module-level instance for direct server execution
const fastify = await buildApp();

// Export build function for testing
export async function build() {
  return buildApp();
}

// Start server only if this module is run directly (not imported for tests)
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`🚀 Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Only start server if running directly (not imported by tests)
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
