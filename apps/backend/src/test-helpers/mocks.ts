// Mocking utilities for backend tests
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function createMockPool() {
  return {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  } as unknown as Pool;
}

export function createMockBcrypt() {
  return {
    hash: jest.fn(async (pw) => `hashed-${pw}`),
    compare: jest.fn(async (pw, hash) => hash === `hashed-${pw}`),
  };
}

export function createMockJwt() {
  return {
    sign: jest.fn(() => 'mocked.jwt.token'),
    verify: jest.fn(() => ({ id: 'mock-user-id', email: 'mock@example.com' })),
  };
}
