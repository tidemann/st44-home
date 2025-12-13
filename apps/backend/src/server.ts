import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import pg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const { Pool } = pg;

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'st44',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Create Fastify instance
const fastify = Fastify({
  logger: true,
});

// Register CORS
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
});

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_ACCESS_EXPIRY = '1h';
const JWT_REFRESH_EXPIRY = '7d';

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

// JSON Schema for Registration
const registerSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        maxLength: 255,
      },
      password: {
        type: 'string',
        minLength: 8,
        maxLength: 128,
      },
    },
  },
};

// JSON Schema for Login
const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
      },
      password: {
        type: 'string',
      },
    },
  },
};

// JSON Schema for Token Refresh
const refreshSchema = {
  body: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: {
        type: 'string',
      },
    },
  },
};

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  try {
    await pool.query('SELECT 1');
    return { status: 'ok', database: 'connected' };
  } catch (error) {
    reply.code(503);
    return {
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

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
        accessToken,
        refreshToken,
        userId: user.id,
        email: user.email,
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
    schema: refreshSchema,
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

interface Item {
  id: number;
  title: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

// Example API endpoint
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

// Start server
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

start();
