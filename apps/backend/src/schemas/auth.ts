/**
 * OpenAPI schemas for authentication endpoints
 * NOTE: Currently using camelCase to match existing backend responses
 * TODO: Migrate backend to snake_case and update these schemas
 */

import { errorResponseSchema, stripResponseValidation } from './common.js';

// POST /api/auth/register
const registerSchemaBase = {
  summary: 'Register new user account',
  description: 'Create a new user account with email and password',
  tags: ['auth'],
  body: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'User email address',
      },
      password: {
        type: 'string',
        minLength: 8,
        description: 'Password (min 8 chars, must include uppercase, lowercase, and number)',
      },
    },
    required: ['email', 'password'],
  },
  response: {
    201: {
      description: 'User registered successfully',
      type: 'object',
      properties: {
        userId: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
      },
      required: ['userId', 'email'],
    },
    400: {
      description: 'Invalid request (weak password, invalid email, etc.)',
      ...errorResponseSchema,
    },
    409: {
      description: 'Email already registered',
      ...errorResponseSchema,
    },
    500: {
      description: 'Server error',
      ...errorResponseSchema,
    },
  },
} as const;

export const registerSchema = stripResponseValidation(registerSchemaBase);

// POST /api/auth/login
const loginSchemaBase = {
  summary: 'Login with email and password',
  description: 'Authenticate user and receive JWT tokens',
  tags: ['auth'],
  body: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string' },
    },
    required: ['email', 'password'],
  },
  response: {
    200: {
      description: 'Login successful',
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'JWT access token (1h expiry)' },
        refreshToken: { type: 'string', description: 'JWT refresh token (7d expiry)' },
        userId: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
      },
      required: ['accessToken', 'refreshToken', 'userId', 'email'],
    },
    400: {
      description: 'Invalid request',
      ...errorResponseSchema,
    },
    401: {
      description: 'Invalid credentials',
      ...errorResponseSchema,
    },
    500: {
      description: 'Server error',
      ...errorResponseSchema,
    },
  },
} as const;

export const loginSchema = stripResponseValidation(loginSchemaBase);

// POST /api/auth/refresh
const refreshTokenSchemaBase = {
  summary: 'Refresh access token',
  description: 'Get new access token using refresh token',
  tags: ['auth'],
  body: {
    type: 'object',
    properties: {
      refreshToken: { type: 'string', description: 'Valid refresh token' },
    },
    required: ['refreshToken'],
  },
  response: {
    200: {
      description: 'Token refreshed successfully',
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
      required: ['accessToken', 'refreshToken'],
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

export const refreshTokenSchema = stripResponseValidation(refreshTokenSchemaBase);

// POST /api/auth/google
const googleAuthSchemaBase = {
  summary: 'Authenticate with Google OAuth',
  description: 'Login or register using Google OAuth token',
  tags: ['auth'],
  body: {
    type: 'object',
    properties: {
      credential: { type: 'string', description: 'Google OAuth ID token' },
    },
    required: ['credential'],
  },
  response: {
    200: {
      description: 'Authentication successful',
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        userId: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
      },
      required: ['accessToken', 'refreshToken', 'userId', 'email'],
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

export const googleAuthSchema = stripResponseValidation(googleAuthSchemaBase);

// GET /health
const healthCheckSchemaBase = {
  summary: 'Health check endpoint',
  description: 'Check if API and database are operational',
  tags: ['health'],
  response: {
    200: {
      description: 'Service is healthy',
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok'] },
        timestamp: { type: 'string', format: 'date-time' },
        database: { type: 'string', enum: ['connected', 'disconnected'] },
      },
      required: ['status', 'timestamp', 'database'],
    },
  },
} as const;

export const healthCheckSchema = stripResponseValidation(healthCheckSchemaBase);

// POST /api/auth/forgot-password
const forgotPasswordSchemaBase = {
  summary: 'Request password reset',
  description: 'Send password reset email to user (if account exists)',
  tags: ['auth'],
  body: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'Email address to send reset link',
      },
    },
    required: ['email'],
  },
  response: {
    200: {
      description: 'Request processed (always returns same message for security)',
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Generic success message',
        },
      },
      required: ['message'],
    },
    400: errorResponseSchema,
    429: {
      description: 'Rate limit exceeded (max 3 requests per email per hour)',
      ...errorResponseSchema,
    },
    500: errorResponseSchema,
  },
} as const;

export const forgotPasswordSchema = stripResponseValidation(forgotPasswordSchemaBase);

// POST /api/auth/reset-password
const resetPasswordSchemaBase = {
  summary: 'Reset password with token',
  description: 'Complete password reset using valid token from email',
  tags: ['auth'],
  body: {
    type: 'object',
    properties: {
      token: {
        type: 'string',
        description: 'Password reset token from email',
      },
      newPassword: {
        type: 'string',
        minLength: 8,
        description: 'New password (min 8 chars, must include uppercase, lowercase, and number)',
      },
    },
    required: ['token', 'newPassword'],
  },
  response: {
    200: {
      description: 'Password reset successful',
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Success message',
        },
      },
      required: ['message'],
    },
    400: {
      description: 'Invalid request (weak password, invalid token, etc.)',
      ...errorResponseSchema,
    },
    401: {
      description: 'Token expired or already used',
      ...errorResponseSchema,
    },
    500: errorResponseSchema,
  },
} as const;

export const resetPasswordSchema = stripResponseValidation(resetPasswordSchemaBase);
