/**
 * User Schema Tests
 */
import { describe, it, expect } from 'vitest';
import {
  UserSchema,
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  LoginRequestSchema,
  GoogleOAuthRequestSchema,
  UserResponseSchema,
} from './user.schema.js';

describe('UserSchema', () => {
  it('validates correct user object', () => {
    const validUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      googleId: null,
      passwordHash: '$2b$10$abcdefg...',
      createdAt: '2025-12-22T10:00:00Z',
      updatedAt: '2025-12-22T10:00:00Z',
    };

    expect(() => UserSchema.parse(validUser)).not.toThrow();
    const parsed = UserSchema.parse(validUser);
    expect(parsed.email).toBe('test@example.com');
  });

  it('rejects invalid email', () => {
    const invalidUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'invalid-email',
      googleId: null,
      passwordHash: null,
      createdAt: '2025-12-22T10:00:00Z',
      updatedAt: '2025-12-22T10:00:00Z',
    };

    expect(() => UserSchema.parse(invalidUser)).toThrow();
  });

  it('rejects invalid UUID', () => {
    const invalidUser = {
      id: 'not-a-uuid',
      email: 'test@example.com',
      googleId: null,
      passwordHash: null,
      createdAt: '2025-12-22T10:00:00Z',
      updatedAt: '2025-12-22T10:00:00Z',
    };

    expect(() => UserSchema.parse(invalidUser)).toThrow();
  });
});

describe('CreateUserRequestSchema', () => {
  it('validates email-password registration', () => {
    const validRequest = {
      email: 'newuser@example.com',
      password: 'StrongPassword123',
    };

    expect(() => CreateUserRequestSchema.parse(validRequest)).not.toThrow();
  });

  it('validates Google OAuth registration', () => {
    const validRequest = {
      email: 'googleuser@example.com',
      googleId: 'google-oauth-id-123',
    };

    expect(() => CreateUserRequestSchema.parse(validRequest)).not.toThrow();
  });

  it('rejects password shorter than 8 characters', () => {
    const invalidRequest = {
      email: 'test@example.com',
      password: 'short',
    };

    expect(() => CreateUserRequestSchema.parse(invalidRequest)).toThrow();
  });

  it('rejects invalid email format', () => {
    const invalidRequest = {
      email: 'not-an-email',
      password: 'ValidPassword123',
    };

    expect(() => CreateUserRequestSchema.parse(invalidRequest)).toThrow();
  });
});

describe('LoginRequestSchema', () => {
  it('validates correct login credentials', () => {
    const validLogin = {
      email: 'user@example.com',
      password: 'password123',
    };

    expect(() => LoginRequestSchema.parse(validLogin)).not.toThrow();
  });

  it('rejects empty password', () => {
    const invalidLogin = {
      email: 'user@example.com',
      password: '',
    };

    expect(() => LoginRequestSchema.parse(invalidLogin)).toThrow();
  });
});

describe('UserResponseSchema', () => {
  it('excludes passwordHash field', () => {
    const user = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      googleId: null,
      createdAt: '2025-12-22T10:00:00Z',
      updatedAt: '2025-12-22T10:00:00Z',
    };

    const parsed = UserResponseSchema.parse(user);
    expect(parsed).not.toHaveProperty('passwordHash');
  });
});
