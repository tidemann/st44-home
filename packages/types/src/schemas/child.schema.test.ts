/**
 * Child Schema Tests
 */
import { describe, it, expect } from 'vitest';
import {
  ChildSchema,
  CreateChildRequestSchema,
  UpdateChildRequestSchema,
} from './child.schema.js';

describe('ChildSchema', () => {
  it('validates correct child object', () => {
    const validChild = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      householdId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Alice',
      birthYear: 2015,
      avatarUrl: 'https://example.com/avatar.jpg',
      createdAt: '2025-12-22T10:00:00Z',
      updatedAt: '2025-12-22T10:00:00Z',
    };

    expect(() => ChildSchema.parse(validChild)).not.toThrow();
    const parsed = ChildSchema.parse(validChild);
    expect(parsed.name).toBe('Alice');
  });

  it('validates child without optional fields', () => {
    const validChild = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      householdId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Bob',
      birthYear: null,
      avatarUrl: null,
      createdAt: '2025-12-22T10:00:00Z',
      updatedAt: '2025-12-22T10:00:00Z',
    };

    expect(() => ChildSchema.parse(validChild)).not.toThrow();
  });

  it('rejects empty child name', () => {
    const invalidChild = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      householdId: '123e4567-e89b-12d3-a456-426614174001',
      name: '',
      birthYear: null,
      avatarUrl: null,
      createdAt: '2025-12-22T10:00:00Z',
      updatedAt: '2025-12-22T10:00:00Z',
    };

    expect(() => ChildSchema.parse(invalidChild)).toThrow();
  });

  it('rejects invalid avatar URL', () => {
    const invalidChild = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      householdId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Charlie',
      birthYear: null,
      avatarUrl: 'not-a-url',
      createdAt: '2025-12-22T10:00:00Z',
      updatedAt: '2025-12-22T10:00:00Z',
    };

    expect(() => ChildSchema.parse(invalidChild)).toThrow();
  });
});

describe('CreateChildRequestSchema', () => {
  it('validates minimal child creation', () => {
    const validRequest = {
      name: 'New Child',
    };

    expect(() => CreateChildRequestSchema.parse(validRequest)).not.toThrow();
  });

  it('validates child with birth year', () => {
    const validRequest = {
      name: 'Child with Birth Year',
      birthYear: 2018,
    };

    expect(() => CreateChildRequestSchema.parse(validRequest)).not.toThrow();
  });

  it('trims whitespace from name', () => {
    const request = {
      name: '  Alice  ',
    };

    const parsed = CreateChildRequestSchema.parse(request);
    expect(parsed.name).toBe('Alice');
  });

  it('rejects empty name', () => {
    const invalidRequest = {
      name: '',
    };

    expect(() => CreateChildRequestSchema.parse(invalidRequest)).toThrow();
  });
});

describe('UpdateChildRequestSchema', () => {
  it('validates partial update', () => {
    const validRequest = {
      name: 'Updated Name',
    };

    expect(() => UpdateChildRequestSchema.parse(validRequest)).not.toThrow();
  });

  it('validates clearing birth year', () => {
    const validRequest = {
      birthYear: null,
    };

    expect(() => UpdateChildRequestSchema.parse(validRequest)).not.toThrow();
  });
});
