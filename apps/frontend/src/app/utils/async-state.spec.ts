import { describe, it, expect, beforeEach } from 'vitest';
import { AsyncState, createAsyncState } from './async-state';
import { of, throwError, delay } from 'rxjs';

describe('AsyncState', () => {
  let asyncState: AsyncState<string>;

  beforeEach(() => {
    asyncState = new AsyncState<string>();
  });

  describe('initial state', () => {
    it('should start in idle state', () => {
      expect(asyncState.state()).toEqual({ status: 'idle' });
      expect(asyncState.isIdle()).toBe(true);
      expect(asyncState.isLoading()).toBe(false);
      expect(asyncState.isSuccess()).toBe(false);
      expect(asyncState.isError()).toBe(false);
      expect(asyncState.data()).toBeNull();
      expect(asyncState.error()).toBeNull();
    });
  });

  describe('execute', () => {
    it('should set loading state during execution', async () => {
      let resolvePromise: (value: string) => void;
      const promise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });

      const executePromise = asyncState.execute(() => promise);

      expect(asyncState.state()).toEqual({ status: 'loading' });
      expect(asyncState.isLoading()).toBe(true);
      expect(asyncState.isIdle()).toBe(false);

      resolvePromise!('test data');
      await executePromise;
    });

    it('should set success state with data on successful execution', async () => {
      const testData = 'test data';

      await asyncState.execute(async () => testData);

      expect(asyncState.state()).toEqual({ status: 'success', data: testData });
      expect(asyncState.isSuccess()).toBe(true);
      expect(asyncState.data()).toBe(testData);
      expect(asyncState.isLoading()).toBe(false);
      expect(asyncState.error()).toBeNull();
    });

    it('should set error state with Error message on failure', async () => {
      const errorMessage = 'Something went wrong';

      await asyncState.execute(async () => {
        throw new Error(errorMessage);
      });

      expect(asyncState.state()).toEqual({ status: 'error', error: errorMessage });
      expect(asyncState.isError()).toBe(true);
      expect(asyncState.error()).toBe(errorMessage);
      expect(asyncState.isLoading()).toBe(false);
      expect(asyncState.data()).toBeNull();
    });

    it('should handle string errors', async () => {
      const errorMessage = 'String error message';

      await asyncState.execute(async () => {
        throw errorMessage;
      });

      expect(asyncState.error()).toBe(errorMessage);
    });

    it('should handle object errors with message property', async () => {
      const errorMessage = 'Object error message';

      await asyncState.execute(async () => {
        throw { message: errorMessage };
      });

      expect(asyncState.error()).toBe(errorMessage);
    });

    it('should handle unknown error types', async () => {
      await asyncState.execute(async () => {
        throw 123;
      });

      expect(asyncState.error()).toBe('An unexpected error occurred');
    });

    it('should handle null error', async () => {
      await asyncState.execute(async () => {
        throw null;
      });

      expect(asyncState.error()).toBe('An unexpected error occurred');
    });
  });

  describe('executeObservable', () => {
    it('should handle successful Observable', async () => {
      const testData = 'observable data';
      const observable = of(testData);

      await asyncState.executeObservable(observable);

      expect(asyncState.isSuccess()).toBe(true);
      expect(asyncState.data()).toBe(testData);
    });

    it('should handle Observable error', async () => {
      const errorMessage = 'Observable error';
      const observable = throwError(() => new Error(errorMessage));

      await asyncState.executeObservable(observable);

      expect(asyncState.isError()).toBe(true);
      expect(asyncState.error()).toBe(errorMessage);
    });

    it('should set loading state while Observable is pending', async () => {
      const observable = of('data').pipe(delay(0));
      const executePromise = asyncState.executeObservable(observable);

      // Check loading state immediately
      expect(asyncState.isLoading()).toBe(true);

      await executePromise;
      expect(asyncState.isSuccess()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset state to idle from success', async () => {
      await asyncState.execute(async () => 'data');
      expect(asyncState.isSuccess()).toBe(true);

      asyncState.reset();

      expect(asyncState.state()).toEqual({ status: 'idle' });
      expect(asyncState.isIdle()).toBe(true);
      expect(asyncState.data()).toBeNull();
    });

    it('should reset state to idle from error', async () => {
      await asyncState.execute(async () => {
        throw new Error('error');
      });
      expect(asyncState.isError()).toBe(true);

      asyncState.reset();

      expect(asyncState.state()).toEqual({ status: 'idle' });
      expect(asyncState.isIdle()).toBe(true);
      expect(asyncState.error()).toBeNull();
    });
  });

  describe('setData', () => {
    it('should directly set success state with data', () => {
      const testData = 'direct data';

      asyncState.setData(testData);

      expect(asyncState.state()).toEqual({ status: 'success', data: testData });
      expect(asyncState.isSuccess()).toBe(true);
      expect(asyncState.data()).toBe(testData);
    });

    it('should overwrite previous state', async () => {
      await asyncState.execute(async () => {
        throw new Error('error');
      });

      asyncState.setData('new data');

      expect(asyncState.isSuccess()).toBe(true);
      expect(asyncState.error()).toBeNull();
    });
  });

  describe('setError', () => {
    it('should directly set error state', () => {
      const errorMessage = 'direct error';

      asyncState.setError(errorMessage);

      expect(asyncState.state()).toEqual({ status: 'error', error: errorMessage });
      expect(asyncState.isError()).toBe(true);
      expect(asyncState.error()).toBe(errorMessage);
    });

    it('should overwrite previous state', async () => {
      await asyncState.execute(async () => 'data');

      asyncState.setError('new error');

      expect(asyncState.isError()).toBe(true);
      expect(asyncState.data()).toBeNull();
    });
  });

  describe('with complex data types', () => {
    it('should handle array data', async () => {
      const arrayState = new AsyncState<number[]>();
      const testData = [1, 2, 3, 4, 5];

      await arrayState.execute(async () => testData);

      expect(arrayState.data()).toEqual(testData);
    });

    it('should handle object data', async () => {
      interface User {
        id: string;
        name: string;
        email: string;
      }
      const userState = new AsyncState<User>();
      const testUser: User = { id: '1', name: 'John', email: 'john@example.com' };

      await userState.execute(async () => testUser);

      expect(userState.data()).toEqual(testUser);
    });

    it('should handle null data', async () => {
      const nullableState = new AsyncState<string | null>();

      await nullableState.execute(async () => null);

      expect(nullableState.isSuccess()).toBe(true);
      expect(nullableState.data()).toBeNull();
    });

    it('should handle undefined as success with null data', async () => {
      const undefinedState = new AsyncState<undefined>();

      await undefinedState.execute(async () => undefined);

      expect(undefinedState.isSuccess()).toBe(true);
    });
  });

  describe('multiple executions', () => {
    it('should allow multiple sequential executions', async () => {
      await asyncState.execute(async () => 'first');
      expect(asyncState.data()).toBe('first');

      await asyncState.execute(async () => 'second');
      expect(asyncState.data()).toBe('second');
    });

    it('should overwrite error with success on re-execution', async () => {
      await asyncState.execute(async () => {
        throw new Error('error');
      });
      expect(asyncState.isError()).toBe(true);

      await asyncState.execute(async () => 'success');
      expect(asyncState.isSuccess()).toBe(true);
      expect(asyncState.error()).toBeNull();
    });
  });
});

describe('createAsyncState', () => {
  it('should create a new AsyncState instance', () => {
    const state = createAsyncState<string>();

    expect(state).toBeInstanceOf(AsyncState);
    expect(state.isIdle()).toBe(true);
  });

  it('should create independent instances', () => {
    const state1 = createAsyncState<string>();
    const state2 = createAsyncState<string>();

    state1.setData('data1');

    expect(state1.data()).toBe('data1');
    expect(state2.data()).toBeNull();
  });
});
