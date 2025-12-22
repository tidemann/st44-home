/**
 * Household Schema Tests
 */
import { describe, it, expect } from 'vitest';
import {
  HouseholdSchema,
  CreateHouseholdRequestSchema,
  UpdateHouseholdRequestSchema,
  InvitationSchema,
} from './household.schema.js';

describe('HouseholdSchema', () => {
  it('validates correct household object', () => {
    const validHousehold = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Smith Family',
      admin_user_id: '123e4567-e89b-12d3-a456-426614174001',
      created_at: '2025-12-22T10:00:00Z',
      updated_at: '2025-12-22T10:00:00Z',
    };

    expect(() => HouseholdSchema.parse(validHousehold)).not.toThrow();
    const parsed = HouseholdSchema.parse(validHousehold);
    expect(parsed.name).toBe('Smith Family');
  });

  it('rejects empty household name', () => {
    const invalidHousehold = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: '',
      admin_user_id: '123e4567-e89b-12d3-a456-426614174001',
      created_at: '2025-12-22T10:00:00Z',
      updated_at: '2025-12-22T10:00:00Z',
    };

    expect(() => HouseholdSchema.parse(invalidHousehold)).toThrow();
  });
});

describe('CreateHouseholdRequestSchema', () => {
  it('validates household creation', () => {
    const validRequest = {
      name: 'My Family',
    };

    expect(() => CreateHouseholdRequestSchema.parse(validRequest)).not.toThrow();
  });

  it('trims whitespace from name', () => {
    const request = {
      name: '  My Family  ',
    };

    const parsed = CreateHouseholdRequestSchema.parse(request);
    expect(parsed.name).toBe('My Family');
  });

  it('rejects empty name', () => {
    const invalidRequest = {
      name: '',
    };

    expect(() => CreateHouseholdRequestSchema.parse(invalidRequest)).toThrow();
  });
});

describe('InvitationSchema', () => {
  it('validates correct invitation', () => {
    const validInvitation = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      household_id: '123e4567-e89b-12d3-a456-426614174001',
      email: 'invited@example.com',
      token: 'abc123token',
      invited_by_user_id: '123e4567-e89b-12d3-a456-426614174002',
      expires_at: '2025-12-29T10:00:00Z',
      created_at: '2025-12-22T10:00:00Z',
    };

    expect(() => InvitationSchema.parse(validInvitation)).not.toThrow();
  });

  it('rejects invalid email', () => {
    const invalidInvitation = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      household_id: '123e4567-e89b-12d3-a456-426614174001',
      email: 'not-an-email',
      token: 'abc123token',
      invited_by_user_id: '123e4567-e89b-12d3-a456-426614174002',
      expires_at: '2025-12-29T10:00:00Z',
      created_at: '2025-12-22T10:00:00Z',
    };

    expect(() => InvitationSchema.parse(invalidInvitation)).toThrow();
  });
});
