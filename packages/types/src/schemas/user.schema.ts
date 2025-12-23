/**
 * User Schema - Authentication and user management
 */
import { z } from '../generators/openapi.generator.js';

/**
 * Base User Schema
 * Represents a user account in the system
 */
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  googleId: z.string().nullable(),
  passwordHash: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * User type inferred from schema
 */
export type User = z.infer<typeof UserSchema>;

/**
 * Request Schemas
 */

/**
 * Create User Request
 * Used for user registration
 */
export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128).optional(),
  googleId: z.string().optional(),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

/**
 * Update User Request
 * Used for updating user profile (partial update)
 */
export const UpdateUserRequestSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).max(128).optional(),
}).strict();

export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

/**
 * Login Request
 * Used for email/password authentication
 */
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * Google OAuth Request
 * Used for Google Sign-In
 */
export const GoogleOAuthRequestSchema = z.object({
  token: z.string().min(1),
});

export type GoogleOAuthRequest = z.infer<typeof GoogleOAuthRequestSchema>;

/**
 * User Response Schema (safe for public API)
 * Excludes sensitive fields like passwordHash
 */
export const UserResponseSchema = UserSchema.omit({
  passwordHash: true,
});

export type UserResponse = z.infer<typeof UserResponseSchema>;
