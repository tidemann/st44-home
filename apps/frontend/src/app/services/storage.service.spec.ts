import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { z } from 'zod';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;
  let localStorageMock: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create mock localStorage
    localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };

    // Replace global localStorage with mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    TestBed.configureTestingModule({
      providers: [StorageService],
    });

    service = TestBed.inject(StorageService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should return null when key does not exist', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = service.get('nonexistent', z.string());

      expect(result).toBeNull();
      expect(localStorageMock.getItem).toHaveBeenCalledWith('nonexistent');
    });

    it('should return parsed JSON object', () => {
      const testObj = { name: 'test', value: 123 };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(testObj));

      const result = service.get('myKey', z.object({ name: z.string(), value: z.number() }));

      expect(result).toEqual(testObj);
    });

    it('should return plain string without JSON parsing', () => {
      localStorageMock.getItem.mockReturnValue('simple-string-value');

      const result = service.get('token', z.string());

      expect(result).toBe('simple-string-value');
    });

    it('should validate against Zod schema and return null on failure', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ wrong: 'shape' }));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Intentionally empty - suppress console output in tests
      });

      const result = service.get('myKey', z.object({ name: z.string() }));

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return value without validation when no schema provided', () => {
      const testObj = { anything: 'goes' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(testObj));

      const result = service.get<typeof testObj>('myKey');

      expect(result).toEqual(testObj);
    });

    it('should handle JSON parse errors gracefully', () => {
      localStorageMock.getItem.mockReturnValue('not valid json {{{');

      const result = service.get('myKey', z.string());

      // Should treat non-JSON as plain string
      expect(result).toBe('not valid json {{{');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Intentionally empty - suppress console output in tests
      });

      const result = service.get('myKey', z.string());

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('get with TTL', () => {
    it('should return value when TTL has not expired', () => {
      const ttlItem = {
        value: 'test-value',
        expiresAt: Date.now() + 10000, // 10 seconds in future
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(ttlItem));

      const result = service.get('myKey', z.string());

      expect(result).toBe('test-value');
    });

    it('should return null and remove item when TTL has expired', () => {
      const ttlItem = {
        value: 'test-value',
        expiresAt: Date.now() - 1000, // 1 second in past
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(ttlItem));

      const result = service.get('myKey', z.string());

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('myKey');
    });
  });

  describe('getString', () => {
    it('should return raw string value without parsing', () => {
      localStorageMock.getItem.mockReturnValue('raw-token-value');

      const result = service.getString('accessToken');

      expect(result).toBe('raw-token-value');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('accessToken');
    });

    it('should return null when key does not exist', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = service.getString('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Intentionally empty - suppress console output in tests
      });

      const result = service.getString('myKey');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('set', () => {
    it('should store string value directly', () => {
      service.set('token', 'my-jwt-token');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'my-jwt-token');
    });

    it('should JSON stringify objects', () => {
      const testObj = { name: 'test', value: 123 };

      service.set('myKey', testObj);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('myKey', JSON.stringify(testObj));
    });

    it('should JSON stringify arrays', () => {
      const testArr = [1, 2, 3];

      service.set('myKey', testArr);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('myKey', JSON.stringify(testArr));
    });

    it('should JSON stringify numbers', () => {
      service.set('myKey', 42);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('myKey', JSON.stringify(42));
    });

    it('should JSON stringify booleans', () => {
      service.set('myKey', true);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('myKey', JSON.stringify(true));
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Quota exceeded');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Intentionally empty - suppress console output in tests
      });

      // Should not throw
      service.set('myKey', 'value');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('setWithTTL', () => {
    it('should store value with expiration timestamp', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      service.setWithTTL('myKey', 'test-value', 3600000); // 1 hour

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'myKey',
        JSON.stringify({
          value: 'test-value',
          expiresAt: now + 3600000,
        }),
      );
    });

    it('should store objects with TTL', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);
      const testObj = { data: 'test' };

      service.setWithTTL('myKey', testObj, 60000); // 1 minute

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'myKey',
        JSON.stringify({
          value: testObj,
          expiresAt: now + 60000,
        }),
      );
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Quota exceeded');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Intentionally empty - suppress console output in tests
      });

      // Should not throw
      service.setWithTTL('myKey', 'value', 1000);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('remove', () => {
    it('should remove item from localStorage', () => {
      service.remove('myKey');

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('myKey');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Intentionally empty - suppress console output in tests
      });

      // Should not throw
      service.remove('myKey');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('clear', () => {
    it('should clear all localStorage items', () => {
      service.clear();

      expect(localStorageMock.clear).toHaveBeenCalled();
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.clear.mockImplementation(() => {
        throw new Error('Storage error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Intentionally empty - suppress console output in tests
      });

      // Should not throw
      service.clear();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('has', () => {
    it('should return true when key exists', () => {
      localStorageMock.getItem.mockReturnValue('some-value');

      expect(service.has('existingKey')).toBe(true);
    });

    it('should return false when key does not exist', () => {
      localStorageMock.getItem.mockReturnValue(null);

      expect(service.has('nonexistentKey')).toBe(false);
    });

    it('should return false on localStorage error', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(service.has('myKey')).toBe(false);
    });
  });

  describe('Zod Schema Validation', () => {
    it('should validate string schema', () => {
      localStorageMock.getItem.mockReturnValue('"hello"');

      const result = service.get('myKey', z.string());

      expect(result).toBe('hello');
    });

    it('should validate number schema', () => {
      localStorageMock.getItem.mockReturnValue('42');

      const result = service.get('myKey', z.number());

      expect(result).toBe(42);
    });

    it('should validate boolean schema', () => {
      localStorageMock.getItem.mockReturnValue('true');

      const result = service.get('myKey', z.boolean());

      expect(result).toBe(true);
    });

    it('should validate enum schema', () => {
      localStorageMock.getItem.mockReturnValue('"mine"');

      const FilterSchema = z.enum(['all', 'mine', 'person', 'completed']);
      const result = service.get('tasksFilter', FilterSchema);

      expect(result).toBe('mine');
    });

    it('should return null for invalid enum value', () => {
      localStorageMock.getItem.mockReturnValue('"invalid"');
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Intentionally empty - suppress console output in tests
      });

      const FilterSchema = z.enum(['all', 'mine', 'person', 'completed']);
      const result = service.get('tasksFilter', FilterSchema);

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should validate complex object schema', () => {
      const userData = {
        id: 'user-1',
        email: 'test@example.com',
        settings: {
          theme: 'dark',
          notifications: true,
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));

      const UserSchema = z.object({
        id: z.string(),
        email: z.string().email(),
        settings: z.object({
          theme: z.enum(['light', 'dark']),
          notifications: z.boolean(),
        }),
      });

      const result = service.get('user', UserSchema);

      expect(result).toEqual(userData);
    });

    it('should validate array schema', () => {
      const items = ['item1', 'item2', 'item3'];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(items));

      const result = service.get('items', z.array(z.string()));

      expect(result).toEqual(items);
    });

    it('should handle nullable schema', () => {
      localStorageMock.getItem.mockReturnValue('null');

      const result = service.get('myKey', z.string().nullable());

      expect(result).toBeNull();
    });

    it('should handle optional fields in object schema', () => {
      const partialData = { required: 'value' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(partialData));

      const Schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });

      const result = service.get('myKey', Schema);

      expect(result).toEqual(partialData);
    });
  });
});
