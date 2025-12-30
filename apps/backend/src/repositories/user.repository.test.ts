/**
 * UserRepository Unit Tests
 *
 * Tests the UserRepository using mocked database connections.
 * No actual database is required to run these tests.
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { UserRepository, type CreateUserDto, type UpdateUserDto } from './user.repository.js';

// Mock Pool implementation
function createMockPool() {
  const queryMock = mock.fn();
  return {
    query: queryMock,
    connect: mock.fn(),
    end: mock.fn(),
  };
}

// Sample user row data
const sampleUserRow = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  name: 'Test User',
  password_hash: 'hashed_password',
  oauth_provider: null,
  oauth_provider_id: null,
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
};

const sampleOAuthUserRow = {
  ...sampleUserRow,
  id: '123e4567-e89b-12d3-a456-426614174001',
  email: 'oauth@example.com',
  password_hash: null,
  oauth_provider: 'google',
  oauth_provider_id: 'google-123',
};

const samplePasswordResetTokenRow = {
  id: '123e4567-e89b-12d3-a456-426614174002',
  user_id: sampleUserRow.id,
  token: 'reset-token-123',
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  used: false,
  created_at: new Date('2024-01-01T00:00:00Z'),
};

describe('UserRepository', () => {
  let pool: ReturnType<typeof createMockPool>;
  let repository: UserRepository;

  beforeEach(() => {
    pool = createMockPool();
    repository = new UserRepository(pool as never);
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleUserRow],
        rowCount: 1,
      }));

      const result = await repository.findById(sampleUserRow.id);

      assert.ok(result);
      assert.equal(result.id, sampleUserRow.id);
      assert.equal(result.email, sampleUserRow.email);
      assert.equal(result.name, sampleUserRow.name);
      assert.equal(result.passwordHash, sampleUserRow.password_hash);
    });

    it('should return null when user not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.findById('non-existent-id');

      assert.equal(result, null);
    });

    it('should call query with correct parameters', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.findById('test-id');

      assert.equal(pool.query.mock.callCount(), 1);
      const [query, params] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('SELECT'));
      assert.ok(query.includes('WHERE id = $1'));
      assert.deepEqual(params, ['test-id']);
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found by email', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleUserRow],
        rowCount: 1,
      }));

      const result = await repository.findByEmail('test@example.com');

      assert.ok(result);
      assert.equal(result.email, sampleUserRow.email);
    });

    it('should lowercase email before querying', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.findByEmail('TEST@EXAMPLE.COM');

      const [, params] = pool.query.mock.calls[0].arguments;
      assert.deepEqual(params, ['test@example.com']);
    });

    it('should return null when user not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.findByEmail('notfound@example.com');

      assert.equal(result, null);
    });
  });

  describe('findByOAuth', () => {
    it('should return a user when found by OAuth provider', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleOAuthUserRow],
        rowCount: 1,
      }));

      const result = await repository.findByOAuth('google', 'google-123');

      assert.ok(result);
      assert.equal(result.oauthProvider, 'google');
      assert.equal(result.oauthProviderId, 'google-123');
    });

    it('should return null when OAuth user not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.findByOAuth('google', 'non-existent');

      assert.equal(result, null);
    });

    it('should call query with correct parameters', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.findByOAuth('google', 'provider-id');

      const [query, params] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('oauth_provider = $1'));
      assert.ok(query.includes('oauth_provider_id = $2'));
      assert.deepEqual(params, ['google', 'provider-id']);
    });
  });

  describe('create', () => {
    it('should create a new user with password', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleUserRow],
        rowCount: 1,
      }));

      const data: CreateUserDto = {
        email: 'new@example.com',
        name: 'New User',
        passwordHash: 'hashed_password',
      };

      const result = await repository.create(data);

      assert.ok(result);
      assert.equal(result.email, sampleUserRow.email);
    });

    it('should create a new OAuth user', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleOAuthUserRow],
        rowCount: 1,
      }));

      const data: CreateUserDto = {
        email: 'oauth@example.com',
        oauthProvider: 'google',
        oauthProviderId: 'google-123',
      };

      const result = await repository.create(data);

      assert.ok(result);
      assert.equal(result.oauthProvider, 'google');
    });

    it('should lowercase email before inserting', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleUserRow],
        rowCount: 1,
      }));

      await repository.create({ email: 'NEW@EXAMPLE.COM' });

      const [, params] = pool.query.mock.calls[0].arguments;
      assert.equal(params[0], 'new@example.com');
    });

    it('should handle optional fields as null', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleUserRow],
        rowCount: 1,
      }));

      await repository.create({ email: 'test@example.com' });

      const [, params] = pool.query.mock.calls[0].arguments;
      assert.equal(params[1], null); // name
      assert.equal(params[2], null); // passwordHash
      assert.equal(params[3], null); // oauthProvider
      assert.equal(params[4], null); // oauthProviderId
    });
  });

  describe('update', () => {
    it('should update user email', async () => {
      const updatedRow = { ...sampleUserRow, email: 'updated@example.com' };
      pool.query.mock.mockImplementation(async () => ({
        rows: [updatedRow],
        rowCount: 1,
      }));

      const result = await repository.update(sampleUserRow.id, { email: 'UPDATED@EXAMPLE.COM' });

      assert.ok(result);
      const [, params] = pool.query.mock.calls[0].arguments;
      assert.equal(params[0], 'updated@example.com'); // lowercased
    });

    it('should update user name', async () => {
      const updatedRow = { ...sampleUserRow, name: 'Updated Name' };
      pool.query.mock.mockImplementation(async () => ({
        rows: [updatedRow],
        rowCount: 1,
      }));

      const result = await repository.update(sampleUserRow.id, { name: 'Updated Name' });

      assert.ok(result);
      assert.equal(result.name, 'Updated Name');
    });

    it('should return null when user not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.update('non-existent', { name: 'New Name' });

      assert.equal(result, null);
    });

    it('should return current user when no updates provided', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [sampleUserRow],
        rowCount: 1,
      }));

      const result = await repository.update(sampleUserRow.id, {});

      assert.ok(result);
      // Should call findById instead of UPDATE
      const [query] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('SELECT'));
    });
  });

  describe('updatePassword', () => {
    it('should update password and return true', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ id: sampleUserRow.id }],
        rowCount: 1,
      }));

      const result = await repository.updatePassword(sampleUserRow.id, 'new_hash');

      assert.equal(result, true);
    });

    it('should return false when user not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.updatePassword('non-existent', 'new_hash');

      assert.equal(result, false);
    });
  });

  describe('delete', () => {
    it('should delete user and return true', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ id: sampleUserRow.id }],
        rowCount: 1,
      }));

      const result = await repository.delete(sampleUserRow.id);

      assert.equal(result, true);
    });

    it('should return false when user not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.delete('non-existent');

      assert.equal(result, false);
    });
  });

  describe('emailExists', () => {
    it('should return true when email exists', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ id: 1 }],
        rowCount: 1,
      }));

      const result = await repository.emailExists('test@example.com');

      assert.equal(result, true);
    });

    it('should return false when email does not exist', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.emailExists('notfound@example.com');

      assert.equal(result, false);
    });

    it('should lowercase email before checking', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.emailExists('TEST@EXAMPLE.COM');

      const [, params] = pool.query.mock.calls[0].arguments;
      assert.deepEqual(params, ['test@example.com']);
    });
  });

  // Password Reset Token Tests

  describe('createPasswordResetToken', () => {
    it('should create a password reset token', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [samplePasswordResetTokenRow],
        rowCount: 1,
      }));

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = await repository.createPasswordResetToken(
        sampleUserRow.id,
        'token-123',
        expiresAt,
      );

      assert.ok(result);
      assert.equal(result.userId, sampleUserRow.id);
      assert.equal(result.token, samplePasswordResetTokenRow.token);
      assert.equal(result.used, false);
    });
  });

  describe('findValidPasswordResetToken', () => {
    it('should return token when valid and not expired', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [samplePasswordResetTokenRow],
        rowCount: 1,
      }));

      const result = await repository.findValidPasswordResetToken('reset-token-123');

      assert.ok(result);
      assert.equal(result.token, samplePasswordResetTokenRow.token);
    });

    it('should return null when token not found or expired', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.findValidPasswordResetToken('invalid-token');

      assert.equal(result, null);
    });

    it('should query with correct conditions', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      await repository.findValidPasswordResetToken('token');

      const [query] = pool.query.mock.calls[0].arguments;
      assert.ok(query.includes('used = false'));
      assert.ok(query.includes('expires_at > NOW()'));
    });
  });

  describe('markPasswordResetTokenUsed', () => {
    it('should mark token as used and return true', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ id: samplePasswordResetTokenRow.id }],
        rowCount: 1,
      }));

      const result = await repository.markPasswordResetTokenUsed(samplePasswordResetTokenRow.id);

      assert.equal(result, true);
    });

    it('should return false when token not found', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.markPasswordResetTokenUsed('non-existent');

      assert.equal(result, false);
    });
  });

  describe('deleteExpiredPasswordResetTokens', () => {
    it('should delete expired tokens and return count', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ id: '1' }, { id: '2' }],
        rowCount: 2,
      }));

      const result = await repository.deleteExpiredPasswordResetTokens(sampleUserRow.id);

      assert.equal(result, 2);
    });

    it('should return 0 when no tokens to delete', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.deleteExpiredPasswordResetTokens(sampleUserRow.id);

      assert.equal(result, 0);
    });
  });

  describe('deleteAllPasswordResetTokens', () => {
    it('should delete all tokens for user and return count', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ id: '1' }, { id: '2' }, { id: '3' }],
        rowCount: 3,
      }));

      const result = await repository.deleteAllPasswordResetTokens(sampleUserRow.id);

      assert.equal(result, 3);
    });
  });

  describe('getUserIdByPasswordResetToken', () => {
    it('should return user ID for valid token', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [{ user_id: sampleUserRow.id }],
        rowCount: 1,
      }));

      const result = await repository.getUserIdByPasswordResetToken('valid-token');

      assert.equal(result, sampleUserRow.id);
    });

    it('should return null for invalid token', async () => {
      pool.query.mock.mockImplementation(async () => ({
        rows: [],
        rowCount: 0,
      }));

      const result = await repository.getUserIdByPasswordResetToken('invalid-token');

      assert.equal(result, null);
    });
  });

  describe('withClient', () => {
    it('should create a new repository instance with client', () => {
      const mockClient = { query: mock.fn() };
      const newRepo = repository.withClient(mockClient as never);

      assert.ok(newRepo instanceof UserRepository);
      assert.notEqual(newRepo, repository);
    });
  });
});
